import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateClientDto) {
    const existing = await this.prisma.client.findUnique({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException('Já existe um cliente cadastrado com este telefone');
    }

    return this.prisma.client.create({
      data: {
        ...dto,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      },
    });
  }

  findAll(search?: string) {
    return this.prisma.client.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        hairRecord: true,
        appointments: {
          orderBy: { scheduledAt: 'desc' },
          take: 10,
          include: { service: true, professional: true },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findOne(id);

    return this.prisma.client.update({
      where: { id },
      data: {
        ...dto,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findUnique({ where: { clientId: id } });
      if (conversation) {
        await tx.message.deleteMany({ where: { conversationId: conversation.id } });
        await tx.conversation.delete({ where: { id: conversation.id } });
      }
      await tx.appointment.deleteMany({ where: { clientId: id } });
      await tx.hairRecord.deleteMany({ where: { clientId: id } });
      return tx.client.delete({ where: { id } });
    });
  }

  async findInactive(days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const clients = await this.prisma.client.findMany({
      include: {
        appointments: {
          where: { status: 'COMPLETED' },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        },
      },
    });

    return clients
      .filter((c) => c.appointments.length > 0 && c.appointments[0].scheduledAt < cutoff)
      .map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        lastVisit: c.appointments[0].scheduledAt,
      }));
  }
}
