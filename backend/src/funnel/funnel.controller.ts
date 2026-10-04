import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FunnelService } from './funnel.service';

@UseGuards(JwtAuthGuard)
@Controller('funnel')
export class FunnelController {
  constructor(private readonly service: FunnelService) {}

  @Get()
  board() {
    return this.service.board();
  }

  @Post('cards')
  createCard(@Body() body: any) {
    return this.service.createCard(body);
  }

  @Patch('cards/:id')
  updateCard(@Param('id') id: string, @Body() body: any) {
    return this.service.updateCard(id, body);
  }

  @Post('cards/:id/schedule')
  schedule(@Param('id') id: string, @Body() body: any) {
    return this.service.schedule(id, body);
  }
}
