import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';

@Module({
  controllers: [SolicitudesController],
  providers: [PrismaService, SolicitudesService],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}
