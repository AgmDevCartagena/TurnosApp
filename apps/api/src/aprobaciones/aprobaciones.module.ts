import { Module } from '@nestjs/common';
import { AprobacionesService } from './aprobaciones.service';
import { AprobacionesController } from './aprobaciones.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [AprobacionesController],
  providers: [AprobacionesService, PrismaService],
  exports: [AprobacionesService],
})
export class AprobacionesModule {}
