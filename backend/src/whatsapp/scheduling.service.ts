import { Injectable, Logger } from '@nestjs/common';
import { Service } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// ===== AJUSTE AQUI O FUNCIONAMENTO DO SALAO =====
const OPEN_HOUR = 9;
const CLOSE_HOUR = 19;
const OPEN_WEEKDAYS = [1, 2, 3, 4, 5, 6]; // 0=domingo, 1=segunda ... 6=sabado
const SLOT_MINUTES = 30;
const MIN_NOTICE_MINUTES = 60;
const MAX_DAYS_AHEAD = 60;
const BR_OFFSET_HOURS = -3; // horario de Brasilia
// =================================================

const WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

const MARKER = /\[\[\s*AGENDAR\s*\|([^|\]]+)\|(\d{4})-(\d{2})-(\d{2})\|(\d{1,2}):(\d{2})\s*\]\]/i;
const HANDOFF = 'Obrigada! Vou pedir para a equipe confirmar esse horário com você, tudo bem?';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function norm(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function brParts(d: Date) {
  const s = new Date(d.getTime() + BR_OFFSET_HOURS * 3600000);
  return {
    y: s.getUTCFullYear(),
    m: s.getUTCMonth() + 1,
    d: s.getUTCDate(),
    hh: s.getUTCHours(),
    mm: s.getUTCMinutes(),
    wd: s.getUTCDay(),
  };
}

function fromBr(y: number, m: number, d: number, hh: number, mm: number) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - BR_OFFSET_HOURS * 3600000);
}

function formatBr(d: Date) {
  const p = brParts(d);
  return WEEKDAYS[p.wd] + ', ' + pad(p.d) + '/' + pad(p.m) + ' às ' + pad(p.hh) + ':' + pad(p.mm);
}

