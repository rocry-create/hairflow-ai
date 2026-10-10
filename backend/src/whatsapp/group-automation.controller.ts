import { BadRequestException, Body, Controller, ForbiddenException, Get, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from './evolution.service';

@UseGuards(JwtAuthGuard)
@Controller('group-automation')
export class GroupAutomationController {
  constructor(private prisma: PrismaService, private evolution: EvolutionService) {}

  private assertAdmin(req: any) {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Somente a administradora pode fazer isso.');
    }
  }

  private async config() {
    const found = await this.prisma.groupAutomation.findFirst();
    return found || this.prisma.groupAutomation.create({ data: {} });
  }

  @Get()
  async read(@Req() req: any) {
    this.assertAdmin(req);
    return this.config();
  }

  @Put()
  async save(@Req() req: any, @Body() body: any) {
    this.assertAdmin(req);
    const cur = await this.config();
    const data: any = {};
    const txt = (v: any, max: number) => String(v ?? '').slice(0, max);
    const num = (v: any, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));
    if (body.welcomeText !== undefined) data.welcomeText = txt(body.welcomeText, 2000);
    if (body.offerText !== undefined) data.offerText = txt(body.offerText, 2000);
    if (body.welcomeEnabled !== undefined) data.welcomeEnabled = !!body.welcomeEnabled;
    if (body.offerEnabled !== undefined) data.offerEnabled = !!body.offerEnabled;
    if (body.offerDelayMinutes !== undefined) data.offerDelayMinutes = num(body.offerDelayMinutes, 0, 10080);
    if (body.repeatAfterHours !== undefined) data.repeatAfterHours = num(body.repeatAfterHours, 0, 720);
    if (body.groupId !== undefined && body.groupId !== cur.groupId) {
      data.groupId = body.groupId ? txt(body.groupId, 100) : null;
      data.groupName = body.groupName ? txt(body.groupName, 200) : null;
      data.baselineDone = false;
      data.enabled = false;
    }
    if (body.enabled !== undefined && data.enabled === undefined) {
      const groupId = data.groupId !== undefined ? data.groupId : cur.groupId;
      if (body.enabled && !groupId) throw new BadRequestException('Escolha um grupo antes de ligar.');
      data.enabled = !!body.enabled;
    }
    return this.prisma.groupAutomation.update({ where: { id: cur.id }, data });
  }

  @Get('groups')
  async groups(@Req() req: any) {
    this.assertAdmin(req);
    try {
      const res = await fetch('http://hairflow_evolution:8080/group/fetchAllGroups/hairflow?getParticipants=false', {
        headers: { apikey: process.env.EVOLUTION_API_KEY || '' },
      });
      if (!res.ok) return [];
      const data: any = await res.json();
      const list: any[] = Array.isArray(data) ? data : [];
      return list
        .map((g) => ({ id: String(g.id || ''), name: String(g.subject || g.name || '') }))
        .filter((g) => g.id)
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      return [];
    }
  }

  @Get('members')
  async members(@Req() req: any) {
    this.assertAdmin(req);
    const cfg = await this.config();
    if (!cfg.groupId) return [];
    return this.prisma.groupMember.findMany({
      where: { groupId: cfg.groupId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }
}
