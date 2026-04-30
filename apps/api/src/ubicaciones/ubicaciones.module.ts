import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UbicacionesService } from './ubicaciones.service';
import { UbicacionesController } from './ubicaciones.controller';

@Module({
  controllers: [UbicacionesController],
  providers: [PrismaService, UbicacionesService],
  exports: [UbicacionesService],
})
export class UbicacionesModule {}
