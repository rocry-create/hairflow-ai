import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfessionalAccessController } from './professional-access.controller';
import { ProfessionalAreaController } from './professional-area.controller';
import { ProfessionalAreaService } from './professional-area.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProfessionalAreaController, ProfessionalAccessController],
  providers: [ProfessionalAreaService],
})
export class ProfessionalAreaModule {}
