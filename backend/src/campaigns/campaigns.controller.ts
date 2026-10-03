import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CampaignsService } from './campaigns.service';

@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('preview')
  preview(@Query('segment') segment: string, @Query('days') days: string) {
    return this.service.preview(segment, days);
  }

  @Post('test')
  test(@Body() body: any) {
    return this.service.sendTest(body);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string) {
    return this.service.pause(id);
  }

  @Post(':id/resume')
  resume(@Param('id') id: string) {
    return this.service.resume(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
