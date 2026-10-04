import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FunnelController } from './funnel.controller';
import { FunnelService } from './funnel.service';

@Module({
  imports: [PrismaModule],
  controllers: [FunnelController],
  providers: [FunnelService],
})
export class FunnelModule {}
