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
import { GroupAutomationService } from './group-automation.service';
import { GroupAutomationController } from './group-automation.controller';

@Module({
  imports: [AppointmentsModule],
  controllers: [WhatsappController, WhatsappInstanceController, GroupAutomationController],
  providers: [WhatsappInstanceService, MaintenanceService, ReminderService, SchedulingService, EvolutionService, GeminiService, GroupAutomationService],
})
export class WhatsappModule {}
