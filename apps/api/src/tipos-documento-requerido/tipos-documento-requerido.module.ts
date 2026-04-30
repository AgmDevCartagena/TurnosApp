import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TiposDocumentoRequeridoService } from './tipos-documento-requerido.service';
import { TiposDocumentoRequeridoController } from './tipos-documento-requerido.controller';

@Module({
  controllers: [TiposDocumentoRequeridoController],
  providers: [TiposDocumentoRequeridoService, PrismaService],
  exports: [TiposDocumentoRequeridoService],
})
export class TiposDocumentoRequeridoModule {}
