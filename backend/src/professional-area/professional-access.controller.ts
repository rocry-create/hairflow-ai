import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

// Somente o administrador cria ou troca o acesso das profissionais.
@UseGuards(JwtAuthGuard)
@Controller('professional-access')
export class ProfessionalAccessController {
  constructor(private prisma: PrismaService) {}

  private assertAdmin(req: any) {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Somente a administradora pode fazer isso.');
    }
  }

  @Get()
  async list(@Req() req: any) {
    this.assertAdmin(req);
    const pros = await this.prisma.professional.findMany({
      where: { active: true, userId: { not: null } },
      include: { user: true },
    });
    return pros.map((p) => ({ professionalId: p.id, email: p.user ? p.user.email : null }));
  }

  @Post(':professionalId')
  async save(@Req() req: any, @Param('professionalId') professionalId: string, @Body() body: any) {
    this.assertAdmin(req);

    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException('Escreva um e-mail válido.');
    }
    if (password.length < 8) {
      throw new BadRequestException('A senha precisa ter pelo menos 8 caracteres.');
    }

    const pro = await this.prisma.professional.findUnique({ where: { id: professionalId } });
    if (!pro) throw new NotFoundException('Profissional não encontrada.');

    const clash = await this.prisma.user.findUnique({ where: { email } });
    if (clash && clash.id !== pro.userId) {
      throw new BadRequestException('Já existe um acesso com esse e-mail.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (pro.userId) {
      await this.prisma.user.update({
        where: { id: pro.userId },
        data: { email, passwordHash, name: pro.name },
      });
    } else {
      const user = await this.prisma.user.create({
        data: { email, passwordHash, name: pro.name, role: 'PROFESSIONAL' },
      });
      await this.prisma.professional.update({
        where: { id: pro.id },
        data: { userId: user.id },
      });
    }
    return { ok: true };
  }
}
