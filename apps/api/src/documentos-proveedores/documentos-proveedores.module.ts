import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DocumentosProveedoresService } from './documentos-proveedores.service';
import { DocumentosProveedoresController } from './documentos-proveedores.controller';

@Module({
  controllers: [DocumentosProveedoresController],
  providers: [DocumentosProveedoresService, PrismaService],
  exports: [DocumentosProveedoresService],
})
export class DocumentosProveedoresModule {}
