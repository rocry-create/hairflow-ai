import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SalonConfig = {
  salonName: string;
  openTime: string;
  closeTime: string;
  weekdays: number[];
  openMinutes: number;
  closeMinutes: number;
};

type Row = { salonName: string; openTime: string; closeTime: string; weekdays: string };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_ROW: Row = {
  salonName: 'HairFlow',
  openTime: '09:00',
  closeTime: '19:00',
  weekdays: '1,2,3,4,5,6',
};

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function build(row: Row): SalonConfig {
  const weekdays = row.weekdays
    .split(',')
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return {
    salonName: row.salonName,
    openTime: row.openTime,
    closeTime: row.closeTime,
    weekdays: weekdays.length ? weekdays : [1, 2, 3, 4, 5, 6],
    openMinutes: toMinutes(row.openTime),
    closeMinutes: toMinutes(row.closeTime),
  };
}

@Injectable()
export class SettingsService implements OnModuleInit {
  private cache: SalonConfig = build(DEFAULT_ROW);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.reload();
    } catch {
      // se o banco ainda nao estiver pronto, segue com o horario padrao
    }
  }

  // Leitura rapida, sem ir ao banco. O servico de agendamento usa esta.
  get(): SalonConfig {
    return this.cache;
  }

  async reload(): Promise<SalonConfig> {
    const row = await this.prisma.salonSettings.upsert({
      where: { id: 'main' },
      update: {},
      create: { id: 'main' },
    });
    this.cache = build(row);
    return this.cache;
  }

  async save(input: any): Promise<SalonConfig> {
    const salonName = String(input?.salonName ?? '').trim();
    const openTime = String(input?.openTime ?? '');
    const closeTime = String(input?.closeTime ?? '');
    const days: number[] = Array.isArray(input?.weekdays) ? input.weekdays.map((x: any) => Number(x)) : [];
    const weekdays: number[] = Array.from(
      new Set<number>(days.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)),
    ).sort((a, b) => a - b);

    if (salonName.length < 2 || salonName.length > 60) {
      throw new BadRequestException('O nome do salão precisa ter de 2 a 60 letras.');
    }
    if (!TIME.test(openTime) || !TIME.test(closeTime)) {
      throw new BadRequestException('Escreva o horário de abertura e o de fechamento.');
    }
    if (toMinutes(closeTime) - toMinutes(openTime) < 60) {
      throw new BadRequestException('O salão precisa ficar aberto pelo menos 1 hora por dia.');
    }
    if (weekdays.length === 0) {
      throw new BadRequestException('Marque pelo menos um dia de funcionamento.');
    }

    const data = { salonName, openTime, closeTime, weekdays: weekdays.join(',') };
    const row = await this.prisma.salonSettings.upsert({
      where: { id: 'main' },
      update: data,
      create: { id: 'main', ...data },
    });
    this.cache = build(row);
    return this.cache;
  }
}
