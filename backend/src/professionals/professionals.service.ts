import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

@Injectable()
export class ProfessionalsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateProfessionalDto) {
    return this.prisma.professional.create({ data: dto });
  }

  findAll(onlyActive = true) {
    return this.prisma.professional.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
    });
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }
    return professional;
  }

  async update(id: string, dto: UpdateProfessionalDto) {
    await this.findOne(id);
    return this.prisma.professional.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.professional.update({
      where: { id },
      data: { active: false },
    });
  }

  async getAvailableSlots(professionalId: string, date: string, serviceDurationMinutes: number) {
    await this.findOne(professionalId);

    const dayStart = new Date(date + 'T09:00:00');
    const dayEnd = new Date(date + 'T19:00:00');

    const appointments = await this.prisma.appointment.findMany({
      where: {
        professionalId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const slots: { start: Date; end: Date }[] = [];
    let cursor = new Date(dayStart);

    while (cursor.getTime() + serviceDurationMinutes * 60000 <= dayEnd.getTime()) {
      const slotEnd = new Date(cursor.getTime() + serviceDurationMinutes * 60000);

      const conflicts = appointments.some((appt) => {
        const apptEnd = new Date(appt.scheduledAt.getTime() + appt.durationMinutes * 60000);
        return cursor < apptEnd && slotEnd > appt.scheduledAt;
      });

      if (!conflicts) {
        slots.push({ start: new Date(cursor), end: slotEnd });
      }

      cursor = new Date(cursor.getTime() + 30 * 60000);
    }

    return slots;
  }
}
