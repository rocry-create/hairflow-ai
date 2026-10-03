import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { ServicesModule } from './services/services.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { HairRecordsModule } from './hair-records/hair-records.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ClientsModule,
    ProfessionalsModule,
    ServicesModule,
    AppointmentsModule,
    HairRecordsModule,
    DashboardModule,
    WhatsappModule,
    CampaignsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
