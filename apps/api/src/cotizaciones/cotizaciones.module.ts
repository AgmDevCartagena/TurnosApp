import { Module } from '@nestjs/common';
import { CotizacionesService } from './cotizaciones.service';
import { CotizacionesController } from './cotizaciones.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [CotizacionesController],
  providers: [CotizacionesService, PrismaService],
  exports: [CotizacionesService],
})
export class CotizacionesModule {}
