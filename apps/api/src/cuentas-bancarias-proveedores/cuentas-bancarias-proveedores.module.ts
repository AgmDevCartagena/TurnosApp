import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CuentasBancariasProveedoresService } from './cuentas-bancarias-proveedores.service';
import { CuentasBancariasProveedoresController } from './cuentas-bancarias-proveedores.controller';

@Module({
  controllers: [CuentasBancariasProveedoresController],
  providers: [CuentasBancariasProveedoresService, PrismaService],
  exports: [CuentasBancariasProveedoresService],
})
export class CuentasBancariasProveedoresModule {}
