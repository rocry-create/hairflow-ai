import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertHairRecordDto } from './dto/upsert-hair-record.dto';

@Injectable()
export class HairRecordsService {
  constructor(private prisma: PrismaService) {}

  async findByClient(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return this.prisma.hairRecord.findUnique({ where: { clientId } });
  }

  async upsert(clientId: string, dto: UpsertHairRecordDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const data = {
      ...dto,
      lastChemicalAt: dto.lastChemicalAt ? new Date(dto.lastChemicalAt) : undefined,
    };

    return this.prisma.hairRecord.upsert({
      where: { clientId },
      create: { clientId, ...data },
      update: data,
    });
  }
}
