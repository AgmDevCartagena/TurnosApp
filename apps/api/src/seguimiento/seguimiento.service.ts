import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QuerySeguimientoDto } from './dto';

@Injectable()
export class SeguimientoService {
  constructor(private readonly prisma: PrismaService) {}

  async consultarSolicitudes(empresaId: string, query: QuerySeguimientoDto) {
    const {
      page = 1,
      limit = 10,
      numeroSolicitud,
      fechaDesde,
      fechaHasta,
      solicitante,
      centroCosto,
      estado,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = { empresaId };

    if (numeroSolicitud) {
      where.id = { contains: numeroSolicitud, mode: 'insensitive' };
    }

    if (fechaDesde) {
      where.createdAt = { ...where.createdAt, gte: new Date(fechaDesde) };
    }

    if (fechaHasta) {
      where.createdAt = { ...where.createdAt, lte: new Date(fechaHasta) };
    }

    if (solicitante) {
      where.solicitanteId = solicitante;
    }

    if (centroCosto) {
      where.centroCostoId = centroCosto;
    }

    if (estado) {
      where.estado = estado;
    }

    const [solicitudes, total] = await Promise.all([
      this.prisma.solicitudCompra.findMany({
        where,
        skip,
        take: limit,
        include: {
          solicitante: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
            },
          },
          centroCosto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
            },
          },
          flujoAprobacion: {
            include: {
              pasos: {
                include: {
                  aprobador: {
                    select: {
                      id: true,
                      nombre: true,
                      apellido: true,
                    },
                  },
                },
                orderBy: {
                  orden: 'asc',
                },
              },
            },
          },
          cotizaciones: {
            select: {
              id: true,
              numero: true,
              proveedor: {
                select: {
                  razonSocial: true,
                },
              },
              seleccionada: true,
            },
          },
          ordenes: {
            select: {
              id: true,
              numero: true,
              estado: true,
              proveedor: {
                select: {
                  razonSocial: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.solicitudCompra.count({ where }),
    ]);

    // Enriquecer con información de etapa
    const solicitudesConEtapa = solicitudes.map((solicitud) => {
      let etapa = 'Solicitud creada';
      
      if (solicitud.estado === 'borrador') {
        etapa = 'Borrador';
      } else if (solicitud.estado === 'enviada') {
        etapa = 'Enviada';
      } else if (solicitud.estado === 'en_aprobacion') {
        const pasoActual = solicitud.flujoAprobacion?.pasos.find(p => p.estado === 'pendiente');
        if (pasoActual) {
          etapa = `Aprobación: ${pasoActual.aprobador.nombre} ${pasoActual.aprobador.apellido}`;
        } else {
          etapa = 'En aprobación';
        }
      } else if (solicitud.estado === 'aprobada') {
        const cotizacionSeleccionada = solicitud.cotizaciones.find(c => c.seleccionada);
        if (cotizacionSeleccionada) {
          etapa = 'Cotización seleccionada';
        } else if (solicitud.cotizaciones.length > 0) {
          etapa = 'Cotización';
        } else {
          etapa = 'Aprobada';
        }
      } else if (solicitud.estado === 'rechazada') {
        etapa = 'Rechazada';
      } else if (solicitud.estado === 'cancelada') {
        etapa = 'Cancelada';
      }

      // Si tiene orden de compra
      if (solicitud.ordenes.length > 0) {
        const orden = solicitud.ordenes[0];
        if (orden && (orden.estado === 'recibida' || orden.estado === 'cerrada')) {
          etapa = 'Orden cumplida';
        } else if (orden && orden.estado === 'enviada_proveedor') {
          etapa = 'En tránsito';
        } else {
          etapa = 'Orden de compra';
        }
      }

      return {
        ...solicitud,
        etapa,
      };
    });

    return {
      data: solicitudesConEtapa,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async obtenerDetalleSeguimiento(empresaId: string, solicitudId: string) {
    const solicitud = await this.prisma.solicitudCompra.findFirst({
      where: {
        id: solicitudId,
        empresaId,
      },
      include: {
        solicitante: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        centroCosto: true,
        lineas: {
          include: {
            bienServicio: true,
          },
        },
        flujoAprobacion: {
          include: {
            pasos: {
              include: {
                aprobador: {
                  select: {
                    id: true,
                    nombre: true,
                    apellido: true,
                    email: true,
                  },
                },
              },
              orderBy: {
                orden: 'asc',
              },
            },
          },
        },
        cotizaciones: {
          include: {
            proveedor: {
              select: {
                id: true,
                razonSocial: true,
                nit: true,
              },
            },
          },
        },
        ordenes: {
          include: {
            proveedor: {
              select: {
                id: true,
                razonSocial: true,
                nit: true,
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
        },
      },
    });

    if (!solicitud) {
      throw new Error('Solicitud no encontrada');
    }

    return solicitud;
  }
}
