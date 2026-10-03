import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../whatsapp/evolution.service';

const SEGMENTS = ['ALL', 'INACTIVE', 'MEGAHAIR'];
const MAX_RECIPIENTS = 150; // limite por campanha (proteção do número)
const MIN_DELAY_MS = 20000; // pausa mínima entre mensagens
const MAX_DELAY_MS = 45000; // pausa máxima entre mensagens
const MAX_CONSECUTIVE_FAILURES = 3; // pausa a campanha se falhar 3 seguidas

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class CampaignsService implements OnModuleInit {
  private readonly logger = new Logger(CampaignsService.name);
  private running = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private evolution: EvolutionService,
  ) {}

  // Se o servidor reiniciar no meio de uma campanha, ela continua de onde parou.
  async onModuleInit() {
    try {
      const active = await this.prisma.campaign.findMany({
        where: { status: 'RUNNING' },
        select: { id: true },
      });
      for (const c of active) void this.run(c.id);
    } catch (e) {
      this.logger.warn('Não foi possível retomar campanhas: ' + String(e));
    }
  }

  private parseDays(value: any) {
    const n = parseInt(String(value), 10);
    if (!n || n < 1) return 60;
    return Math.min(n, 730);
  }

  private normalizePhone(phone: string) {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
    return digits;
  }

  private personalize(message: string, name: string) {
    const first = (name || '').trim().split(' ')[0] || '';
    return message.replace(/\{nome\}/gi, first);
  }

  // Quem recebe a campanha
  private async audience(segment: string, days: number) {
    const clients = await this.prisma.client.findMany({
      include: {
        appointments: {
          where: { status: 'COMPLETED' },
          select: {
            scheduledAt: true,
            service: { select: { isMegaHair: true } },
          },
        },
      },
    });

    const cutoff = Date.now() - days * 86400000;

    return clients
      .filter((c) => {
        if (!c.phone) return false;
        if (segment === 'ALL') return true;
        const list =
          segment === 'MEGAHAIR'
            ? c.appointments.filter((a) => a.service.isMegaHair)
            : c.appointments;
        if (!list.length) return false;
        const last = Math.max(...list.map((a) => a.scheduledAt.getTime()));
        return last < cutoff;
      })
      .map((c) => ({ id: c.id, name: c.name, phone: c.phone }));
  }

  async preview(segment: string, days: any) {
    if (!SEGMENTS.includes(segment)) {
      throw new BadRequestException('Público inválido.');
    }
    const list = await this.audience(segment, this.parseDays(days));
    return {
      total: list.length,
      sample: list.slice(0, 5).map((c) => c.name),
      max: MAX_RECIPIENTS,
      tooMany: list.length > MAX_RECIPIENTS,
    };
  }

  private async assertWhatsappConnected() {
    let state: string | undefined;
    try {
      const s: any = await this.evolution.getStatus();
      state = s?.instance?.state ?? s?.state;
    } catch {
      return; // não conseguiu checar; segue e deixa a proteção de falhas agir
    }
    if (state && state !== 'open') {
      throw new BadRequestException(
        'O WhatsApp não está conectado. Reconecte o número em Conversas IA e tente de novo.',
      );
    }
  }

  async sendTest(body: any) {
    const phone = String(body?.phone || '').trim();
    const message = String(body?.message || '').trim();
    if (!phone || !message) {
      throw new BadRequestException('Informe o número e a mensagem do teste.');
    }
    const ok = await this.evolution.sendMessage(
      this.normalizePhone(phone),
      this.personalize(message, 'Maria'),
    );
    if (!ok) throw new BadRequestException('Não foi possível enviar o teste.');
    return { ok: true };
  }

  async create(body: any) {
    const name = String(body?.name || '').trim();
    const message = String(body?.message || '').trim();
    const segment = String(body?.segment || '');
    const days = this.parseDays(body?.days);

    if (!name) throw new BadRequestException('Dê um nome para a campanha.');
    if (!message) throw new BadRequestException('Escreva a mensagem.');
    if (!SEGMENTS.includes(segment)) {
      throw new BadRequestException('Escolha o público da campanha.');
    }

    await this.assertWhatsappConnected();

    const audience = await this.audience(segment, days);
    if (!audience.length) {
      throw new BadRequestException('Nenhum cliente encontrado para esse público.');
    }
    if (audience.length > MAX_RECIPIENTS) {
      throw new BadRequestException(
        `Esse público tem ${audience.length} clientes. O limite por campanha é ${MAX_RECIPIENTS}, para proteger o número do WhatsApp. Use um público menor.`,
      );
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        name,
        message,
        segment,
        days: segment === 'ALL' ? null : days,
        total: audience.length,
        status: 'RUNNING',
        startedAt: new Date(),
        recipients: {
          create: audience.map((c) => ({
            clientId: c.id,
            name: c.name,
            phone: c.phone,
          })),
        },
      },
    });

    void this.run(campaign.id);
    return campaign;
  }

  list() {
    return this.prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async detail(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { recipients: { orderBy: { name: 'asc' } } },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');
    return campaign;
  }

  async pause(id: string) {
    await this.prisma.campaign.updateMany({
      where: { id, status: 'RUNNING' },
      data: { status: 'PAUSED' },
    });
    return this.detail(id);
  }

  async resume(id: string) {
    await this.assertWhatsappConnected();
    const res = await this.prisma.campaign.updateMany({
      where: { id, status: 'PAUSED' },
      data: { status: 'RUNNING' },
    });
    if (res.count) void this.run(id);
    return this.detail(id);
  }

  async cancel(id: string) {
    await this.prisma.campaign.updateMany({
      where: { id, status: { in: ['RUNNING', 'PAUSED'] } },
      data: { status: 'CANCELLED', finishedAt: new Date() },
    });
    return this.detail(id);
  }

  // Envia uma mensagem por vez, com pausa aleatória entre elas
  private async run(campaignId: string) {
    if (this.running.has(campaignId)) return;
    this.running.add(campaignId);
    let failuresInRow = 0;

    try {
      while (true) {
        const campaign = await this.prisma.campaign.findUnique({
          where: { id: campaignId },
        });
        if (!campaign || campaign.status !== 'RUNNING') break;

        const recipient = await this.prisma.campaignRecipient.findFirst({
          where: { campaignId, status: 'PENDING' },
          orderBy: { id: 'asc' },
        });

        if (!recipient) {
          await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'COMPLETED', finishedAt: new Date() },
          });
          break;
        }

        const text = this.personalize(campaign.message, recipient.name);
        const ok = await this.evolution.sendMessage(
          this.normalizePhone(recipient.phone),
          text,
        );

        if (ok) {
          failuresInRow = 0;
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: 'SENT', sentAt: new Date() },
          });
          await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { sentCount: { increment: 1 } },
          });
          await this.logInConversation(recipient.clientId, text);
        } else {
          failuresInRow++;
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: 'FAILED', error: 'Falha no envio pelo WhatsApp' },
          });
          await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { failedCount: { increment: 1 } },
          });

          if (failuresInRow >= MAX_CONSECUTIVE_FAILURES) {
            this.logger.warn('Campanha pausada: falhas seguidas no envio.');
            await this.prisma.campaign.updateMany({
              where: { id: campaignId, status: 'RUNNING' },
              data: { status: 'PAUSED' },
            });
            break;
          }
        }

        const remaining = await this.prisma.campaignRecipient.count({
          where: { campaignId, status: 'PENDING' },
        });
        if (remaining > 0) {
          await sleep(
            MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS),
          );
        }
      }
    } catch (e) {
      this.logger.error('Erro ao rodar campanha ' + campaignId + ': ' + String(e));
    } finally {
      this.running.delete(campaignId);
    }
  }

  // Guarda a mensagem na conversa, para a IA saber o contexto quando a cliente responder
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
      this.logger.warn('Não foi possível registrar na conversa: ' + String(e));
    }
  }
}
