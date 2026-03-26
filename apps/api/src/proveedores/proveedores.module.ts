import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProveedoresController } from './proveedores.controller';
import { ProveedoresService } from './proveedores.service';

@Module({
  controllers: [ProveedoresController],
  providers: [PrismaService, ProveedoresService],
  exports: [ProveedoresService],
})
export class ProveedoresModule {}
