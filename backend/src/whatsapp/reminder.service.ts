import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from './evolution.service';

// ===== AJUSTES DOS LEMBRETES =====
const CHECK_EVERY_MS = 10 * 60 * 1000; // confere a cada 10 minutos
const REMIND_WITHIN_HOURS = 24; // avisa quando faltar ate 24 horas
const MIN_HOURS_BEFORE = 2; // nao avisa se faltar menos de 2 horas
const MIN_HOURS_SINCE_BOOKING = 4; // nao avisa quem acabou de marcar
const SEND_FROM_HOUR = 8; // nao envia antes das 8h
const SEND_UNTIL_HOUR = 20; // nem depois das 20h
const PAUSE_BETWEEN_MS = 8000; // pausa entre um lembrete e outro
const BR_OFFSET_HOURS = -3; // horario de Brasilia
// =================================

const WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

const CONFIRM = [
  'sim', 'confirmo', 'confirmado', 'confirmada', 'ok', 'certo', 'combinado',
  'tudo certo', 'pode ser', 'estarei la', 'vou sim', 'vou la', 'blz',
  'beleza', 'fechado', 'positivo',
];

const DECLINE = [
  'nao posso', 'nao vou', 'nao consigo', 'nao vai dar', 'nao poderei',
  'remarcar', 'cancelar', 'desmarcar', 'imprevisto', 'nao dou conta',
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function norm(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function brParts(d: Date) {
  const s = new Date(d.getTime() + BR_OFFSET_HOURS * 3600000);
  return {
    d: s.getUTCDate(),
    m: s.getUTCMonth() + 1,
    hh: s.getUTCHours(),
    mm: s.getUTCMinutes(),
    wd: s.getUTCDay(),
  };
}

function formatBr(d: Date) {
  const p = brParts(d);
  return WEEKDAYS[p.wd] + ', ' + pad(p.d) + '/' + pad(p.m) + ' às ' + pad(p.hh) + ':' + pad(p.mm);
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
export class ReminderService implements OnModuleInit {
  private readonly logger = new Logger(ReminderService.name);
  private busy = false;

  constructor(
    private prisma: PrismaService,
    private evolution: EvolutionService,
  ) {}

  onModuleInit() {
    setTimeout(() => void this.run(), 60000);
    setInterval(() => void this.run(), CHECK_EVERY_MS);
  }

  // Envia os lembretes que estao na hora
  private async run() {
    if (this.busy) return;
    this.busy = true;
    try {
      const hour = brParts(new Date()).hh;
      if (hour < SEND_FROM_HOUR || hour >= SEND_UNTIL_HOUR) return;

      const now = Date.now();
      const due = await this.prisma.appointment.findMany({
        where: {
          status: 'SCHEDULED',
          reminderSentAt: null,
          scheduledAt: {
            gt: new Date(now + MIN_HOURS_BEFORE * 3600000),
            lte: new Date(now + REMIND_WITHIN_HOURS * 3600000),
          },
          createdAt: { lte: new Date(now - MIN_HOURS_SINCE_BOOKING * 3600000) },
        },
        include: { client: true, service: true, professional: true },
        orderBy: { scheduledAt: 'asc' },
        take: 30,
      });

      for (const appt of due) {
        const text =
          'Oi, ' + firstName(appt.client.name) + '! 💕 Passando para lembrar do seu horário: ' +
          appt.service.name + ', ' + formatBr(appt.scheduledAt) + ', com ' + appt.professional.name +
          '. Você consegue confirmar para mim? É só responder SIM. Se precisar remarcar, me avise por aqui.';

        const ok = await this.evolution.sendMessage(normalizePhone(appt.client.phone), text);
        if (ok) {
          await this.prisma.appointment.update({
            where: { id: appt.id },
            data: { reminderSentAt: new Date() },
          });
          await this.logInConversation(appt.clientId, text);
        } else {
          this.logger.warn('Lembrete nao enviado para ' + appt.client.name);
        }
        await sleep(PAUSE_BETWEEN_MS);
      }
    } catch (e) {
      this.logger.error('Erro nos lembretes: ' + String(e));
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

  private classify(text: string): 'confirm' | 'decline' | null {
    const t = norm(text).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return null;
    const padded = ' ' + t + ' ';
    if (t === 'nao' || DECLINE.some((w) => padded.includes(' ' + w + ' '))) return 'decline';
    if (t.length <= 40 && CONFIRM.some((w) => padded.includes(' ' + w + ' '))) return 'confirm';
    return null;
  }

  // Se a cliente esta respondendo a um lembrete, trata aqui. Devolve o texto da resposta, ou null.
  async handleClientReply(clientId: string, conversationId: string, text: string): Promise<string | null> {
    try {
      const kind = this.classify(text);
      if (!kind) return null;

      const appt = await this.prisma.appointment.findFirst({
        where: {
          clientId,
          status: 'SCHEDULED',
          reminderSentAt: { not: null, gte: new Date(Date.now() - 36 * 3600000) },
          scheduledAt: { gt: new Date() },
        },
        orderBy: { scheduledAt: 'asc' },
        include: { client: true, service: true, professional: true },
      });
      if (!appt) return null;

      const first = firstName(appt.client.name);

      if (kind === 'confirm') {
        await this.prisma.appointment.update({
          where: { id: appt.id },
          data: { status: 'CONFIRMED' },
        });
        return (
          'Perfeito, ' + first + '! ✨ Seu horário está confirmado: ' + appt.service.name + ', ' +
          formatBr(appt.scheduledAt) + ', com ' + appt.professional.name + '. Te esperamos!'
        );
      }

      await this.prisma.appointment.update({
        where: { id: appt.id },
        data: {
          notes: (appt.notes ? appt.notes + ' | ' : '') + 'Cliente pediu para remarcar ou cancelar pelo WhatsApp',
        },
      });
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { aiEnabled: false },
      });
      return 'Sem problema, ' + first + '! Vou avisar a equipe para te ajudar a remarcar, tudo bem? 💕';
    } catch (e) {
      this.logger.error('Erro ao tratar resposta de lembrete: ' + String(e));
      return null;
    }
  }
}
