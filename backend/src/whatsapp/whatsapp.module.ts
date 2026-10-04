import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { ReminderService } from './reminder.service';
import { MaintenanceService } from './maintenance.service';
import { WhatsappController } from './whatsapp.controller';
import { EvolutionService } from './evolution.service';
import { GeminiService } from './gemini.service';

@Module({
  controllers: [WhatsappController],
  providers: [MaintenanceService, ReminderService, SchedulingService, EvolutionService, GeminiService],
})
export class WhatsappModule {}
