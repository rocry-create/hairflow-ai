import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const STAGES = [
  'NOVO_CONTATO',
  'PEDIU_ORCAMENTO',
  'AVALIACAO_MARCADA',
  'COMPARECEU',
  'FECHOU_SERVICO',
  'POS_VENDA',
];

function norm(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
  return digits;
}

@Injectable()
export class FunnelService {
  constructor(private prisma: PrismaService) {}

  async board() {
    try {
      await this.syncStages();
    } catch (e) {
      // se a sincronizacao falhar, o funil abre normalmente
    }

    const conversations = await this.prisma.conversation.findMany({
      include: {
        client: {
          include: {
            appointments: {
              where: {
                status: { in: ['SCHEDULED', 'CONFIRMED'] },
                scheduledAt: { gte: new Date() },
              },
              orderBy: { scheduledAt: 'asc' },
              take: 1,
              include: { service: true, professional: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const services = await this.prisma.service.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    const professionals = await this.prisma.professional.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    const serviceById = new Map(services.map((s) => [s.id, s]));

    return {
      cards: conversations.map((c) => {
        const next = c.client.appointments[0];
        const interest = c.interestServiceId ? serviceById.get(c.interestServiceId) : undefined;
        return {
          id: c.id,
          stage: c.stage,
          client: { id: c.client.id, name: c.client.name, phone: c.client.phone },
          interestServiceId: c.interestServiceId,
          interestServiceName: interest ? interest.name : null,
          nextAppointment: next
            ? {
                id: next.id,
                scheduledAt: next.scheduledAt,
                serviceName: next.service.name,
                professionalName: next.professional.name,
              }
            : null,
        };
      }),
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        requiresEvaluation: s.requiresEvaluation,
        isMegaHair: s.isMegaHair,
      })),
      professionals: professionals.map((p) => ({
        id: p.id,
        name: p.name,
        isMegaHairSpecialist: p.isMegaHairSpecialist,
      })),
    };
  }

  // Move o cartao sozinho quando um atendimento e marcado como Concluido
  async syncStages() {
    const since = new Date(Date.now() - 14 * 86400000);
    const done = await this.prisma.appointment.findMany({
      where: { status: 'COMPLETED', scheduledAt: { gte: since } },
      include: { service: true },
      orderBy: { scheduledAt: 'asc' },
    });

    const latest = new Map<string, (typeof done)[number]>();
    for (const appt of done) latest.set(appt.clientId, appt);

    for (const [clientId, appt] of Array.from(latest.entries())) {
      const conversation = await this.prisma.conversation.findUnique({ where: { clientId } });
      if (!conversation || conversation.autoStageAppointmentId === appt.id) continue;

      const target = norm(appt.service.name).includes('avalia') ? 'COMPARECEU' : 'POS_VENDA';
      const advance = STAGES.indexOf(conversation.stage) < STAGES.indexOf(target);

      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: advance
          ? { stage: target as any, autoStageAppointmentId: appt.id }
          : { autoStageAppointmentId: appt.id },
      });
    }
  }

  async createCard(body: any) {
    const name = String(body?.name || '').trim();
    const phone = normalizePhone(String(body?.phone || ''));
    const stage = STAGES.includes(body?.stage) ? body.stage : 'NOVO_CONTATO';
    const serviceId = body?.serviceId ? String(body.serviceId) : null;

    if (!name) throw new BadRequestException('Escreva o nome da cliente.');
    if (phone.length < 12) {
      throw new BadRequestException('Escreva o WhatsApp com DDD. Exemplo: 17999998888.');
    }
    if (serviceId) {
      const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
      if (!service) throw new BadRequestException('Serviço inválido.');
    }

    let client = await this.prisma.client.findUnique({ where: { phone } });
    if (!client) {
      client = await this.prisma.client.create({ data: { name, phone } });
    } else if (client.name === 'Cliente') {
      client = await this.prisma.client.update({ where: { id: client.id }, data: { name } });
    }

    const existing = await this.prisma.conversation.findUnique({
      where: { clientId: client.id },
    });
    if (existing) {
      await this.prisma.conversation.update({
        where: { id: existing.id },
        data: {
          stage: stage as any,
          interestServiceId: serviceId ?? existing.interestServiceId,
        },
      });
    } else {
      await this.prisma.conversation.create({
        data: { clientId: client.id, stage: stage as any, interestServiceId: serviceId },
      });
    }
    return { ok: true };
  }

  async updateCard(id: string, body: any) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conversation) throw new NotFoundException('Cartão não encontrado.');

    const data: any = {};

    if (body?.stage !== undefined) {
      if (!STAGES.includes(body.stage)) throw new BadRequestException('Etapa inválida.');
      data.stage = body.stage;
    }

    if (body?.serviceId !== undefined) {
      if (body.serviceId) {
        const service = await this.prisma.service.findUnique({
          where: { id: String(body.serviceId) },
        });
        if (!service) throw new BadRequestException('Serviço inválido.');
        data.interestServiceId = service.id;
      } else {
        data.interestServiceId = null;
      }
    }

    await this.prisma.conversation.update({ where: { id }, data });
    return { ok: true };
  }

  async schedule(id: string, body: any) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conversation) throw new NotFoundException('Cartão não encontrado.');

    const serviceId = String(body?.serviceId || '');
    const professionalId = String(body?.professionalId || '');
    const scheduledAt = new Date(String(body?.scheduledAt || ''));

    if (!serviceId) throw new BadRequestException('Escolha o serviço.');
    if (!professionalId) throw new BadRequestException('Escolha a profissional.');
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Escolha o dia e o horário.');
    }

    const [service, professional] = await Promise.all([
      this.prisma.service.findUnique({ where: { id: serviceId } }),
      this.prisma.professional.findUnique({ where: { id: professionalId } }),
    ]);
    if (!service) throw new BadRequestException('Serviço inválido.');
    if (!professional) throw new BadRequestException('Profissional inválida.');
    if (service.isMegaHair && !professional.isMegaHairSpecialist) {
      throw new BadRequestException('Este serviço de mega hair só pode ser feito por uma mega hairista.');
    }

    const end = new Date(scheduledAt.getTime() + service.durationMinutes * 60000);
    const nearby = await this.prisma.appointment.findMany({
      where: {
        professionalId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: { gte: new Date(scheduledAt.getTime() - 24 * 3600000), lt: end },
      },
    });
    const conflict = nearby.some(
      (a) =>
        scheduledAt < new Date(a.scheduledAt.getTime() + a.durationMinutes * 60000) &&
        end > a.scheduledAt,
    );
    if (conflict) {
      throw new BadRequestException('Essa profissional já tem um horário marcado nesse momento.');
    }

    await this.prisma.appointment.create({
      data: {
        clientId: conversation.clientId,
        professionalId,
        serviceId,
        scheduledAt,
        durationMinutes: service.durationMinutes,
        price: service.price,
        status: 'SCHEDULED',
        notes: 'Agendado pelo funil',
      },
    });

    const isEvaluation = norm(service.name).includes('avalia');
    await this.prisma.conversation.update({
      where: { id },
      data: {
        stage: (isEvaluation ? 'AVALIACAO_MARCADA' : 'FECHOU_SERVICO') as any,
        interestServiceId: conversation.interestServiceId ?? (isEvaluation ? null : serviceId),
      },
    });

    return { ok: true };
  }
}
