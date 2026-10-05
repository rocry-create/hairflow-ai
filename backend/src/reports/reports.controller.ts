import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  private assertAdmin(req: any) {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Somente a administradora vê os relatórios.');
    }
  }

  @Get()
  overview(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    this.assertAdmin(req);
    return this.service.compute(from, to);
  }

  @Get('summary')
  summary(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    this.assertAdmin(req);
    return this.service.summary(from, to);
  }
}
