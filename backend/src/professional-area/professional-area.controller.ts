import { Body, Controller, Get, Param, Patch, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfessionalAreaService } from './professional-area.service';

@UseGuards(JwtAuthGuard)
@Controller('professional-area')
export class ProfessionalAreaController {
  constructor(private readonly service: ProfessionalAreaService) {}

  @Get('me')
  me(@Req() req: any) {
    return this.service.me(req.user.userId);
  }

  @Get('upcoming')
  upcoming(@Req() req: any) {
    return this.service.upcoming(req.user.userId);
  }

  @Get('to-complete')
  toComplete(@Req() req: any) {
    return this.service.toComplete(req.user.userId);
  }

  @Get('commissions')
  commissions(@Req() req: any, @Query('month') month?: string) {
    return this.service.commissions(req.user.userId, month);
  }

  @Patch('appointments/:id')
  setStatus(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.setStatus(req.user.userId, id, String(body?.status || ''));
  }

  @Get('clients/:clientId/hair-record')
  hairRecord(@Req() req: any, @Param('clientId') clientId: string) {
    return this.service.hairRecord(req.user.userId, clientId);
  }

  @Put('clients/:clientId/hair-record')
  saveHairRecord(@Req() req: any, @Param('clientId') clientId: string, @Body() body: any) {
    return this.service.saveHairRecord(req.user.userId, clientId, body);
  }
}
