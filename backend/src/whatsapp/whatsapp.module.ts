import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { ReminderService } from './reminder.service';
import { MaintenanceService } from './maintenance.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappInstanceController } from './whatsapp-instance.controller';
import { WhatsappInstanceService } from './whatsapp-instance.service';
import { EvolutionService } from './evolution.service';
import { GeminiService } from './gemini.service';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [AppointmentsModule],
  controllers: [WhatsappController, WhatsappInstanceController],
  providers: [WhatsappInstanceService, MaintenanceService, ReminderService, SchedulingService, EvolutionService, GeminiService],
})
export class WhatsappModule {}
