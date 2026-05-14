import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UbicacionesService {
  private readonly logger = new Logger(UbicacionesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllPaises() {
    const start = Date.now();
    const results = await this.prisma.pais.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        nombreOficial: true,
      },
    });
    const duration = Date.now() - start;
    if (results.length === 0) {
      this.logger.warn(`GET paises total=0 duration=${duration}ms — tabla paises vacía o sin registros activos`);
    } else {
      this.logger.log(`GET paises total=${results.length} duration=${duration}ms`);
    }
    return results;
  }

  async findDepartamentosByPais(paisId: string) {
    const start = Date.now();
    const pais = await this.prisma.pais.findUnique({ where: { id: paisId } });

    if (!pais) {
      this.logger.warn(`GET departamentos paisId=${paisId} — país no encontrado`);
      throw new NotFoundException(`País con ID ${paisId} no encontrado`);
    }

    const results = await this.prisma.departamento.findMany({
      where: { paisId, activo: true },
      orderBy: { nombre: 'asc' },
      select: { id: true, codigo: true, nombre: true },
    });
    const duration = Date.now() - start;
    if (results.length === 0) {
      this.logger.warn(`GET departamentos paisId=${paisId} total=0 duration=${duration}ms — sin departamentos para este país`);
    } else {
      this.logger.log(`GET departamentos paisId=${paisId} total=${results.length} duration=${duration}ms`);
    }
    return results;
  }

  async findCiudadesByDepartamento(departamentoId: string) {
    const start = Date.now();
    const departamento = await this.prisma.departamento.findUnique({ where: { id: departamentoId } });

    if (!departamento) {
      this.logger.warn(`GET ciudades departamentoId=${departamentoId} — departamento no encontrado`);
      throw new NotFoundException(`Departamento con ID ${departamentoId} no encontrado`);
    }

    const results = await this.prisma.ciudad.findMany({
      where: { departamentoId, activo: true },
      orderBy: { nombre: 'asc' },
      select: { id: true, codigo: true, nombre: true },
    });
    const duration = Date.now() - start;
    if (results.length === 0) {
      this.logger.warn(`GET ciudades departamentoId=${departamentoId} total=0 duration=${duration}ms — sin ciudades`);
    } else {
      this.logger.log(`GET ciudades departamentoId=${departamentoId} total=${results.length} duration=${duration}ms`);
    }
    return results;
  }
}
