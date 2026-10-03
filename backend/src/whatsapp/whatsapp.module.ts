import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { EvolutionService } from './evolution.service';
import { GeminiService } from './gemini.service';

@Module({
  controllers: [WhatsappController],
  providers: [EvolutionService, GeminiService],
})
export class WhatsappModule {}
