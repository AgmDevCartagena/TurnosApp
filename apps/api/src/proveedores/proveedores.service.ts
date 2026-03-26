import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProveedorDto, UpdateProveedorDto, ProveedorQueryDto } from './dto';

@Injectable()
export class ProveedoresService {
  private readonly logger = new Logger(ProveedoresService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProveedorQueryDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      estado,
      tipoProveedor,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { razonSocial: { contains: search, mode: 'insensitive' } },
        { nit: { contains: search, mode: 'insensitive' } },
        { emailCorporativo: { contains: search, mode: 'insensitive' } },
        { contacto: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (estado) {
      where.estado = estado;
    }

    if (tipoProveedor) {
      where.tipoProveedor = tipoProveedor;
    }

    const [proveedores, total] = await Promise.all([
      this.prisma.proveedor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          creadoPor: {
            select: { id: true, nombre: true, apellido: true },
          },
          _count: {
            select: {
              evaluaciones: true,
              ordenes: true,
              documentos: true,
            },
          },
        },
      }),
      this.prisma.proveedor.count({ where }),
    ]);

    return {
      data: proveedores,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id },
      include: {
        creadoPor: {
          select: { id: true, nombre: true, apellido: true },
        },
        evaluaciones: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            evaluaciones: true,
            ordenes: true,
            documentos: true,
          },
        },
      },
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }

    return proveedor;
  }

  async create(dto: CreateProveedorDto, userId?: string) {
    const existing = await this.prisma.proveedor.findUnique({
      where: { nit: dto.nit },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un proveedor con NIT ${dto.nit}`);
    }

    const proveedor = await this.prisma.proveedor.create({
      data: {
        ...dto,
        fechaConstitucion: dto.fechaConstitucion
          ? new Date(dto.fechaConstitucion)
          : undefined,
        creadoPorId: userId || undefined,
      },
      include: {
        creadoPor: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });

    this.logger.log(`Proveedor creado: ${proveedor.razonSocial} (${proveedor.nit})`);
    return proveedor;
  }

  async update(id: string, dto: UpdateProveedorDto) {
    await this.findOne(id);

    if (dto.nit) {
      const existing = await this.prisma.proveedor.findFirst({
        where: { nit: dto.nit, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Ya existe otro proveedor con NIT ${dto.nit}`);
      }
    }

    const proveedor = await this.prisma.proveedor.update({
      where: { id },
      data: {
        ...dto,
        fechaConstitucion: dto.fechaConstitucion
          ? new Date(dto.fechaConstitucion)
          : undefined,
      },
      include: {
        creadoPor: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });

    this.logger.log(`Proveedor actualizado: ${proveedor.razonSocial}`);
    return proveedor;
  }

  async remove(id: string) {
    await this.findOne(id);

    const proveedor = await this.prisma.proveedor.update({
      where: { id },
      data: { estado: 'inactivo' },
    });

    this.logger.log(`Proveedor desactivado: ${proveedor.razonSocial}`);
    return proveedor;
  }
}
