import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AddToCartDto, UpdateCartItemDto } from '../dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCart(usuarioId: string, empresaId: string) {
    let carrito = await this.prisma.carrito.findFirst({
      where: {
        usuarioId,
        empresaId,
        estado: 'activo',
      },
      include: {
        items: {
          include: {
            producto: {
              include: {
                bienServicio: {
                  include: {
                    categoria: true,
                  },
                },
              },
            },
            proveedor: {
              select: {
                id: true,
                razonSocial: true,
                nit: true,
              },
            },
          },
        },
      },
    });

    if (!carrito) {
      carrito = await this.prisma.carrito.create({
        data: {
          usuarioId,
          empresaId,
          estado: 'activo',
        },
        include: {
          items: {
            include: {
              producto: {
                include: {
                  bienServicio: {
                    include: {
                      categoria: true,
                    },
                  },
                },
              },
              proveedor: {
                select: {
                  id: true,
                  razonSocial: true,
                  nit: true,
                },
              },
            },
          },
        },
      });
    }

    const subtotal = carrito.items.reduce((sum, item) => {
      return sum + Number(item.precioUnitario) * item.cantidad;
    }, 0);

    return {
      ...carrito,
      subtotal,
      itemsCount: carrito.items.length,
    };
  }

  async addToCart(usuarioId: string, empresaId: string, data: AddToCartDto) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: data.productoId },
      include: {
        bienServicio: true,
        proveedores: {
          where: {
            activo: true,
            vigenciaDesde: { lte: new Date() },
            OR: [
              { vigenciaHasta: null },
              { vigenciaHasta: { gte: new Date() } },
            ],
          },
          orderBy: [
            { preferido: 'desc' },
            { precioNegociado: 'asc' },
          ],
          take: 1,
        },
        empresas: {
          where: { empresaId },
        },
      },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (!producto.visibleCatalogo || !producto.bienServicio.activo) {
      throw new BadRequestException('Producto no disponible');
    }

    const empresaConfig = producto.empresas[0];
    if (empresaConfig && !empresaConfig.habilitado) {
      throw new BadRequestException('Producto no habilitado para esta empresa');
    }

    if (empresaConfig?.cantidadMaxima && data.cantidad > empresaConfig.cantidadMaxima) {
      throw new BadRequestException(
        `Cantidad máxima permitida: ${empresaConfig.cantidadMaxima}`,
      );
    }

    let proveedorId = data.proveedorId;
    let precioUnitario = producto.precioReferencial || 0;

    if (!proveedorId && producto.proveedores.length > 0) {
      proveedorId = producto.proveedores[0]?.proveedorId;
      precioUnitario = producto.proveedores[0]?.precioNegociado || producto.precioReferencial || 0;
    } else if (proveedorId) {
      const proveedorProducto = producto.proveedores.find(
        (pp) => pp.proveedorId === proveedorId,
      );
      if (proveedorProducto) {
        precioUnitario = proveedorProducto.precioNegociado;
      }
    }

    const carrito = await this.getOrCreateCart(usuarioId, empresaId);

    const existingItem = carrito.items.find(
      (item) =>
        item.productoId === data.productoId &&
        item.proveedorId === proveedorId,
    );

    if (existingItem) {
      const newCantidad = existingItem.cantidad + data.cantidad;

      if (empresaConfig?.cantidadMaxima && newCantidad > empresaConfig.cantidadMaxima) {
        throw new BadRequestException(
          `Cantidad máxima permitida: ${empresaConfig.cantidadMaxima}`,
        );
      }

      await this.prisma.itemCarrito.update({
        where: { id: existingItem.id },
        data: {
          cantidad: newCantidad,
          observaciones: data.observaciones || existingItem.observaciones,
        },
      });
    } else {
      await this.prisma.itemCarrito.create({
        data: {
          carritoId: carrito.id,
          productoId: data.productoId,
          proveedorId,
          cantidad: data.cantidad,
          precioUnitario,
          observaciones: data.observaciones,
        },
      });
    }

    return this.getOrCreateCart(usuarioId, empresaId);
  }

  async updateCartItem(
    usuarioId: string,
    empresaId: string,
    itemId: string,
    data: UpdateCartItemDto,
  ) {
    const item = await this.prisma.itemCarrito.findUnique({
      where: { id: itemId },
      include: {
        carrito: true,
        producto: {
          include: {
            empresas: {
              where: { empresaId },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item no encontrado en el carrito');
    }

    if (item.carrito.usuarioId !== usuarioId || item.carrito.empresaId !== empresaId) {
      throw new BadRequestException('No tienes permiso para modificar este item');
    }

    if (data.cantidad) {
      const empresaConfig = item.producto.empresas[0];
      if (empresaConfig?.cantidadMaxima && data.cantidad > empresaConfig.cantidadMaxima) {
        throw new BadRequestException(
          `Cantidad máxima permitida: ${empresaConfig.cantidadMaxima}`,
        );
      }
    }

    await this.prisma.itemCarrito.update({
      where: { id: itemId },
      data,
    });

    return this.getOrCreateCart(usuarioId, empresaId);
  }

  async removeCartItem(usuarioId: string, empresaId: string, itemId: string) {
    const item = await this.prisma.itemCarrito.findUnique({
      where: { id: itemId },
      include: {
        carrito: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Item no encontrado en el carrito');
    }

    if (item.carrito.usuarioId !== usuarioId || item.carrito.empresaId !== empresaId) {
      throw new BadRequestException('No tienes permiso para eliminar este item');
    }

    await this.prisma.itemCarrito.delete({
      where: { id: itemId },
    });

    return this.getOrCreateCart(usuarioId, empresaId);
  }

  async clearCart(usuarioId: string, empresaId: string) {
    const carrito = await this.prisma.carrito.findFirst({
      where: {
        usuarioId,
        empresaId,
        estado: 'activo',
      },
    });

    if (carrito) {
      await this.prisma.itemCarrito.deleteMany({
        where: { carritoId: carrito.id },
      });
    }

    return this.getOrCreateCart(usuarioId, empresaId);
  }
}
