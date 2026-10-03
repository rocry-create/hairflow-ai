import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EvolutionService } from '../whatsapp/evolution.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [PrismaModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, EvolutionService],
})
export class CampaignsModule {}
