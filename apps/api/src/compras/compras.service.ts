import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateOrdenCompraDto, UpdateOrdenCompraDto, QueryOrdenCompraDto } from './dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ComprasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, creadorId: string, dto: CreateOrdenCompraDto) {
    // Verificar que la solicitud existe y está aprobada
    const solicitud = await this.prisma.solicitudCompra.findFirst({
      where: {
        id: dto.solicitudId,
        empresaId,
        estado: 'aprobada',
      },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada o no está aprobada');
    }

    // Verificar que el proveedor existe
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: dto.proveedorId },
    });

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    // Generar número de orden
    const count = await this.prisma.ordenCompra.count({
      where: { empresaId },
    });
    const numero = `OC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Calcular totales
    let subtotal = new Decimal(0);
    let impuestos = new Decimal(0);

    const lineasConTotales = dto.lineas.map((linea) => {
      const cantidad = new Decimal(linea.cantidad);
      const precioUnitario = new Decimal(linea.precioUnitario);
      const descuento = new Decimal(linea.descuento || 0);

      const subtotalLinea = cantidad.mul(precioUnitario);
      const descuentoLinea = subtotalLinea.mul(descuento).div(100);
      const baseImponible = subtotalLinea.sub(descuentoLinea);

      subtotal = subtotal.add(baseImponible);

      return {
        bienServicioId: linea.bienServicioId,
        cantidad: linea.cantidad,
        unidadMedida: linea.unidadMedida,
        precioUnitario: linea.precioUnitario,
        descuento: linea.descuento || 0,
        subtotal: baseImponible,
      };
    });

    // Calcular IVA (19%)
    impuestos = subtotal.mul(0.19);
    const total = subtotal.add(impuestos);

    // Crear orden de compra
    const orden = await this.prisma.ordenCompra.create({
      data: {
        numero,
        empresaId,
        solicitudId: dto.solicitudId,
        proveedorId: dto.proveedorId,
        creadorId,
        estado: dto.estado || 'borrador',
        condicionesPago: dto.condicionesPago,
        fechaEmision: dto.fechaEmision ? new Date(dto.fechaEmision) : new Date(),
        fechaEntregaEstimada: dto.fechaEntregaEstimada ? new Date(dto.fechaEntregaEstimada) : null,
        observaciones: dto.observaciones,
        subtotal,
        impuestos,
        total,
        lineas: {
          create: lineasConTotales,
        },
      },
      include: {
        proveedor: true,
        solicitud: true,
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        lineas: {
          include: {
            bienServicio: true,
          },
        },
      },
    });

    return orden;
  }

  async findAll(empresaId: string, query: QueryOrdenCompraDto) {
    const { page = 1, limit = 10, search, estado, proveedorId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { empresaId };

    if (estado) {
      where.estado = estado;
    }

    if (proveedorId) {
      where.proveedorId = proveedorId;
    }

    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { proveedor: { razonSocial: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [ordenes, total] = await Promise.all([
      this.prisma.ordenCompra.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
          creador: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
            },
          },
        },
      }),
      this.prisma.ordenCompra.count({ where }),
    ]);

    return {
      data: ordenes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(empresaId: string, id: string) {
    const orden = await this.prisma.ordenCompra.findFirst({
      where: { id, empresaId },
      include: {
        proveedor: true,
        solicitud: {
          include: {
            solicitante: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
              },
            },
          },
        },
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        lineas: {
          include: {
            bienServicio: true,
          },
        },
        recepciones: {
          include: {
            recibidoPor: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
              },
            },
          },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    return orden;
  }

  async update(empresaId: string, id: string, dto: UpdateOrdenCompraDto) {
    // Verificar que existe
    await this.findOne(empresaId, id);

    const updateData: any = {
      estado: dto.estado,
      condicionesPago: dto.condicionesPago,
      fechaEmision: dto.fechaEmision ? new Date(dto.fechaEmision) : undefined,
      fechaEntregaEstimada: dto.fechaEntregaEstimada ? new Date(dto.fechaEntregaEstimada) : undefined,
      observaciones: dto.observaciones,
    };

    // Si se actualizan las líneas, recalcular totales
    if (dto.lineas) {
      await this.prisma.lineaOrden.deleteMany({
        where: { ordenId: id },
      });

      let subtotal = new Decimal(0);
      let impuestos = new Decimal(0);

      const lineasConTotales = dto.lineas.map((linea) => {
        const cantidad = new Decimal(linea.cantidad);
        const precioUnitario = new Decimal(linea.precioUnitario);
        const descuento = new Decimal(linea.descuento || 0);

        const subtotalLinea = cantidad.mul(precioUnitario);
        const descuentoLinea = subtotalLinea.mul(descuento).div(100);
        const baseImponible = subtotalLinea.sub(descuentoLinea);

        subtotal = subtotal.add(baseImponible);

        return {
          bienServicioId: linea.bienServicioId,
          cantidad: linea.cantidad,
          unidadMedida: linea.unidadMedida,
          precioUnitario: linea.precioUnitario,
          descuento: linea.descuento || 0,
          subtotal: baseImponible,
        };
      });

      impuestos = subtotal.mul(0.19);
      const total = subtotal.add(impuestos);

      updateData.subtotal = subtotal;
      updateData.impuestos = impuestos;
      updateData.total = total;
      updateData.lineas = {
        create: lineasConTotales,
      };
    }

    const updated = await this.prisma.ordenCompra.update({
      where: { id },
      data: updateData,
      include: {
        proveedor: true,
        solicitud: true,
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },
        lineas: {
          include: {
            bienServicio: true,
          },
        },
      },
    });

    return updated;
  }

  async emitir(empresaId: string, id: string) {
    const orden = await this.findOne(empresaId, id);

    if (orden.estado !== 'borrador') {
      throw new BadRequestException('Solo se pueden emitir órdenes en estado borrador');
    }

    const updated = await this.prisma.ordenCompra.update({
      where: { id },
      data: {
        estado: 'emitida',
        fechaEmision: new Date(),
      },
      include: {
        proveedor: true,
        solicitud: true,
        lineas: {
          include: {
            bienServicio: true,
          },
        },
      },
    });

    return updated;
  }

  async enviarProveedor(empresaId: string, id: string) {
    const orden = await this.findOne(empresaId, id);

    if (orden.estado !== 'emitida') {
      throw new BadRequestException('Solo se pueden enviar órdenes emitidas');
    }

    const updated = await this.prisma.ordenCompra.update({
      where: { id },
      data: {
        estado: 'enviada_proveedor',
      },
      include: {
        proveedor: true,
        solicitud: true,
        lineas: {
          include: {
            bienServicio: true,
          },
        },
      },
    });

    return updated;
  }

  async cancelar(empresaId: string, id: string, motivo: string) {
    const orden = await this.findOne(empresaId, id);

    if (['recibida', 'cerrada', 'cancelada'].includes(orden.estado)) {
      throw new BadRequestException('No se puede cancelar una orden en este estado');
    }

    const updated = await this.prisma.ordenCompra.update({
      where: { id },
      data: {
        estado: 'cancelada',
        observaciones: `${orden.observaciones || ''}\n\nCANCELADA: ${motivo}`,
      },
      include: {
        proveedor: true,
        solicitud: true,
        lineas: {
          include: {
            bienServicio: true,
          },
        },
      },
    });

    return updated;
  }

  async remove(empresaId: string, id: string) {
    const orden = await this.findOne(empresaId, id);

    if (orden.estado !== 'borrador') {
      throw new BadRequestException('Solo se pueden eliminar órdenes en estado borrador');
    }

    await this.prisma.ordenCompra.delete({
      where: { id },
    });

    return { message: 'Orden de compra eliminada exitosamente' };
  }
}
