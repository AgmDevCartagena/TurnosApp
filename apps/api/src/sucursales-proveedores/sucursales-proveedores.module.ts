import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SucursalesProveedoresService } from './sucursales-proveedores.service';
import { SucursalesProveedoresController } from './sucursales-proveedores.controller';

@Module({
  controllers: [SucursalesProveedoresController],
  providers: [SucursalesProveedoresService, PrismaService],
  exports: [SucursalesProveedoresService],
})
export class SucursalesProveedoresModule {}
