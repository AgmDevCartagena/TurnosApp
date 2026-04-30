import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UbicacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaises() {
    return this.prisma.pais.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        nombreOficial: true,
      },
    });
  }

  async findDepartamentosByPais(paisId: string) {
    const pais = await this.prisma.pais.findUnique({
      where: { id: paisId },
    });

    if (!pais) {
      throw new NotFoundException(`País con ID ${paisId} no encontrado`);
    }

    return this.prisma.departamento.findMany({
      where: {
        paisId,
        activo: true,
      },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
      },
    });
  }

  async findCiudadesByDepartamento(departamentoId: string) {
    const departamento = await this.prisma.departamento.findUnique({
      where: { id: departamentoId },
    });

    if (!departamento) {
      throw new NotFoundException(`Departamento con ID ${departamentoId} no encontrado`);
    }

    return this.prisma.ciudad.findMany({
      where: {
        departamentoId,
        activo: true,
      },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
      },
    });
  }
}
