import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCotizacionDto, UpdateCotizacionDto, QueryCotizacionDto } from './dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CotizacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, dto: CreateCotizacionDto) {
    // Verificar que la solicitud existe y pertenece a la empresa
    const solicitud = await this.prisma.solicitudCompra.findFirst({
      where: {
        id: dto.solicitudId,
        empresaId,
      },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Verificar que el proveedor existe
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: dto.proveedorId },
    });

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    // Generar número de cotización
    const count = await this.prisma.cotizacion.count({
      where: { empresaId },
    });
    const numero = `COT-${String(count + 1).padStart(6, '0')}`;

    // Calcular totales de las líneas
    let subtotal = new Decimal(0);
    let impuestosTotal = new Decimal(0);
    let descuentoTotal = new Decimal(0);

    const lineasConTotales = dto.lineas.map((linea) => {
      const cantidad = new Decimal(linea.cantidad);
      const precioUnitario = new Decimal(linea.precioUnitario);
      const descuento = new Decimal(linea.descuento || 0);
      const impuesto = new Decimal(linea.impuesto || 0);

      const subtotalLinea = cantidad.mul(precioUnitario);
      const descuentoLinea = subtotalLinea.mul(descuento).div(100);
      const baseImponible = subtotalLinea.sub(descuentoLinea);
      const impuestoLinea = baseImponible.mul(impuesto).div(100);
      const totalLinea = baseImponible.add(impuestoLinea);

      subtotal = subtotal.add(subtotalLinea);
      descuentoTotal = descuentoTotal.add(descuentoLinea);
      impuestosTotal = impuestosTotal.add(impuestoLinea);

      return {
        ...linea,
        total: totalLinea,
      };
    });

    const total = subtotal.sub(descuentoTotal).add(impuestosTotal);

    // Crear cotización con líneas
    const cotizacion = await this.prisma.cotizacion.create({
      data: {
        numero,
        empresaId,
        solicitudId: dto.solicitudId,
        proveedorId: dto.proveedorId,
        estado: dto.estado || 'borrador',
        fechaSolicitud: dto.fechaSolicitud ? new Date(dto.fechaSolicitud) : null,
        fechaRespuesta: dto.fechaRespuesta ? new Date(dto.fechaRespuesta) : null,
        fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
        tiempoEntrega: dto.tiempoEntrega,
        condicionesPago: dto.condicionesPago,
        garantia: dto.garantia,
        validezOferta: dto.validezOferta,
        observaciones: dto.observaciones,
        moneda: dto.moneda || 'COP',
        calificacion: dto.calificacion ? new Decimal(dto.calificacion) : null,
        historico: dto.historico || 0,
        documentoAdjunto: dto.documentoAdjunto,
        seleccionada: dto.seleccionada || false,
        motivoRechazo: dto.motivoRechazo,
        subtotal,
        impuestos: impuestosTotal,
        descuento: descuentoTotal,
        total,
        lineas: {
          create: lineasConTotales,
        },
      },
      include: {
        proveedor: true,
        solicitud: true,
        lineas: true,
      },
    });

    return cotizacion;
  }

  async findAll(empresaId: string, query: QueryCotizacionDto) {
    const { page = 1, limit = 10, search, estado, solicitudId, proveedorId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { empresaId };

    if (estado) {
      where.estado = estado;
    }

    if (solicitudId) {
      where.solicitudId = solicitudId;
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

    const [cotizaciones, total] = await Promise.all([
      this.prisma.cotizacion.findMany({
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
              emailCorporativo: true,
            },
          },
          solicitud: {
            select: {
              id: true,
              descripcion: true,
              estado: true,
            },
          },
          lineas: true,
        },
      }),
      this.prisma.cotizacion.count({ where }),
    ]);

    return {
      data: cotizaciones,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(empresaId: string, id: string) {
    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: { id, empresaId },
      include: {
        proveedor: true,
        solicitud: {
          include: {
            lineas: true,
          },
        },
        lineas: {
          include: {
            lineaSolicitud: true,
          },
        },
      },
    });

    if (!cotizacion) {
      throw new NotFoundException('Cotización no encontrada');
    }

    return cotizacion;
  }

  async findBySolicitud(empresaId: string, solicitudId: string) {
    const cotizaciones = await this.prisma.cotizacion.findMany({
      where: {
        empresaId,
        solicitudId,
      },
      include: {
        proveedor: {
          select: {
            id: true,
            razonSocial: true,
            nit: true,
            emailCorporativo: true,
            telefono: true,
          },
        },
        lineas: true,
      },
      orderBy: {
        total: 'asc',
      },
    });

    return cotizaciones;
  }

  async update(empresaId: string, id: string, dto: UpdateCotizacionDto) {
    // Verificar que existe
    await this.findOne(empresaId, id);

    // Recalcular totales si se actualizan las líneas
    let updateData: any = {
      estado: dto.estado,
      fechaSolicitud: dto.fechaSolicitud ? new Date(dto.fechaSolicitud) : undefined,
      fechaRespuesta: dto.fechaRespuesta ? new Date(dto.fechaRespuesta) : undefined,
      fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : undefined,
      tiempoEntrega: dto.tiempoEntrega,
      condicionesPago: dto.condicionesPago,
      garantia: dto.garantia,
      validezOferta: dto.validezOferta,
      observaciones: dto.observaciones,
      calificacion: dto.calificacion ? new Decimal(dto.calificacion) : undefined,
      historico: dto.historico,
      documentoAdjunto: dto.documentoAdjunto,
      seleccionada: dto.seleccionada,
      motivoRechazo: dto.motivoRechazo,
    };

    if (dto.lineas) {
      // Eliminar líneas existentes y crear nuevas
      await this.prisma.lineaCotizacion.deleteMany({
        where: { cotizacionId: id },
      });

      let subtotal = new Decimal(0);
      let impuestosTotal = new Decimal(0);
      let descuentoTotal = new Decimal(0);

      const lineasConTotales = dto.lineas.map((linea) => {
        const cantidad = new Decimal(linea.cantidad);
        const precioUnitario = new Decimal(linea.precioUnitario);
        const descuento = new Decimal(linea.descuento || 0);
        const impuesto = new Decimal(linea.impuesto || 0);

        const subtotalLinea = cantidad.mul(precioUnitario);
        const descuentoLinea = subtotalLinea.mul(descuento).div(100);
        const baseImponible = subtotalLinea.sub(descuentoLinea);
        const impuestoLinea = baseImponible.mul(impuesto).div(100);
        const totalLinea = baseImponible.add(impuestoLinea);

        subtotal = subtotal.add(subtotalLinea);
        descuentoTotal = descuentoTotal.add(descuentoLinea);
        impuestosTotal = impuestosTotal.add(impuestoLinea);

        return {
          ...linea,
          total: totalLinea,
        };
      });

      const total = subtotal.sub(descuentoTotal).add(impuestosTotal);

      updateData = {
        ...updateData,
        subtotal,
        impuestos: impuestosTotal,
        descuento: descuentoTotal,
        total,
        lineas: {
          create: lineasConTotales,
        },
      };
    }

    const updated = await this.prisma.cotizacion.update({
      where: { id },
      data: updateData,
      include: {
        proveedor: true,
        solicitud: true,
        lineas: true,
      },
    });

    return updated;
  }

  async seleccionarCotizacion(empresaId: string, id: string) {
    const cotizacion = await this.findOne(empresaId, id);

    // Deseleccionar otras cotizaciones de la misma solicitud
    await this.prisma.cotizacion.updateMany({
      where: {
        solicitudId: cotizacion.solicitudId,
        id: { not: id },
      },
      data: {
        seleccionada: false,
      },
    });

    // Seleccionar esta cotización
    const updated = await this.prisma.cotizacion.update({
      where: { id },
      data: {
        seleccionada: true,
        estado: 'aceptada',
      },
      include: {
        proveedor: true,
        solicitud: true,
        lineas: true,
      },
    });

    return updated;
  }

  async rechazarCotizacion(empresaId: string, id: string, motivo: string) {
    // Verificar que existe
    await this.findOne(empresaId, id);

    const updated = await this.prisma.cotizacion.update({
      where: { id },
      data: {
        estado: 'rechazada',
        motivoRechazo: motivo,
      },
      include: {
        proveedor: true,
        solicitud: true,
        lineas: true,
      },
    });

    return updated;
  }

  async remove(empresaId: string, id: string) {
    // Verificar que existe
    await this.findOne(empresaId, id);

    await this.prisma.cotizacion.delete({
      where: { id },
    });

    return { message: 'Cotización eliminada exitosamente' };
  }
}
