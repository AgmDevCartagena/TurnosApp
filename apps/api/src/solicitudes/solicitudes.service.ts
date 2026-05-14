import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSolicitudDto, UpdateSolicitudDto, SolicitudQueryDto } from './dto';

@Injectable()
export class SolicitudesService {
  private readonly logger = new Logger(SolicitudesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async generateNumero(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.solicitudCompra.count({
      where: {
        numero: { startsWith: `SOL-${year}` },
      },
    });
    return `SOL-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async findAll(query: SolicitudQueryDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      estado,
      departamento,
      categoria,
      prioridad,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { titulo: { contains: search, mode: 'insensitive' } },
        { numero: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (estado) where.estado = estado;
    if (departamento) where.departamento = departamento;
    if (categoria) where.categoria = categoria;
    if (prioridad) where.prioridad = prioridad;

    const [solicitudes, total] = await Promise.all([
      this.prisma.solicitudCompra.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          solicitante: {
            select: { id: true, nombre: true, apellido: true, email: true },
          },
          empresa: {
            select: { id: true, nombre: true },
          },
          centroCosto: {
            select: { id: true, nombre: true, codigo: true },
          },
          _count: {
            select: { lineas: true },
          },
        },
      }),
      this.prisma.solicitudCompra.count({ where }),
    ]);

    return {
      data: solicitudes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const solicitud = await this.prisma.solicitudCompra.findUnique({
      where: { id },
      include: {
        solicitante: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        centroCosto: {
          select: { id: true, nombre: true, codigo: true },
        },
        lineas: {
          orderBy: { id: 'asc' },
        },
        flujoAprobacion: {
          include: {
            pasos: {
              include: {
                aprobador: {
                  select: { id: true, nombre: true, apellido: true },
                },
              },
              orderBy: { orden: 'asc' },
            },
          },
        },
      },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    return solicitud;
  }

  async create(dto: CreateSolicitudDto, userId: string) {
    const numero = await this.generateNumero();
    const { lineas, fechaRequerida, ...rest } = dto;

    // Calculate total
    const totalEstimado = lineas.reduce(
      (sum, l) => sum + (l.precioEstimado || 0) * l.cantidad,
      0,
    );

    const solicitud = await this.prisma.solicitudCompra.create({
      data: {
        numero,
        titulo: rest.titulo,
        solicitante: { connect: { id: userId } },
        empresa: { connect: { id: rest.empresaId } },
        estado: rest.estado || 'borrador',
        departamento: rest.departamento,
        categoria: rest.categoria,
        prioridad: rest.prioridad || 'media',
        ...(rest.centroCostoId
          ? { centroCosto: { connect: { id: rest.centroCostoId } } }
          : {}),
        fechaRequerida: fechaRequerida ? new Date(fechaRequerida) : undefined,
        tiempoEntrega: rest.tiempoEntrega,
        moneda: rest.moneda || 'COP',
        descripcion: rest.descripcion,
        justificacion: rest.justificacion,
        totalEstimado,
        lineas: {
          create: lineas.map((l) => ({
            descripcion: l.descripcion,
            cantidad: l.cantidad,
            unidadMedida: l.unidadMedida || 'Unidad',
            especificaciones: l.especificaciones || null,
            precioEstimado: l.precioEstimado || 0,
          })),
        },
      } as any,
      include: {
        solicitante: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        lineas: true,
      },
    });

    this.logger.log(`Solicitud creada: ${solicitud.numero} por usuario ${userId}`);
    return solicitud;
  }

  async update(id: string, dto: UpdateSolicitudDto) {
    await this.findOne(id);

    const { lineas, fechaRequerida, ...rest } = dto;

    // If lineas provided, recalculate total and replace them
    let totalEstimado: number | undefined;
    if (lineas) {
      totalEstimado = lineas.reduce(
        (sum, l) => sum + (l.precioEstimado || 0) * l.cantidad,
        0,
      );
    }

    const updateData: any = {};
    if (rest.titulo !== undefined) updateData.titulo = rest.titulo;
    if (rest.estado !== undefined) updateData.estado = rest.estado;
    if (rest.departamento !== undefined) updateData.departamento = rest.departamento;
    if (rest.categoria !== undefined) updateData.categoria = rest.categoria;
    if (rest.prioridad !== undefined) updateData.prioridad = rest.prioridad;
    if (rest.centroCostoId !== undefined) {
      updateData.centroCosto = rest.centroCostoId
        ? { connect: { id: rest.centroCostoId } }
        : { disconnect: true };
    }
    if (fechaRequerida !== undefined) updateData.fechaRequerida = new Date(fechaRequerida);
    if (rest.tiempoEntrega !== undefined) updateData.tiempoEntrega = rest.tiempoEntrega;
    if (rest.moneda !== undefined) updateData.moneda = rest.moneda;
    if (rest.descripcion !== undefined) updateData.descripcion = rest.descripcion;
    if (rest.justificacion !== undefined) updateData.justificacion = rest.justificacion;
    if (totalEstimado !== undefined) updateData.totalEstimado = totalEstimado;
    if (lineas) {
      updateData.lineas = {
        deleteMany: {},
        create: lineas.map((l) => ({
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          unidadMedida: l.unidadMedida || 'Unidad',
          especificaciones: l.especificaciones || null,
          precioEstimado: l.precioEstimado || 0,
        })),
      };
    }

    const solicitud = await this.prisma.solicitudCompra.update({
      where: { id },
      data: updateData,
      include: {
        solicitante: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        lineas: true,
      },
    });

    this.logger.log(`Solicitud actualizada: ${solicitud.numero}`);
    return solicitud;
  }

  async remove(id: string) {
    const solicitud = await this.findOne(id);

    if (!['borrador', 'rechazada'].includes(solicitud.estado)) {
      await this.prisma.solicitudCompra.update({
        where: { id },
        data: { estado: 'cancelada' },
      });
      this.logger.log(`Solicitud cancelada: ${solicitud.numero}`);
    } else {
      await this.prisma.solicitudCompra.delete({ where: { id } });
      this.logger.log(`Solicitud eliminada: ${solicitud.numero}`);
    }

    return { message: 'Solicitud eliminada correctamente' };
  }
}
