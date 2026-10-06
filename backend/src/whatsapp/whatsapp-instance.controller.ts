import { Body, Controller, ForbiddenException, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhatsappInstanceService } from './whatsapp-instance.service';

// Somente a administradora mexe na conexao do WhatsApp.
@UseGuards(JwtAuthGuard)
@Controller('whatsapp-instance')
export class WhatsappInstanceController {
  constructor(private readonly service: WhatsappInstanceService) {}

  private assertAdmin(req: any) {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Somente a administradora pode fazer isso.');
    }
  }

  @Get()
  status(@Req() req: any) {
    this.assertAdmin(req);
    return this.service.status();
  }

  @Post('create')
  create(@Req() req: any) {
    this.assertAdmin(req);
    return this.service.create();
  }

  @Get('qrcode')
  qrcode(@Req() req: any, @Query('number') number?: string) {
    this.assertAdmin(req);
    return this.service.qrcode(number);
  }

  @Post('restart')
  restart(@Req() req: any) {
    this.assertAdmin(req);
    return this.service.restart();
  }

  @Post('logout')
  logout(@Req() req: any) {
    this.assertAdmin(req);
    return this.service.logout();
  }

  @Post('remove')
  remove(@Req() req: any) {
    this.assertAdmin(req);
    return this.service.remove();
  }

  @Post('test')
  test(@Req() req: any, @Body() body: any) {
    this.assertAdmin(req);
    return this.service.sendTest(String(body?.phone || ''));
  }
}
