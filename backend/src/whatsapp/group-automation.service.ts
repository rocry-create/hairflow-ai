import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from './evolution.service';

const CHECK_EVERY_MS = 60 * 1000;
const PAUSE_BETWEEN_MS = 8000;
const MAX_SENDS_PER_RUN = 10;
const RETRY_WINDOW_MS = 60 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fill(text: string, name?: string | null) {
  const first = String(name || '').trim().split(' ')[0] || 'amiga';
  return String(text || '').split('{nome}').join(first);
}

@Injectable()
export class GroupAutomationService implements OnModuleInit {
  private readonly logger = new Logger(GroupAutomationService.name);
  private running = false;

  constructor(private prisma: PrismaService, private evolution: EvolutionService) {}

  onModuleInit() {
    setTimeout(() => void this.run(), 30000);
    setInterval(() => void this.run(), CHECK_EVERY_MS);
  }

  async run() {
    if (this.running) return;
    this.running = true;
    try {
      await this.sync();
      await this.send();
    } catch (err) {
      this.logger.error('Falha na automacao de grupo: ' + (err as any)?.message);
    } finally {
      this.running = false;
    }
  }

  private async sync() {
    const cfg = await this.prisma.groupAutomation.findFirst();
    if (!cfg || !cfg.enabled || !cfg.groupId) return;
    const people = await this.evolution.getGroupParticipants(cfg.groupId);
    if (!people) return;

    const groupId = cfg.groupId;
    const rows = await this.prisma.groupMember.findMany({ where: { groupId } });
    const byPhone = new Map(rows.map((r) => [r.phone, r]));
    const now = new Date();

    if (!cfg.baselineDone) {
      for (const p of people) {
        await this.prisma.groupMember.upsert({
          where: { groupId_phone: { groupId, phone: p.phone } },
          create: { groupId, phone: p.phone, name: p.name, present: true },
          update: { present: true, name: p.name },
        });
      }
      await this.prisma.groupAutomation.update({ where: { id: cfg.id }, data: { baselineDone: true } });
      this.logger.log('Grupo lido pela primeira vez: ' + people.length + ' pessoas gravadas, nenhuma mensagem enviada.');
      return;
    }

    const due = (extraMin: number) => new Date(now.getTime() + extraMin * 60000);
    const seq = {
      welcomeDueAt: cfg.welcomeEnabled ? now : null,
      welcomeSentAt: null,
      offerDueAt: cfg.offerEnabled ? due(cfg.offerDelayMinutes) : null,
      offerSentAt: null,
      lastSequenceAt: now,
      joinedAt: now,
    };
    const seen = new Set<string>();

    for (const p of people) {
      seen.add(p.phone);
      const ex = byPhone.get(p.phone);
      if (!ex) {
        await this.prisma.groupMember.create({
          data: { groupId, phone: p.phone, name: p.name, present: true, ...seq },
        });
      } else if (!ex.present) {
        const hours = cfg.repeatAfterHours * 3600000;
        const ok = !ex.lastSequenceAt || now.getTime() - ex.lastSequenceAt.getTime() >= hours;
        await this.prisma.groupMember.update({
          where: { id: ex.id },
          data: ok ? { present: true, name: p.name, ...seq } : { present: true, name: p.name },
        });
      }
    }
    for (const r of rows) {
      if (r.present && !seen.has(r.phone)) {
        await this.prisma.groupMember.update({ where: { id: r.id }, data: { present: false } });
      }
    }
  }

  private async send() {
    const cfg = await this.prisma.groupAutomation.findFirst();
    if (!cfg || !cfg.enabled || !cfg.groupId || !cfg.baselineDone) return;
    const now = new Date();
    const since = new Date(now.getTime() - RETRY_WINDOW_MS);
    let sent = 0;

    if (cfg.welcomeEnabled) {
      const list = await this.prisma.groupMember.findMany({
        where: { groupId: cfg.groupId, present: true, welcomeSentAt: null, welcomeDueAt: { lte: now, gte: since } },
        orderBy: { welcomeDueAt: 'asc' },
        take: MAX_SENDS_PER_RUN,
      });
      for (const m of list) {
        const ok = await this.evolution.sendMessage(m.phone, fill(cfg.welcomeText, m.name));
        if (ok !== false) await this.prisma.groupMember.update({ where: { id: m.id }, data: { welcomeSentAt: new Date() } });
        else this.logger.warn('Boas-vindas nao enviada para ' + m.phone);
        sent++;
        await sleep(PAUSE_BETWEEN_MS);
      }
    }

    if (cfg.offerEnabled && sent < MAX_SENDS_PER_RUN) {
      const list = await this.prisma.groupMember.findMany({
        where: {
          groupId: cfg.groupId,
          present: true,
          offerSentAt: null,
          offerDueAt: { lte: now, gte: since },
          ...(cfg.welcomeEnabled ? { NOT: { welcomeSentAt: null } } : {}),
        },
        orderBy: { offerDueAt: 'asc' },
        take: MAX_SENDS_PER_RUN - sent,
      });
      for (const m of list) {
        const ok = await this.evolution.sendMessage(m.phone, fill(cfg.offerText, m.name));
        if (ok !== false) await this.prisma.groupMember.update({ where: { id: m.id }, data: { offerSentAt: new Date() } });
        else this.logger.warn('Oferta nao enviada para ' + m.phone);
        await sleep(PAUSE_BETWEEN_MS);
      }
    }
  }
}
