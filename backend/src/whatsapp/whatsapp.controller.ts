import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from './evolution.service';
import { GeminiService } from './gemini.service';
import { SchedulingService } from './scheduling.service';
import { ReminderService } from './reminder.service';
import { AppointmentsService } from '../appointments/appointments.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private prisma: PrismaService,
    private evolution: EvolutionService,
    private gemini: GeminiService,
    private config: ConfigService,
    private scheduling: SchedulingService,
    private reminders: ReminderService,
    private appointments: AppointmentsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('connect')
  async connect() {
    const webhookUrl = this.config.get<string>('WEBHOOK_BASE_URL') || '';
    await this.evolution.createInstance(webhookUrl).catch(() => null);
    return this.evolution.getQrCode();
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  status() {
    return this.evolution.getStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations')
  async listConversations() {
    const conversations = await this.prisma.conversation.findMany({
      include: {
        client: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((c) => ({
      id: c.id,
      stage: c.stage,
      aiEnabled: c.aiEnabled,
      client: { id: c.client.id, name: c.client.name, phone: c.client.phone },
      lastMessage: c.messages[0]?.content || null,
      lastMessageAt: c.messages[0]?.createdAt || c.updatedAt,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/:id')
  async getConversation(@Param('id') id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        client: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    return conversation;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('conversations/:id/ai')
  async toggleAi(@Param('id') id: string, @Body() body: { aiEnabled: boolean }) {
    return this.prisma.conversation.update({
      where: { id },
      data: { aiEnabled: body.aiEnabled },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('conversations/:id/stage')
  async updateStage(@Param('id') id: string, @Body() body: { stage: string }) {
    return this.prisma.conversation.update({
      where: { id },
      data: { stage: body.stage as any },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('conversations/:id')
  async deleteConversation(@Param('id') id: string) {
    await this.prisma.message.deleteMany({ where: { conversationId: id } });
    await this.prisma.conversation.delete({ where: { id } });
    return { deleted: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('conversations/:id/reply')
  async manualReply(@Param('id') id: string, @Body() body: { text: string }) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!conversation) return { error: 'Conversa nao encontrada' };

    await this.prisma.message.create({
      data: { conversationId: id, role: 'HUMAN', content: body.text },
    });
    await this.evolution.sendMessage(conversation.client.phone, body.text);
    return { sent: true };
  }

  private fillText(text: string, name: string, when: Date) {
    const tz = 'America/Sao_Paulo';
    const data = when.toLocaleDateString('pt-BR', { timeZone: tz, weekday: 'long', day: '2-digit', month: '2-digit' });
    const hora = when.toLocaleTimeString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
    return text.split('{nome}').join(name).split('{data}').join(data).split('{hora}').join(hora);
  }

  private async sendToClient(conversationId: string, phone: string, text: string) {
    try {
      await this.prisma.message.create({ data: { conversationId, role: 'HUMAN', content: text } });
      await this.evolution.sendMessage(phone, text);
      return true;
    } catch (err) {
      return false;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/:id/appointments')
  async clientAppointments(@Param('id') id: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id }, include: { client: true } });
    if (!conversation) throw new BadRequestException('Conversa nao encontrada');
    return this.prisma.appointment.findMany({
      where: {
        clientId: conversation.client.id,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: { gte: new Date() },
      },
      include: { service: true, professional: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('conversations/:id/schedule')
  async scheduleAndReply(
    @Param('id') id: string,
    @Body() body: { serviceId: string; professionalId: string; scheduledAt: string; text: string },
  ) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id }, include: { client: true } });
    if (!conversation) throw new BadRequestException('Conversa nao encontrada');
    if (!body || !body.serviceId || !body.professionalId || !body.scheduledAt || !body.text) {
      throw new BadRequestException('Informe servico, profissional, dia, hora e texto');
    }
    const when = new Date(body.scheduledAt);
    if (Number.isNaN(when.getTime())) throw new BadRequestException('Data ou hora invalida');
    if (when.getTime() < Date.now() - 60000) throw new BadRequestException('Esse horario ja passou');

    const appointment = await this.appointments.create({
      clientId: conversation.client.id,
      professionalId: body.professionalId,
      serviceId: body.serviceId,
      scheduledAt: when.toISOString(),
      notes: 'Marcado pela resposta pronta',
    } as any);

    const first = (conversation.client.name || '').trim().split(' ')[0] || 'cliente';
    const text = this.fillText(body.text, first, when);
    const sent = await this.sendToClient(id, conversation.client.phone, text);
    return { scheduled: true, sent, appointmentId: appointment.id };
  }

  @UseGuards(JwtAuthGuard)
  @Post('conversations/:id/cancel')
  async cancelAndReply(@Param('id') id: string, @Body() body: { appointmentId: string; text: string }) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id }, include: { client: true } });
    if (!conversation) throw new BadRequestException('Conversa nao encontrada');
    if (!body || !body.appointmentId || !body.text) throw new BadRequestException('Escolha o horario e informe o texto');

    const appt = await this.prisma.appointment.findUnique({ where: { id: body.appointmentId } });
    if (!appt || appt.clientId !== conversation.client.id) throw new BadRequestException('Horario nao encontrado para esta cliente');
    if (appt.status === 'CANCELLED') throw new BadRequestException('Este horario ja esta cancelado');

    await this.prisma.appointment.update({ where: { id: appt.id }, data: { status: 'CANCELLED' } });

    const first = (conversation.client.name || '').trim().split(' ')[0] || 'cliente';
    const text = this.fillText(body.text, first, appt.scheduledAt);
    const sent = await this.sendToClient(id, conversation.client.phone, text);
    return { cancelled: true, sent };
  }

  @Post('group-webhook')
  async groupWebhook(@Body() payload: any) {
    try {
      await this.prisma.groupEvent.create({
        data: { event: String((payload && payload.event) || ''), payload: payload || {} },
      });
    } catch (err) {
      // nunca devolve erro ao Evolution
    }
    return { received: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('group-events')
  async groupEvents() {
    return this.prisma.groupEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  }

  @Post('webhook')
  async webhook(@Body() payload: any) {
    const ev = String((payload && payload.event) || '').toLowerCase().replace(/[._-]/g, '');
    const isGroupEvent = ev.includes('groupparticipants') || ev.includes('groupsupsert') || ev.includes('groupupdate');
    if (isGroupEvent) {
      try {
        await this.prisma.groupEvent.create({ data: { event: String(payload.event), payload: payload || {} } });
      } catch (err) {
        // nunca devolve erro ao Evolution
      }
      return { received: true };
    }
    try {
      const messageData = payload?.data;
      if (!messageData || messageData.key?.fromMe) {
        return { received: true };
      }

      const remoteJid: string = messageData.key?.remoteJid || '';
      if (remoteJid.endsWith('@g.us') || remoteJid.endsWith('@broadcast')) {
        return { received: true };
      }

      const phone = remoteJid.split('@')[0];
      const text: string =
        messageData.message?.conversation ||
        messageData.message?.extendedTextMessage?.text ||
        '';

      if (!phone || !text) {
        return { received: true };
      }

      const pushName: string = messageData.pushName || 'Cliente';

      const client = await this.prisma.client.upsert({
        where: { phone },
        create: { phone, name: pushName },
        update: {},
      });

      let conversation = await this.prisma.conversation.findUnique({
        where: { clientId: client.id },
      });
      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: { clientId: client.id },
        });
      }

      await this.prisma.message.create({
        data: { conversationId: conversation.id, role: 'CLIENT', content: text },
      });

      if (!conversation.aiEnabled) {
        return { received: true };
      }

      const reminderReply = await this.reminders.handleClientReply(client.id, conversation.id, text);
      if (reminderReply) {
        await this.prisma.message.create({
          data: { conversationId: conversation.id, role: 'AI', content: reminderReply },
        });
        await this.evolution.sendMessage(phone, reminderReply);
        return { received: true };
      }

      const recentMessages = await this.prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      const history = recentMessages.reverse();

      const activeServices = await this.prisma.service.findMany({
        where: { active: true },
      });
      const services = activeServices.map((s) => ({
        name: s.name,
        price: Number(s.price),
        priceMax: s.priceMax == null ? null : Number(s.priceMax),
        requiresEvaluation: s.requiresEvaluation,
        isMegaHair: s.isMegaHair,
        durationMinutes: s.durationMinutes,
      }));

      let reply = await this.gemini.generateReply(
        history.map((h) => ({ role: h.role, content: h.content })),
        client.name,
        services,
        this.scheduling.promptBlock(),
      );
      reply = await this.scheduling.handleReply(reply, client.id, conversation.id);

      await this.prisma.message.create({
        data: { conversationId: conversation.id, role: 'AI', content: reply },
      });

      await this.evolution.sendMessage(phone, reply);

      return { received: true };
    } catch (err) {
      return { received: true, error: true };
    }
  }
}
