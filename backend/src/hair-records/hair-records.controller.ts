import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HairRecordsService } from './hair-records.service';
import { UpsertHairRecordDto } from './dto/upsert-hair-record.dto';

@UseGuards(JwtAuthGuard)
@Controller('clients/:clientId/hair-record')
export class HairRecordsController {
  constructor(private hairRecordsService: HairRecordsService) {}

  @Get()
  findByClient(@Param('clientId') clientId: string) {
    return this.hairRecordsService.findByClient(clientId);
  }

  @Put()
  upsert(@Param('clientId') clientId: string, @Body() dto: UpsertHairRecordDto) {
    return this.hairRecordsService.upsert(clientId, dto);
  }
}
