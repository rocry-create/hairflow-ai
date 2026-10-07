import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountController, SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [SettingsController, AccountController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
