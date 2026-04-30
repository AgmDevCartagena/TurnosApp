import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateFlujoAprobacionDto, AprobarRechazarDto, QueryAprobacionDto } from './dto';

@Injectable()
export class AprobacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async createFlujo(empresaId: string, dto: CreateFlujoAprobacionDto) {
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

    // Verificar que no existe ya un flujo para esta solicitud
    const flujoExistente = await this.prisma.flujoAprobacion.findUnique({
      where: { solicitudId: dto.solicitudId },
    });

    if (flujoExistente) {
      throw new BadRequestException('Ya existe un flujo de aprobación para esta solicitud');
    }

    // Verificar que todos los aprobadores existen
    const aprobadoresIds = dto.pasos.map(p => p.aprobadorId);
    const aprobadores = await this.prisma.usuario.findMany({
      where: { id: { in: aprobadoresIds } },
    });

    if (aprobadores.length !== aprobadoresIds.length) {
      throw new BadRequestException('Uno o más aprobadores no existen');
    }

    // Crear flujo con pasos
    const flujo = await this.prisma.flujoAprobacion.create({
      data: {
        solicitudId: dto.solicitudId,
        estadoActual: 'pendiente',
        pasos: {
          create: dto.pasos.map(paso => ({
            orden: paso.orden,
            aprobadorId: paso.aprobadorId,
            estado: 'pendiente',
          })),
        },
      },
      include: {
        solicitud: true,
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
    });

    // Actualizar estado de la solicitud
    await this.prisma.solicitudCompra.update({
      where: { id: dto.solicitudId },
      data: { estado: 'en_aprobacion' },
    });

    return flujo;
  }

  async findAll(empresaId: string, query: QueryAprobacionDto) {
    const { page = 1, limit = 10, estado, aprobadorId } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      solicitud: { empresaId },
    };

    if (estado) {
      where.estadoActual = estado;
    }

    if (aprobadorId) {
      where.pasos = {
        some: {
          aprobadorId,
          estado: 'pendiente',
        },
      };
    }

