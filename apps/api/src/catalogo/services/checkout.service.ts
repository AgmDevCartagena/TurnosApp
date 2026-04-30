import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CheckoutDto } from '../dto';
import { CartService } from './cart.service';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  async convertCartToRequisition(
    usuarioId: string,
    empresaId: string,
    checkoutData: CheckoutDto,
  ) {
    const carrito = await this.cartService.getOrCreateCart(usuarioId, empresaId);

    if (!carrito.items || carrito.items.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    const centroCosto = await this.prisma.centroCosto.findUnique({
      where: { id: checkoutData.centroCostoId },
    });

    if (!centroCosto) {
      throw new NotFoundException('Centro de costo no encontrado');
    }

    if (centroCosto.empresaId !== empresaId) {
      throw new BadRequestException('Centro de costo no pertenece a la empresa activa');
    }

    const numero = await this.generateSolicitudNumber();

    const totalEstimado = carrito.items.reduce((sum: number, item: any) => {
      return sum + Number(item.precioUnitario) * item.cantidad;
    }, 0);

    const solicitud = await this.prisma.solicitudCompra.create({
      data: {
        numero,
        titulo: checkoutData.titulo || `Solicitud desde catálogo - ${new Date().toLocaleDateString()}`,
        empresaId,
        solicitanteId: usuarioId,
        estado: 'borrador',
        prioridad: checkoutData.prioridad,
        centroCostoId: checkoutData.centroCostoId,
        justificacion: checkoutData.justificacion,
        descripcion: checkoutData.observaciones,
        totalEstimado,
        fechaRequerida: checkoutData.fechaRequerida ? new Date(checkoutData.fechaRequerida) : null,
        lineas: {
          create: carrito.items.map((item: any) => ({
            bienServicioId: item.producto.bienServicioId,
            descripcion: item.producto.nombreCorto,
            cantidad: item.cantidad,
            unidadMedida: item.producto.bienServicio.unidadMedida,
            especificaciones: item.observaciones || item.producto.descripcionCorta,
            precioEstimado: item.precioUnitario,
          })),
        },
      },
      include: {
        lineas: {
          include: {
            bienServicio: {
              include: {
                categoria: true,
              },
            },
          },
        },
        centroCosto: true,
        solicitante: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    });

    await this.prisma.carrito.update({
      where: { id: carrito.id },
      data: { estado: 'convertido' },
    });

    this.logger.log(
      `Carrito ${carrito.id} convertido a solicitud ${solicitud.numero} por usuario ${usuarioId}`,
    );

    return {
      solicitud,
      message: 'Solicitud creada exitosamente desde el carrito',
    };
  }

  private async generateSolicitudNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SOL-${year}-`;

    const lastSolicitud = await this.prisma.solicitudCompra.findFirst({
      where: {
        numero: {
          startsWith: prefix,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastSolicitud) {
      const lastNumber = parseInt(lastSolicitud.numero.split('-')[2] || '0');
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
  }

  async validateCheckout(usuarioId: string, empresaId: string) {
    const carrito = await this.cartService.getOrCreateCart(usuarioId, empresaId);

    if (!carrito.items || carrito.items.length === 0) {
      return {
        valid: false,
        errors: ['El carrito está vacío'],
      };
    }

    const errors: string[] = [];

    for (const item of carrito.items) {
      if (!item.producto.visibleCatalogo || !item.producto.bienServicio.activo) {
        errors.push(`El producto "${item.producto.nombreCorto}" ya no está disponible`);
      }

      const empresaConfig = await this.prisma.productoEmpresa.findFirst({
        where: {
          productoId: item.productoId,
          empresaId,
        },
      });

      if (empresaConfig && !empresaConfig.habilitado) {
        errors.push(`El producto "${item.producto.nombreCorto}" no está habilitado para tu empresa`);
      }

      if (empresaConfig?.cantidadMaxima && item.cantidad > empresaConfig.cantidadMaxima) {
        errors.push(
          `La cantidad de "${item.producto.nombreCorto}" excede el máximo permitido (${empresaConfig.cantidadMaxima})`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      itemsCount: carrito.items.length,
      subtotal: carrito.subtotal,
    };
  }
}
