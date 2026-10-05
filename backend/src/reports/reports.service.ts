import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const BR_OFFSET_HOURS = -3; // horario de Brasilia
const DAY = 86400000;

const SYSTEM_PROMPT =
  'Voce analisa o desempenho de um salao de beleza e escreve para a dona do salao, que nao e tecnica. ' +
  'Com base SOMENTE nos numeros recebidos, escreva em portugues do Brasil, em linguagem simples e acolhedora, ' +
  'um resumo curto com no maximo 6 frases: o que esta indo bem, o que merece atencao e 2 acoes praticas para a proxima semana. ' +
  'Nao invente numeros que nao foram informados. Nao use listas, tabelas nem simbolos. Escreva em texto corrido.';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function brToday() {
  const s = new Date(Date.now() + BR_OFFSET_HOURS * 3600000);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth() + 1, d: s.getUTCDate() };
}

function dayStart(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d) - BR_OFFSET_HOURS * 3600000);
}

function parseDay(value: any) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function isoDay(date: Date) {
  const s = new Date(date.getTime() + BR_OFFSET_HOURS * 3600000);
  return s.getUTCFullYear() + '-' + pad(s.getUTCMonth() + 1) + '-' + pad(s.getUTCDate());
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 1000) / 10 : 0;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private range(from?: string, to?: string) {
    const endDay = parseDay(to) || brToday();
    const end = new Date(dayStart(endDay.y, endDay.m, endDay.d).getTime() + DAY);
    const startDay = parseDay(from);
    const start = startDay
      ? dayStart(startDay.y, startDay.m, startDay.d)
      : new Date(end.getTime() - 30 * DAY);
    if (start.getTime() >= end.getTime()) {
      throw new BadRequestException('A data inicial precisa ser antes da data final.');
    }
    if (end.getTime() - start.getTime() > 366 * DAY) {
      throw new BadRequestException('Escolha um período de no máximo 1 ano.');
    }
    return { start, end };
  }

  async compute(from?: string, to?: string) {
    const { start, end } = this.range(from, to);
    const inRange = { gte: start, lt: end };

    const appointments = await this.prisma.appointment.findMany({
      where: { scheduledAt: inRange },
      include: { service: true, professional: true },
    });
    const createdAppointments = await this.prisma.appointment.findMany({
      where: { createdAt: inRange },
      select: { clientId: true, notes: true },
    });
    const activeConversations = await this.prisma.conversation.findMany({
      where: { messages: { some: { createdAt: inRange, role: 'CLIENT' } } },
      select: { clientId: true },
    });
    const clientMessages = await this.prisma.message.count({
      where: { createdAt: inRange, role: 'CLIENT' },
    });
    const aiMessages = await this.prisma.message.count({
      where: { createdAt: inRange, role: 'AI' },
    });
    const humanMessages = await this.prisma.message.count({
      where: { createdAt: inRange, role: 'HUMAN' },
    });
    const newClients = await this.prisma.client.count({ where: { createdAt: inRange } });
    const remindersSent = await this.prisma.appointment.count({
      where: { reminderSentAt: inRange },
    });
    const maintenanceSent = await this.prisma.appointment.count({
      where: { maintenanceReminderSentAt: inRange },
    });
    const campaigns = await this.prisma.campaign.findMany({
      where: { createdAt: inRange },
      select: { sentCount: true },
    });
    const doneAll = await this.prisma.appointment.findMany({
      where: { status: 'COMPLETED' },
      select: { clientId: true, scheduledAt: true },
    });

    const countStatus = (s: string) => appointments.filter((a) => a.status === s).length;
    const completed = appointments.filter((a) => a.status === 'COMPLETED');
    const noShow = countStatus('NO_SHOW');

    const revenue = completed.reduce((sum, a) => sum + Number(a.price), 0);
    const commissions = completed.reduce(
      (sum, a) => sum + (Number(a.price) * Number(a.professional.commissionPercent || 0)) / 100,
      0,
    );

    const byService = new Map<string, { name: string; count: number; revenue: number }>();
    const byPro = new Map<string, { name: string; count: number; revenue: number; commission: number }>();
    for (const a of completed) {
      const price = Number(a.price);
      const s = byService.get(a.serviceId) || { name: a.service.name, count: 0, revenue: 0 };
      s.count++;
      s.revenue += price;
      byService.set(a.serviceId, s);

      const p = byPro.get(a.professionalId) || {
        name: a.professional.name,
        count: 0,
        revenue: 0,
        commission: 0,
      };
      p.count++;
      p.revenue += price;
      p.commission += (price * Number(a.professional.commissionPercent || 0)) / 100;
      byPro.set(a.professionalId, p);
    }

    const activeIds = new Set(activeConversations.map((c) => c.clientId));
    const bookedIds = new Set(
      createdAppointments.filter((a) => activeIds.has(a.clientId)).map((a) => a.clientId),
    );

    const lastDone = new Map<string, number>();
    for (const a of doneAll) {
      const t = a.scheduledAt.getTime();
      if (t > (lastDone.get(a.clientId) || 0)) lastDone.set(a.clientId, t);
    }
    const inactive60 = Array.from(lastDone.values()).filter((t) => t < Date.now() - 60 * DAY).length;

    return {
      period: { from: isoDay(start), to: isoDay(new Date(end.getTime() - 1)) },
      contacts: {
        newClients,
        activeConversations: activeIds.size,
        bookedFromConversations: bookedIds.size,
        conversionRate: pct(bookedIds.size, activeIds.size),
        clientMessages,
        aiMessages,
        humanMessages,
      },
      bookings: {
        createdTotal: createdAppointments.length,
        byAi: createdAppointments.filter((a) => (a.notes || '').startsWith('Agendado pela IA')).length,
        byFunnel: createdAppointments.filter((a) => (a.notes || '').startsWith('Agendado pelo funil')).length,
        remindersSent,
        maintenanceSent,
        campaignMessages: campaigns.reduce((sum, c) => sum + c.sentCount, 0),
      },
      agenda: {
        total: appointments.length,
        completed: completed.length,
        confirmed: countStatus('CONFIRMED'),
        scheduled: countStatus('SCHEDULED'),
        cancelled: countStatus('CANCELLED'),
        noShow,
        noShowRate: pct(noShow, completed.length + noShow),
      },
      money: {
        revenue: money(revenue),
        avgTicket: completed.length > 0 ? money(revenue / completed.length) : 0,
        commissions: money(commissions),
        netEstimate: money(revenue - commissions),
      },
      topServices: Array.from(byService.values())
        .sort((x, y) => y.revenue - x.revenue)
        .slice(0, 5)
        .map((s) => ({ name: s.name, count: s.count, revenue: money(s.revenue) })),
      byProfessional: Array.from(byPro.values())
        .sort((x, y) => y.revenue - x.revenue)
        .map((p) => ({
          name: p.name,
          count: p.count,
          revenue: money(p.revenue),
          commission: money(p.commission),
        })),
      opportunities: { inactive60 },
    };
  }

  async summary(from?: string, to?: string) {
    const data = await this.compute(from, to);
    const key = this.config.get<string>('GOOGLE_API_KEY');
    if (key) {
      const text = await this.askGemini(key, data);
      if (text) return { text, source: 'ai' };
    }
    return { text: this.fallback(data), source: 'basic' };
  }

  private async askGemini(key: string, data: any): Promise<string | null> {
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' + key;
    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Numeros do periodo, em JSON:\n' + JSON.stringify(data) }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.4,
        thinkingConfig: { thinkingLevel: 'low' },
      },
    };

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          this.logger.error('Erro da IA no resumo do relatorio: ' + res.status);
          if ((res.status === 503 || res.status === 429) && attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }
          return null;
        }
        const json: any = await res.json();
        const parts: any[] = json?.candidates?.[0]?.content?.parts || [];
        const text = parts
          .filter((p) => !p.thought)
          .map((p) => p.text || '')
          .join('')
          .trim();
        return text || null;
      } catch (e) {
        this.logger.error('Falha ao pedir o resumo da IA: ' + String(e));
        if (attempt >= 2) return null;
      }
    }
    return null;
  }

  private fallback(d: any) {
    const lines: string[] = [];
    lines.push(
      'No período, o salão faturou R$ ' +
        d.money.revenue.toFixed(2).replace('.', ',') +
        ' com ' +
        d.agenda.completed +
        ' atendimentos concluídos.',
    );
    if (d.agenda.noShow > 0) {
      lines.push(
        'Houve ' + d.agenda.noShow + ' faltas (' + d.agenda.noShowRate + '%). Os lembretes automáticos ajudam a reduzir isso.',
      );
    }
    if (d.opportunities.inactive60 > 0) {
      lines.push(
        d.opportunities.inactive60 + ' clientes não voltam há mais de 60 dias. Vale uma campanha de recuperação.',
      );
    }
    return lines.join(' ');
  }
}
