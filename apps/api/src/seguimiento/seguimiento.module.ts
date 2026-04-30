import { Module } from '@nestjs/common';
import { SeguimientoService } from './seguimiento.service';
import { SeguimientoController } from './seguimiento.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [SeguimientoController],
  providers: [SeguimientoService, PrismaService],
  exports: [SeguimientoService],
})
export class SeguimientoModule {}
