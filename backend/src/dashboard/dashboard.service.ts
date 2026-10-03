import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(from: Date, to: Date) {
    const appointments = await this.prisma.appointment.findMany({
      where: { scheduledAt: { gte: from, lte: to } },
      include: { service: true, professional: true },
    });

    const completed = appointments.filter((a) => a.status === 'COMPLETED');
    const noShow = appointments.filter((a) => a.status === 'NO_SHOW');

    const revenue = completed.reduce((sum, a) => sum + Number(a.price), 0);
    const ticketMedio = completed.length > 0 ? revenue / completed.length : 0;

    const byService = new Map();
    for (const appt of completed) {
      const key = appt.serviceId;
      const entry = byService.get(key) ?? { name: appt.service.name, count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += Number(appt.price);
      byService.set(key, entry);
    }

    const byProfessional = new Map();
    for (const appt of completed) {
      const key = appt.professionalId;
      const commissionPercent = Number(appt.professional.commissionPercent ?? 0);
      const entry = byProfessional.get(key) ?? {
        name: appt.professional.name,
        count: 0,
        revenue: 0,
        commissionPercent,
        commission: 0,
      };
      entry.count += 1;
      entry.revenue += Number(appt.price);
      entry.commission += (Number(appt.price) * commissionPercent) / 100;
      byProfessional.set(key, entry);
    }

    const totalComissoes = Array.from(byProfessional.values()).reduce(
      (sum, p) => sum + p.commission,
      0,
    );

    return {
      period: { from, to },
      financeiro: {
        faturamento: revenue,
        ticketMedio,
        totalComissoes,
        lucroLiquido: revenue - totalComissoes,
        servicosMaisVendidos: Array.from(byService.values()).sort((a, b) => b.count - a.count),
        profissionaisQueMaisFaturam: Array.from(byProfessional.values()).sort(
          (a, b) => b.revenue - a.revenue,
        ),
      },
      comercial: {
        totalAgendamentos: appointments.length,
        concluidos: completed.length,
        faltas: noShow.length,
        taxaFalta: appointments.length > 0 ? noShow.length / appointments.length : 0,
      },
    };
  }
}
