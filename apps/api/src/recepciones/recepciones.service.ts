import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateRecepcionDto, QueryRecepcionDto } from './dto';

@Injectable()
export class RecepcionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, recibidoPorId: string, dto: CreateRecepcionDto) {
    // Verificar que la orden existe y pertenece a la empresa
    const orden = await this.prisma.ordenCompra.findFirst({
      where: {
        id: dto.ordenCompraId,
        empresaId,
      },
      include: {
        recepciones: true,
      },
    });

    if (!orden) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    // Verificar que la orden está en estado enviada
    if (!['enviada_proveedor', 'parcialmente_recibida'].includes(orden.estado)) {
      throw new BadRequestException('La orden debe estar enviada al proveedor para poder recibirse');
    }

    // Crear recepción
    const recepcion = await this.prisma.recepcion.create({
      data: {
        ordenCompraId: dto.ordenCompraId,
        recibidoPorId,
        fechaRecepcion: dto.fechaRecepcion ? new Date(dto.fechaRecepcion) : new Date(),
        observaciones: dto.observaciones,
      },
      include: {
        ordenCompra: {
          include: {
            proveedor: true,
            solicitud: true,
          },
        },
        recibidoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    });

    // Actualizar estado de la orden a recibida
    await this.prisma.ordenCompra.update({
      where: { id: dto.ordenCompraId },
      data: { estado: 'recibida' },
    });

    return recepcion;
  }

  async findAll(empresaId: string, query: QueryRecepcionDto) {
    const { page = 1, limit = 10, ordenCompraId } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      ordenCompra: { empresaId },
    };

    if (ordenCompraId) {
      where.ordenCompraId = ordenCompraId;
    }

    const [recepciones, total] = await Promise.all([
      this.prisma.recepcion.findMany({
        where,
        skip,
        take: limit,
        include: {
          ordenCompra: {
            include: {
              proveedor: {
                select: {
                  id: true,
                  razonSocial: true,
                  nit: true,
                },
              },
              solicitud: {
                select: {
                  id: true,
                  descripcion: true,
                },
              },
            },
          },
          recibidoPor: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.recepcion.count({ where }),
    ]);

    return {
      data: recepciones,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(empresaId: string, id: string) {
    const recepcion = await this.prisma.recepcion.findFirst({
      where: {
        id,
        ordenCompra: { empresaId },
      },
      include: {
        ordenCompra: {
          include: {
            proveedor: true,
            solicitud: true,
            lineas: {
              include: {
                bienServicio: true,
              },
            },
          },
        },
        recibidoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    });

    if (!recepcion) {
      throw new NotFoundException('Recepción no encontrada');
    }

    return recepcion;
  }

  async getOrdenesPendientes(empresaId: string) {
    const ordenes = await this.prisma.ordenCompra.findMany({
      where: {
        empresaId,
        estado: {
          in: ['enviada_proveedor', 'parcialmente_recibida'],
        },
      },
      include: {
        proveedor: {
          select: {
            id: true,
            razonSocial: true,
            nit: true,
          },
        },
        solicitud: {
          select: {
            id: true,
            descripcion: true,
          },
        },
        recepciones: true,
      },
      orderBy: {
        fechaEntregaEstimada: 'asc',
      },
    });

    return ordenes;
  }

  async remove(empresaId: string, id: string) {
    const recepcion = await this.findOne(empresaId, id);

    // Verificar si es la última recepción de la orden
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id: recepcion.ordenCompraId },
      include: {
        recepciones: true,
      },
    });

    await this.prisma.recepcion.delete({
      where: { id },
    });

    // Si era la única recepción, volver el estado de la orden a enviada
    if (orden && orden.recepciones.length === 1) {
      await this.prisma.ordenCompra.update({
        where: { id: recepcion.ordenCompraId },
        data: { estado: 'enviada_proveedor' },
      });
    }

    return { message: 'Recepción eliminada exitosamente' };
  }
}