type Busy = { professionalId: string; scheduledAt: Date; durationMinutes: number };

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(private prisma: PrismaService) {}

  // Texto extra que explica para a IA como agendar
  promptBlock(): string {
    const now = brParts(new Date());
    const days = OPEN_WEEKDAYS.map((d) => WEEKDAYS[d]).join(', ');
    return (
      '\n\nAGENDAMENTO:\n' +
      '- Hoje e ' + WEEKDAYS[now.wd] + ', ' + pad(now.d) + '/' + pad(now.m) + '/' + now.y +
      ', e agora sao ' + pad(now.hh) + ':' + pad(now.mm) + ' (horario de Brasilia).\n' +
      '- O salao atende ' + days + ', das ' + OPEN_HOUR + 'h as ' + CLOSE_HOUR + 'h.\n' +
      '- Voce mesma pode agendar. Para isso precisa ter: o servico (nome exatamente como esta na lista), o dia e o horario que a cliente quer. Pergunte o que faltar, uma coisa de cada vez.\n' +
      '- Servicos que exigem avaliacao: agende a Avaliacao correspondente (se existir na lista), nunca o servico final.\n' +
      '- Quando a cliente confirmar claramente o dia e o horario, termine sua resposta com esta linha, neste formato exato, e nada depois dela:\n' +
      '[[AGENDAR|Nome do servico|AAAA-MM-DD|HH:MM]]\n' +
      '- Exemplo: [[AGENDAR|Corte feminino|2026-10-08|14:00]]\n' +
      '- So escreva essa linha quando a cliente ja tiver escolhido dia e horario. O sistema confere a agenda e confirma por voce. Nunca diga que o horario esta confirmado antes disso.\n' +
      '- Se a cliente pedir algo que voce nao consegue fazer, diga que a equipe vai ajudar.'
    );
  }

  // Se a resposta da IA tiver o pedido de agendamento, o sistema cuida dele
  async handleReply(reply: string, clientId: string, conversationId: string): Promise<string> {
    const match = reply.match(MARKER);
    if (!match) {
      if (reply.includes('[[')) return HANDOFF;
      return reply;
    }
    try {
      return await this.book(match, clientId, conversationId);
    } catch (e) {
      this.logger.error('Erro ao agendar pela IA: ' + String(e));
      return HANDOFF;
    }
  }

  private findService(services: Service[], rawName: string): Service | undefined {
    const wanted = norm(rawName);
    return (
      services.find((s) => norm(s.name) === wanted) ||
      services.find((s) => norm(s.name).includes(wanted) || wanted.includes(norm(s.name)))
    );
  }

  private async loadBusy(ids: string[], from: Date, to: Date): Promise<Busy[]> {
    return this.prisma.appointment.findMany({
      where: {
        professionalId: { in: ids },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: { gte: new Date(from.getTime() - 24 * 3600000), lt: to },
      },
      select: { professionalId: true, scheduledAt: true, durationMinutes: true },
    });
  }

  private isFree(busy: Busy[], professionalId: string, start: Date, minutes: number) {
    const s = start.getTime();
    const e = s + minutes * 60000;
    return !busy.some(
      (b) =>
        b.professionalId === professionalId &&
        s < b.scheduledAt.getTime() + b.durationMinutes * 60000 &&
        e > b.scheduledAt.getTime(),
    );
  }

  private async nextFreeSlots(ids: string[], minutes: number, after: Date, count: number) {
    const earliest = Date.now() + MIN_NOTICE_MINUTES * 60000;
    const busy = await this.loadBusy(ids, after, new Date(after.getTime() + 15 * 86400000));
    const p = brParts(after);
    const out: Date[] = [];

    for (let i = 0; i <= 14 && out.length < count; i++) {
      const dayRef = fromBr(p.y, p.m, p.d + i, 12, 0);
      const dp = brParts(dayRef);
      if (!OPEN_WEEKDAYS.includes(dp.wd)) continue;

      for (
        let min = OPEN_HOUR * 60;
        min + minutes <= CLOSE_HOUR * 60 && out.length < count;
        min += SLOT_MINUTES
      ) {
        const slot = fromBr(dp.y, dp.m, dp.d, Math.floor(min / 60), min % 60);
        if (slot.getTime() < earliest || slot.getTime() <= after.getTime()) continue;
        if (ids.some((id) => this.isFree(busy, id, slot, minutes))) out.push(slot);
      }
    }
    return out;
  }

  private confirmation(first: string, serviceName: string, when: Date, professional: string) {
    const what = norm(serviceName).includes('avalia') ? 'sua ' + serviceName.toLowerCase() : serviceName;
    return (
      'Pronto' + (first ? ', ' + first : '') + '! 💕 Agendei ' + what + ' para ' +
      formatBr(when) + ' com ' + professional +
      '. Se precisar remarcar, é só me avisar por aqui.'
    );
  }

  private async book(match: RegExpMatchArray, clientId: string, conversationId: string) {
    const [, rawName, y, m, d, hh, mm] = match;
    const when = fromBr(Number(y), Number(m), Number(d), Number(hh), Number(mm));
    if (Number.isNaN(when.getTime())) return HANDOFF;

    const services = await this.prisma.service.findMany({ where: { active: true } });
    const found = this.findService(services, rawName);
    if (!found) return HANDOFF;

    let service: Service = found;
    if (found.requiresEvaluation) {
      const evaluations = services.filter(
        (s) => !s.requiresEvaluation && norm(s.name).includes('avalia'),
      );
      const evaluation =
        evaluations.find((s) => s.isMegaHair === found.isMegaHair) || evaluations[0];
      if (!evaluation) return HANDOFF;
      service = evaluation;
    }

    const professionals = await this.prisma.professional.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
    const candidates = professionals.filter(
      (p) => !service.isMegaHair || p.isMegaHairSpecialist,
    );
    if (candidates.length === 0) return HANDOFF;
    const ids = candidates.map((p) => p.id);

    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    const first = (client?.name || '').trim().split(' ')[0] || '';

    const minutes = service.durationMinutes;
    const now = Date.now();
    const p = brParts(when);
    const startMin = p.hh * 60 + p.mm;
    const validTime =
      when.getTime() >= now + MIN_NOTICE_MINUTES * 60000 &&
      when.getTime() <= now + MAX_DAYS_AHEAD * 86400000 &&
      OPEN_WEEKDAYS.includes(p.wd) &&
      startMin >= OPEN_HOUR * 60 &&
      startMin + minutes <= CLOSE_HOUR * 60;

    if (validTime) {
      const existing = await this.prisma.appointment.findFirst({
        where: {
          clientId,
          serviceId: service.id,
          scheduledAt: when,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        include: { professional: true },
      });
      if (existing) {
        return this.confirmation(first, service.name, when, existing.professional.name);
      }

      const busy = await this.loadBusy(ids, when, new Date(when.getTime() + minutes * 60000));
      const free = candidates.find((c) => this.isFree(busy, c.id, when, minutes));

      if (free) {
        await this.prisma.appointment.create({
          data: {
            clientId,
            professionalId: free.id,
            serviceId: service.id,
            scheduledAt: when,
            durationMinutes: minutes,
            price: service.price,
            status: 'SCHEDULED',
            notes: 'Agendado pela IA pelo WhatsApp',
          },
        });

        if (norm(service.name).includes('avalia')) {
          try {
            await this.prisma.conversation.update({
              where: { id: conversationId },
              data: { stage: 'AVALIACAO_MARCADA' },
            });
          } catch (e) {
            this.logger.warn('Nao foi possivel atualizar a etapa: ' + String(e));
          }
        }

        return this.confirmation(first, service.name, when, free.name);
      }
    }

    const after = new Date(Math.max(when.getTime(), now));
    const slots = await this.nextFreeSlots(ids, minutes, after, 3);
    if (slots.length === 0) return HANDOFF;

    return (
      'Nesse horário não consigo agendar. Tenho estas opções: ' +
      slots.map(formatBr).join(', ou ') +
      '. Qual você prefere?'
    );
  }
}
