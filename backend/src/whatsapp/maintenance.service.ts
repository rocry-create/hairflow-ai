import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from './evolution.service';

// ===== AJUSTES DO AVISO DE MANUTENCAO =====
const MAINTENANCE_DAYS = 45; // avisa quando passar esse tanto de dias do ultimo mega hair
const STOP_AFTER_DAYS = 120; // depois disso nao avisa mais (use Campanhas)
const MAX_PER_DAY = 15; // limite de avisos por dia
const CHECK_EVERY_MS = 60 * 60 * 1000; // confere a cada 1 hora
const SEND_FROM_HOUR = 9; // nao envia antes das 9h
const SEND_UNTIL_HOUR = 19; // nem depois das 19h
const MIN_PAUSE_MS = 20000; // pausa minima entre mensagens
const MAX_PAUSE_MS = 45000; // pausa maxima entre mensagens
const BR_OFFSET_HOURS = -3; // horario de Brasilia
// ==========================================

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function norm(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function brHour(d: Date) {
  return new Date(d.getTime() + BR_OFFSET_HOURS * 3600000).getUTCHours();
}

function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
  return digits;
}

function firstName(name: string) {
  return (name || '').trim().split(' ')[0] || '';
}

@Injectable()
export class MaintenanceService implements OnModuleInit {
  private readonly logger = new Logger(MaintenanceService.name);
  private busy = false;

  constructor(
    private prisma: PrismaService,
    private evolution: EvolutionService,
  ) {}

  onModuleInit() {
    setTimeout(() => void this.run(), 120000);
    setInterval(() => void this.run(), CHECK_EVERY_MS);
  }

  private async run() {
    if (this.busy) return;
    this.busy = true;
    try {
      const now = Date.now();
      const hour = brHour(new Date(now));
      if (hour < SEND_FROM_HOUR || hour >= SEND_UNTIL_HOUR) return;

      const sentToday = await this.prisma.appointment.count({
        where: { maintenanceReminderSentAt: { gte: new Date(now - 24 * 3600000) } },
      });
      let remaining = MAX_PER_DAY - sentToday;
      if (remaining <= 0) return;

      const done = await this.prisma.appointment.findMany({
        where: {
          status: 'COMPLETED',
          service: { isMegaHair: true },
          scheduledAt: {
            gte: new Date(now - STOP_AFTER_DAYS * 86400000),
            lte: new Date(now),
          },
        },
        include: { client: true, service: true },
        orderBy: { scheduledAt: 'desc' },
      });

      const latest = new Map<string, (typeof done)[number]>();
      for (const appt of done) {
        if (norm(appt.service.name).includes('avalia')) continue;
        if (!latest.has(appt.clientId)) latest.set(appt.clientId, appt);
      }

      const candidates = Array.from(latest.values()).filter(
        (a) =>
          a.maintenanceReminderSentAt == null &&
          a.scheduledAt.getTime() <= now - MAINTENANCE_DAYS * 86400000,
      );
      if (candidates.length === 0) return;

      const upcoming = await this.prisma.appointment.findMany({
        where: {
          clientId: { in: candidates.map((c) => c.clientId) },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          scheduledAt: { gt: new Date(now) },
          service: { isMegaHair: true },
        },
        select: { clientId: true },
      });
      const alreadyBooked = new Set(upcoming.map((u) => u.clientId));

      for (const appt of candidates) {
        if (remaining <= 0) break;
        if (alreadyBooked.has(appt.clientId)) continue;

        const days = Math.floor((now - appt.scheduledAt.getTime()) / 86400000);
        const weeks = Math.floor(days / 7);
        const text =
          'Oi, ' + firstName(appt.client.name) + '! 💕 Já faz cerca de ' + weeks +
          ' semanas desde a sua última manutenção do mega hair. Quer que eu veja um horário para você?';

        const ok = await this.evolution.sendMessage(normalizePhone(appt.client.phone), text);
        if (ok) {
          await this.prisma.appointment.update({
            where: { id: appt.id },
            data: { maintenanceReminderSentAt: new Date() },
          });
          await this.logInConversation(appt.clientId, text);
          remaining--;
        } else {
          this.logger.warn('Aviso de manutencao nao enviado para ' + appt.client.name);
        }
        await sleep(MIN_PAUSE_MS + Math.random() * (MAX_PAUSE_MS - MIN_PAUSE_MS));
      }
    } catch (e) {
      this.logger.error('Erro no aviso de manutencao: ' + String(e));
    } finally {
      this.busy = false;
    }
  }

  private async logInConversation(clientId: string, text: string) {
    try {
      const conversation = await this.prisma.conversation.upsert({
        where: { clientId },
        update: {},
        create: { clientId },
      });
      await this.prisma.message.create({
        data: { conversationId: conversation.id, role: 'AI', content: text },
      });
    } catch (e) {
      this.logger.warn('Nao foi possivel registrar na conversa: ' + String(e));
    }
  }
}
