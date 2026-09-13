import { Module } from '@nestjs/common';
import { HairRecordsService } from './hair-records.service';
import { HairRecordsController } from './hair-records.controller';

@Module({
  providers: [HairRecordsService],
  controllers: [HairRecordsController],
})
export class HairRecordsModule {}
