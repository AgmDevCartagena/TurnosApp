import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SociosProveedoresService } from './socios-proveedores.service';
import { SociosProveedoresController } from './socios-proveedores.controller';

@Module({
  controllers: [SociosProveedoresController],
  providers: [SociosProveedoresService, PrismaService],
  exports: [SociosProveedoresService],
})
export class SociosProveedoresModule {}
