import { Module } from '@nestjs/common';
import { AtributosService } from './atributos.service';
import { AtributosController } from './atributos.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [AtributosController],
  providers: [AtributosService, PrismaService],
  exports: [AtributosService],
})
export class AtributosModule {}
