import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  private async assertProfessionalCanDoService(professionalId: string, serviceId: string) {
    const [professional, service] = await Promise.all([
      this.prisma.professional.findUnique({ where: { id: professionalId } }),
      this.prisma.service.findUnique({ where: { id: serviceId } }),
    ]);

    if (!professional) {
      throw new BadRequestException('Profissional inválido');
    }
    if (!service) {
      throw new BadRequestException('Serviço inválido');
    }
    if (service.isMegaHair && !professional.isMegaHairSpecialist) {
      throw new BadRequestException(
        'Este serviço de mega hair só pode ser feito por uma mega hairista',
      );
    }

    return service;
  }

  async create(dto: CreateAppointmentDto) {
    const service = await this.assertProfessionalCanDoService(dto.professionalId, dto.serviceId);

    const scheduledAt = new Date(dto.scheduledAt);
    await this.assertNoConflict(dto.professionalId, scheduledAt, service.durationMinutes);

    return this.prisma.appointment.create({
      data: {
        clientId: dto.clientId,
        professionalId: dto.professionalId,
        serviceId: dto.serviceId,
        scheduledAt,
        durationMinutes: service.durationMinutes,
        price: service.price,
        notes: dto.notes,
      },
      include: { client: true, professional: true, service: true },
    });
  }

  findAll(params: { from?: string; to?: string; professionalId?: string }) {
    return this.prisma.appointment.findMany({
      where: {
        professionalId: params.professionalId,
        scheduledAt: {
          gte: params.from ? new Date(params.from) : undefined,
          lte: params.to ? new Date(params.to) : undefined,
        },
      },
      include: { client: true, professional: true, service: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { client: true, professional: true, service: true },
    });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    const current = await this.findOne(id);

    let durationMinutes = current.durationMinutes;
    let price = current.price;

    const professionalId = dto.professionalId ?? current.professionalId;
    const serviceId = dto.serviceId ?? current.serviceId;

    if (dto.serviceId || dto.professionalId) {
      const service = await this.assertProfessionalCanDoService(professionalId, serviceId);
      durationMinutes = service.durationMinutes;
      price = service.price;
    }

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : current.scheduledAt;

    if (dto.scheduledAt || dto.professionalId || dto.serviceId) {
      await this.assertNoConflict(professionalId, scheduledAt, durationMinutes, id);
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        clientId: dto.clientId,
        professionalId: dto.professionalId,
        serviceId: dto.serviceId,
        scheduledAt,
        durationMinutes,
        price,
        status: dto.status,
        notes: dto.notes,
      },
      include: { client: true, professional: true, service: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  private async assertNoConflict(
    professionalId: string,
    scheduledAt: Date,
    durationMinutes: number,
    ignoreAppointmentId?: string,
  ) {
    const end = new Date(scheduledAt.getTime() + durationMinutes * 60000);

    const overlapping = await this.prisma.appointment.findMany({
      where: {
        professionalId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        id: ignoreAppointmentId ? { not: ignoreAppointmentId } : undefined,
      },
    });

    const conflict = overlapping.find((appt) => {
      const apptEnd = new Date(appt.scheduledAt.getTime() + appt.durationMinutes * 60000);
      return scheduledAt < apptEnd && end > appt.scheduledAt;
    });

    if (conflict) {
      throw new BadRequestException('Este profissional já possui um agendamento nesse horário');
    }
  }
}
