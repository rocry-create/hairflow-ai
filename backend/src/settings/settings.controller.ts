import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from './settings.service';

function publicView(c: { salonName: string; openTime: string; closeTime: string; weekdays: number[] }) {
  return { salonName: c.salonName, openTime: c.openTime, closeTime: c.closeTime, weekdays: c.weekdays };
}

// Dados da empresa: nome do salao e horario de funcionamento
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  private assertAdmin(req: any) {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Somente a administradora pode fazer isso.');
    }
  }

  @Get()
  async read(@Req() req: any) {
    this.assertAdmin(req);
    return publicView(await this.settings.reload());
  }

  @Put()
  async update(@Req() req: any, @Body() body: any) {
    this.assertAdmin(req);
    return publicView(await this.settings.save(body));
  }
}

// Conta de quem esta logado: nome e senha
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(private prisma: PrismaService) {}

  private async currentUser(req: any) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  @Get()
  async me(@Req() req: any) {
    const user = await this.currentUser(req);
    return { name: user.name, email: user.email, role: user.role };
  }

  @Put()
  async rename(@Req() req: any, @Body() body: any) {
    const user = await this.currentUser(req);
    const name = String(body?.name ?? '').trim();
    if (name.length < 2 || name.length > 80) {
      throw new BadRequestException('O nome precisa ter de 2 a 80 letras.');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { name } });
    return { name };
  }

  @Post('password')
  async changePassword(@Req() req: any, @Body() body: any) {
    const user = await this.currentUser(req);
    const current = String(body?.currentPassword ?? '');
    const next = String(body?.newPassword ?? '');

    const matches = await bcrypt.compare(current, user.passwordHash);
    if (!matches) throw new BadRequestException('A senha atual está errada.');
    if (next.length < 8) throw new BadRequestException('A senha nova precisa ter pelo menos 8 caracteres.');
    if (next === current) throw new BadRequestException('A senha nova precisa ser diferente da atual.');

    const passwordHash = await bcrypt.hash(next, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return { ok: true };
  }
}
