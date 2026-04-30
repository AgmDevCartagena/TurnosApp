import { Module } from '@nestjs/common';
import { RecepcionesService } from './recepciones.service';
import { RecepcionesController } from './recepciones.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [RecepcionesController],
  providers: [RecepcionesService, PrismaService],
  exports: [RecepcionesService],
})
export class RecepcionesModule {}
