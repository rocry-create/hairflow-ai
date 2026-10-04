import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from './evolution.service';
import { GeminiService } from './gemini.service';
import { SchedulingService } from './scheduling.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private prisma: PrismaService,
    private evolution: EvolutionService,
    private gemini: GeminiService,
    private config: ConfigService,
    private scheduling: SchedulingService,
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

  @Post('webhook')
  async webhook(@Body() payload: any) {
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
