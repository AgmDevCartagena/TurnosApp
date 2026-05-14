import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AsistenteController } from './asistente.controller';
import { AsistenteService } from './asistente.service';

@Module({
  controllers: [AsistenteController],
  providers: [AsistenteService, PrismaService],
})
export class AsistenteModule {}
