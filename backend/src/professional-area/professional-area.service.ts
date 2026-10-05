import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const BR_OFFSET_HOURS = -3; // horario de Brasilia

function startOfTodayBr() {
  const s = new Date(Date.now() + BR_OFFSET_HOURS * 3600000);
  return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()) - BR_OFFSET_HOURS * 3600000);
}

function monthRange(month?: string) {
  const now = new Date(Date.now() + BR_OFFSET_HOURS * 3600000);
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth() + 1;
  const match = /^(\d{4})-(\d{2})$/.exec(String(month || ''));
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) {
    y = Number(match[1]);
    m = Number(match[2]);
  }
  return {
    start: new Date(Date.UTC(y, m - 1, 1) - BR_OFFSET_HOURS * 3600000),
    end: new Date(Date.UTC(y, m, 1) - BR_OFFSET_HOURS * 3600000),
  };
}

function view(a: any) {
  return {
    id: a.id,
    scheduledAt: a.scheduledAt,
    status: a.status,
    durationMinutes: a.durationMinutes,
    clientId: a.clientId,
    clientName: a.client.name,
    serviceName: a.service.name,
  };
}

function text(value: any) {
  return typeof value === 'string' ? value.trim().slice(0, 2000) : undefined;
}

@Injectable()
export class ProfessionalAreaService {
  constructor(private prisma: PrismaService) {}

  private async professionalFor(userId: string) {
    const pro = await this.prisma.professional.findUnique({ where: { userId } });
    if (!pro || !pro.active) {
      throw new ForbiddenException('Seu acesso não está ligado a uma profissional ativa.');
    }
    return pro;
  }

  private async assertClient(professionalId: string, clientId: string) {
    const link = await this.prisma.appointment.findFirst({
      where: { clientId, professionalId },
      select: { id: true },
    });
    if (!link) {
      throw new ForbiddenException('Você só abre a ficha de clientes que você atendeu ou vai atender.');
    }
  }

  async me(userId: string) {
    const pro = await this.professionalFor(userId);
    return {
      id: pro.id,
      name: pro.name,
      commissionPercent: Number(pro.commissionPercent || 0),
      isMegaHairSpecialist: pro.isMegaHairSpecialist,
    };
  }

  async upcoming(userId: string) {
    const pro = await this.professionalFor(userId);
    const list = await this.prisma.appointment.findMany({
      where: {
        professionalId: pro.id,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: { gte: startOfTodayBr() },
      },
      include: { client: true, service: true },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });
    return list.map(view);
  }

  async toComplete(userId: string) {
    const pro = await this.professionalFor(userId);
    const now = Date.now();
    const list = await this.prisma.appointment.findMany({
      where: {
        professionalId: pro.id,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: { lt: new Date(now), gte: new Date(now - 30 * 86400000) },
      },
      include: { client: true, service: true },
      orderBy: { scheduledAt: 'desc' },
      take: 100,
    });
    return list.map(view);
  }

  async setStatus(userId: string, id: string, status: string) {
    const pro = await this.professionalFor(userId);
    if (status !== 'COMPLETED' && status !== 'NO_SHOW') {
      throw new BadRequestException('Status inválido.');
    }
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt || appt.professionalId !== pro.id) {
      throw new NotFoundException('Atendimento não encontrado.');
    }
    if (appt.status !== 'SCHEDULED' && appt.status !== 'CONFIRMED') {
      throw new BadRequestException('Esse atendimento já foi concluído ou cancelado.');
    }
    if (appt.scheduledAt.getTime() > Date.now() + 2 * 3600000) {
      throw new BadRequestException('Esse atendimento ainda não aconteceu.');
    }
    await this.prisma.appointment.update({ where: { id }, data: { status: status as any } });
    return { ok: true };
  }

  async commissions(userId: string, month?: string) {
    const pro = await this.professionalFor(userId);
    const { start, end } = monthRange(month);
    const list = await this.prisma.appointment.findMany({
      where: {
        professionalId: pro.id,
        status: 'COMPLETED',
        scheduledAt: { gte: start, lt: end },
      },
      include: { client: true, service: true },
      orderBy: { scheduledAt: 'asc' },
    });

    const percent = Number(pro.commissionPercent || 0);
    const items = list.map((a) => {
      const price = Number(a.price);
      return {
        id: a.id,
        scheduledAt: a.scheduledAt,
        clientName: a.client.name,
        serviceName: a.service.name,
        price,
        commission: Math.round(price * percent) / 100,
      };
    });
    const totalRevenue = items.reduce((sum, i) => sum + i.price, 0);
    const totalCommission = items.reduce((sum, i) => sum + i.commission, 0);

    return {
      percent,
      count: items.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      items,
    };
  }

  async hairRecord(userId: string, clientId: string) {
    const pro = await this.professionalFor(userId);
    await this.assertClient(pro.id, clientId);
    return this.prisma.hairRecord.findUnique({ where: { clientId } });
  }

  async saveHairRecord(userId: string, clientId: string, body: any) {
    const pro = await this.professionalFor(userId);
    await this.assertClient(pro.id, clientId);

    let lastChemicalAt: Date | undefined;
    if (body && body.lastChemicalAt) {
      lastChemicalAt = new Date(String(body.lastChemicalAt));
      if (Number.isNaN(lastChemicalAt.getTime())) {
        throw new BadRequestException('Data da última química inválida.');
      }
    }

    const data = {
      hairType: text(body?.hairType),
      chemicalHistory: text(body?.chemicalHistory),
      productsUsed: text(body?.productsUsed),
      colorFormula: text(body?.colorFormula),
      lastChemicalAt,
    };

    return this.prisma.hairRecord.upsert({
      where: { clientId },
      create: { clientId, ...data },
      update: data,
    });
  }
}
