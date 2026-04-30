import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAtributoDto, UpdateAtributoDto, QueryAtributoDto } from './dto';

@Injectable()
export class AtributosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAtributoDto) {
    const atributo = await this.prisma.atributoDinamico.create({
      data: {
        nombre: dto.nombre,
        categoria: dto.categoria,
        tipoDato: dto.tipoDato,
        valores: dto.valores,
        obligatorio: dto.obligatorio ?? false,
        activo: dto.activo ?? true,
        orden: dto.orden ?? 0,
      },
    });

    return atributo;
  }

  async findAll(query: QueryAtributoDto) {
    const { categoria, activo } = query;

    const where: any = {};

    if (categoria) {
      where.categoria = categoria;
    }

    if (activo !== undefined) {
      where.activo = activo;
    }

    const atributos = await this.prisma.atributoDinamico.findMany({
      where,
      orderBy: [
        { categoria: 'asc' },
        { orden: 'asc' },
        { nombre: 'asc' },
      ],
    });

    return atributos;
  }

  async findOne(id: string) {
    const atributo = await this.prisma.atributoDinamico.findUnique({
      where: { id },
      include: {
        valoresAtributo: {
          include: {
            bienServicio: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    if (!atributo) {
      throw new NotFoundException('Atributo no encontrado');
    }

    return atributo;
  }

  async update(id: string, dto: UpdateAtributoDto) {
    await this.findOne(id);

    const atributo = await this.prisma.atributoDinamico.update({
      where: { id },
      data: {
        ...(dto.nombre && { nombre: dto.nombre }),
        ...(dto.categoria && { categoria: dto.categoria }),
        ...(dto.tipoDato && { tipoDato: dto.tipoDato }),
        ...(dto.valores !== undefined && { valores: dto.valores }),
        ...(dto.obligatorio !== undefined && { obligatorio: dto.obligatorio }),
        ...(dto.activo !== undefined && { activo: dto.activo }),
        ...(dto.orden !== undefined && { orden: dto.orden }),
      },
    });

    return atributo;
  }

  async toggleActivo(id: string) {
    const atributo = await this.findOne(id);

    const updated = await this.prisma.atributoDinamico.update({
      where: { id },
      data: {
        activo: !atributo.activo,
      },
    });

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.atributoDinamico.delete({
      where: { id },
    });

    return { message: 'Atributo eliminado exitosamente' };
  }

  async getCategorias() {
    const categorias = await this.prisma.atributoDinamico.findMany({
      select: {
        categoria: true,
      },
      distinct: ['categoria'],
      orderBy: {
        categoria: 'asc',
      },
    });

    return categorias.map((c) => c.categoria);
  }
}
