import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductoDto, UpdateProductoDto, CatalogQueryDto } from '../dto';

@Injectable()
export class CatalogService {

  constructor(private readonly prisma: PrismaService) {}

  async findAllProducts(empresaId: string, query: CatalogQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      categoriaId,
      marca,
      destacado,
      nuevo,
      enOferta,
      precioMin,
      precioMax,
      sortBy = 'ordenVisualizacion',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      visibleCatalogo: true,
      bienServicio: {
        activo: true,
      },
      OR: [
        {
          empresas: {
            some: {
              empresaId,
              habilitado: true,
            },
          },
        },
        {
          empresas: {
            none: {},
          },
        },
      ],
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { nombreCorto: { contains: search, mode: 'insensitive' } },
            { descripcionCorta: { contains: search, mode: 'insensitive' } },
            { descripcionLarga: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { marca: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (categoriaId) {
      where.bienServicio = {
        ...where.bienServicio,
        categoriaId,
      };
    }

    if (marca) {
      where.marca = marca;
    }

    if (destacado !== undefined) {
      where.destacado = destacado;
    }

    if (nuevo !== undefined) {
      where.nuevo = nuevo;
    }

    if (enOferta !== undefined) {
      where.enOferta = enOferta;
    }

    if (precioMin !== undefined || precioMax !== undefined) {
      where.precioReferencial = {};
      if (precioMin !== undefined) {
        where.precioReferencial.gte = precioMin;
      }
      if (precioMax !== undefined) {
        where.precioReferencial.lte = precioMax;
      }
    }

    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          bienServicio: {
            include: {
              categoria: true,
            },
          },
          proveedores: {
            where: {
              activo: true,
              vigenciaDesde: { lte: new Date() },
              OR: [
                { vigenciaHasta: null },
                { vigenciaHasta: { gte: new Date() } },
              ],
            },
            include: {
              proveedor: {
                select: {
                  id: true,
                  razonSocial: true,
                  nit: true,
                },
              },
            },
            orderBy: [
              { preferido: 'desc' },
              { precioNegociado: 'asc' },
            ],
            take: 3,
          },
          _count: {
            select: {
              proveedores: true,
            },
          },
        },
      }),
      this.prisma.producto.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: productos,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findProductBySlug(slug: string, empresaId: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { slug },
      include: {
        bienServicio: {
          include: {
            categoria: true,
          },
        },
        proveedores: {
          where: {
            activo: true,
            vigenciaDesde: { lte: new Date() },
            OR: [
              { vigenciaHasta: null },
              { vigenciaHasta: { gte: new Date() } },
            ],
          },
          include: {
            proveedor: {
              select: {
                id: true,
                razonSocial: true,
                nit: true,
                telefono: true,
                emailCorporativo: true,
              },
            },
          },
          orderBy: [
            { preferido: 'desc' },
            { precioNegociado: 'asc' },
          ],
        },
        empresas: {
          where: {
            empresaId,
          },
        },
      },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con slug "${slug}" no encontrado`);
    }

    if (!producto.visibleCatalogo || !producto.bienServicio.activo) {
      throw new NotFoundException(`Producto no disponible`);
    }

    const empresaConfig = producto.empresas[0];
    const isAvailableForCompany = empresaConfig?.habilitado !== false;

    if (!isAvailableForCompany && producto.empresas.length > 0) {
      throw new BadRequestException(`Producto no habilitado para esta empresa`);
    }

    return {
      ...producto,
      empresaConfig,
    };
  }

  async findProductById(id: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        bienServicio: {
          include: {
            categoria: true,
          },
        },
        proveedores: {
          where: { activo: true },
          include: {
            proveedor: true,
          },
        },
      },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID "${id}" no encontrado`);
    }

    return producto;
  }

  async createProduct(data: CreateProductoDto) {
    const bienServicio = await this.prisma.bienServicio.findUnique({
      where: { id: data.bienServicioId },
    });

    if (!bienServicio) {
      throw new NotFoundException(`Bien/Servicio no encontrado`);
    }

    const existingSku = await this.prisma.producto.findUnique({
      where: { sku: data.sku },
    });

    if (existingSku) {
      throw new BadRequestException(`SKU "${data.sku}" ya existe`);
    }

    const existingSlug = await this.prisma.producto.findUnique({
      where: { slug: data.slug },
    });

    if (existingSlug) {
      throw new BadRequestException(`Slug "${data.slug}" ya existe`);
    }

    return this.prisma.producto.create({
      data,
      include: {
        bienServicio: {
          include: {
            categoria: true,
          },
        },
      },
    });
  }

  async updateProduct(id: string, data: UpdateProductoDto) {
    const producto = await this.findProductById(id);

    if (data.sku && data.sku !== producto.sku) {
      const existingSku = await this.prisma.producto.findUnique({
        where: { sku: data.sku },
      });
      if (existingSku) {
        throw new BadRequestException(`SKU "${data.sku}" ya existe`);
      }
    }

    if (data.slug && data.slug !== producto.slug) {
      const existingSlug = await this.prisma.producto.findUnique({
        where: { slug: data.slug },
      });
      if (existingSlug) {
        throw new BadRequestException(`Slug "${data.slug}" ya existe`);
      }
    }

    return this.prisma.producto.update({
      where: { id },
      data,
      include: {
        bienServicio: {
          include: {
            categoria: true,
          },
        },
      },
    });
  }

  async deleteProduct(id: string) {
    await this.findProductById(id);

    return this.prisma.producto.delete({
      where: { id },
    });
  }

  async getCategorias() {
    return this.prisma.categoria.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: {
            bienes: true,
          },
        },
      },
    });
  }

  async getMarcas() {
    const productos = await this.prisma.producto.findMany({
      where: {
        visibleCatalogo: true,
        marca: { not: null },
      },
      select: {
        marca: true,
      },
      distinct: ['marca'],
      orderBy: {
        marca: 'asc',
      },
    });

    return productos.map((p) => p.marca).filter(Boolean);
  }
}