    const [flujos, total] = await Promise.all([
      this.prisma.flujoAprobacion.findMany({
        where,
        skip,
        take: limit,
        include: {
          solicitud: {
            select: {
              id: true,
              descripcion: true,
              totalEstimado: true,
              solicitante: {
                select: {
                  id: true,
                  nombre: true,
                  apellido: true,
                },
              },
            },
          },
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
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.flujoAprobacion.count({ where }),
    ]);

    return {
      data: flujos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(empresaId: string, id: string) {
    const flujo = await this.prisma.flujoAprobacion.findFirst({
      where: {
        id,
        solicitud: { empresaId },
      },
      include: {
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
            lineas: true,
          },
        },
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
    });

    if (!flujo) {
      throw new NotFoundException('Flujo de aprobación no encontrado');
    }

    return flujo;
  }

  async findBySolicitud(empresaId: string, solicitudId: string) {
    const flujo = await this.prisma.flujoAprobacion.findFirst({
      where: {
        solicitudId,
        solicitud: { empresaId },
      },
      include: {
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
    });

    return flujo;
  }

  async getPendientesByAprobador(empresaId: string, aprobadorId: string, query: QueryAprobacionDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [flujos, total] = await Promise.all([
      this.prisma.flujoAprobacion.findMany({
        where: {
          solicitud: { empresaId },
          pasos: {
            some: {
              aprobadorId,
              estado: 'pendiente',
            },
          },
        },
        skip,
        take: limit,
        include: {
          solicitud: {
            select: {
              id: true,
              descripcion: true,
              totalEstimado: true,
              prioridad: true,
              solicitante: {
                select: {
                  id: true,
                  nombre: true,
                  apellido: true,
                },
              },
            },
          },
          pasos: {
            where: {
              aprobadorId,
            },
            include: {
              aprobador: {
                select: {
                  id: true,
                  nombre: true,
                  apellido: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.flujoAprobacion.count({
        where: {
          solicitud: { empresaId },
          pasos: {
            some: {
              aprobadorId,
              estado: 'pendiente',
            },
          },
        },
      }),
    ]);

    return {
      data: flujos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async aprobar(empresaId: string, pasoId: string, usuarioId: string, dto: AprobarRechazarDto) {
    // Obtener el paso con el flujo
    const paso = await this.prisma.pasoAprobacion.findFirst({
      where: {
        id: pasoId,
        flujo: {
          solicitud: { empresaId },
        },
      },
      include: {
        flujo: {
          include: {
            pasos: {
              orderBy: { orden: 'asc' },
            },
          },
        },
      },
    });

    if (!paso) {
      throw new NotFoundException('Paso de aprobación no encontrado');
    }

    // Verificar que el usuario es el aprobador
    if (paso.aprobadorId !== usuarioId) {
      throw new ForbiddenException('No tiene permisos para aprobar este paso');
    }

    // Verificar que el paso está pendiente
    if (paso.estado !== 'pendiente') {
      throw new BadRequestException('Este paso ya fue procesado');
    }

    // Verificar que es el paso actual (todos los anteriores están aprobados)
    const pasosAnteriores = paso.flujo.pasos.filter(p => p.orden < paso.orden);
    const todosAprobados = pasosAnteriores.every(p => p.estado === 'aprobada');

    if (!todosAprobados) {
      throw new BadRequestException('Hay pasos anteriores pendientes de aprobación');
    }

    // Aprobar el paso
    const pasoActualizado = await this.prisma.pasoAprobacion.update({
      where: { id: pasoId },
      data: {
        estado: 'aprobada',
        comentario: dto.comentario,
        fechaDecision: new Date(),
      },
    });

    // Verificar si es el último paso
    const esUltimoPaso = !paso.flujo.pasos.some(p => p.orden > paso.orden);

    if (esUltimoPaso) {
      // Actualizar flujo como aprobado
      await this.prisma.flujoAprobacion.update({
        where: { id: paso.flujoId },
        data: { estadoActual: 'aprobada' },
      });

      // Actualizar solicitud como aprobada
      await this.prisma.solicitudCompra.update({
        where: { id: paso.flujo.solicitudId },
        data: { estado: 'aprobada' },
      });
    }

    return pasoActualizado;
  }

  async rechazar(empresaId: string, pasoId: string, usuarioId: string, dto: AprobarRechazarDto) {
    // Obtener el paso con el flujo
    const paso = await this.prisma.pasoAprobacion.findFirst({
      where: {
        id: pasoId,
        flujo: {
          solicitud: { empresaId },
        },
      },
      include: {
        flujo: true,
      },
    });

    if (!paso) {
      throw new NotFoundException('Paso de aprobación no encontrado');
    }

    // Verificar que el usuario es el aprobador
    if (paso.aprobadorId !== usuarioId) {
      throw new ForbiddenException('No tiene permisos para rechazar este paso');
    }

    // Verificar que el paso está pendiente
    if (paso.estado !== 'pendiente') {
      throw new BadRequestException('Este paso ya fue procesado');
    }

    // Rechazar el paso
    const pasoActualizado = await this.prisma.pasoAprobacion.update({
      where: { id: pasoId },
      data: {
        estado: 'rechazada',
        comentario: dto.comentario || 'Rechazado',
        fechaDecision: new Date(),
      },
    });

    // Actualizar flujo como rechazado
    await this.prisma.flujoAprobacion.update({
      where: { id: paso.flujoId },
      data: { estadoActual: 'rechazada' },
    });

    // Actualizar solicitud como rechazada
    await this.prisma.solicitudCompra.update({
      where: { id: paso.flujo.solicitudId },
      data: { estado: 'rechazada' },
    });

    return pasoActualizado;
  }
}
