import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import {
  CreateUsuarioDto,
  UpdateUsuarioDto,
  CreateRolDto,
  UpdateRolDto,
  UsuarioQueryDto,
  PaginationQueryDto,
} from './dto';

@Injectable()
export class AdministracionService {
  private readonly logger = new Logger(AdministracionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════
  // USUARIOS
  // ═══════════════════════════════════════

  async findAllUsuarios(query: UsuarioQueryDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', search, rolId, activo } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { apellido: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (rolId) {
      where.rolId = rolId;
    }

    if (activo !== undefined) {
      where.activo = activo;
    }

    const [usuarios, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          nombre: true,
          apellido: true,
          activo: true,
          createdAt: true,
          updatedAt: true,
          rol: {
            select: { id: true, nombre: true, descripcion: true },
          },
        },
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return {
      data: usuarios,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneUsuario(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        rol: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            permisos: {
              select: {
                permiso: { select: { id: true, recurso: true, accion: true } },
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    return usuario;
  }

  async createUsuario(dto: CreateUsuarioDto) {
    const existing = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const rol = await this.prisma.rol.findUnique({ where: { id: dto.rolId } });
    if (!rol) {
      throw new NotFoundException(`Rol con id ${dto.rolId} no encontrado`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        nombre: dto.nombre,
        apellido: dto.apellido,
        rolId: dto.rolId,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        activo: true,
        createdAt: true,
        rol: { select: { id: true, nombre: true } },
      },
    });

    this.logger.log(`Usuario creado: ${usuario.email}`);
    return usuario;
  }

  async updateUsuario(id: string, dto: UpdateUsuarioDto) {
    await this.findOneUsuario(id);

    if (dto.email) {
      const existing = await this.prisma.usuario.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('El email ya está en uso');
      }
    }

    if (dto.rolId) {
      const rol = await this.prisma.rol.findUnique({ where: { id: dto.rolId } });
      if (!rol) {
        throw new NotFoundException(`Rol con id ${dto.rolId} no encontrado`);
      }
    }

    const data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const usuario = await this.prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        activo: true,
        updatedAt: true,
        rol: { select: { id: true, nombre: true } },
      },
    });

    this.logger.log(`Usuario actualizado: ${usuario.email}`);
    return usuario;
  }

  async deleteUsuario(id: string) {
    await this.findOneUsuario(id);

    await this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });

    this.logger.log(`Usuario desactivado: ${id}`);
    return { message: 'Usuario desactivado exitosamente' };
  }

  // ═══════════════════════════════════════
  // ROLES
  // ═══════════════════════════════════════

  async findAllRoles(query: PaginationQueryDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const [roles, total] = await Promise.all([
      this.prisma.rol.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { usuarios: true } },
          permisos: {
            select: {
              permiso: { select: { id: true, recurso: true, accion: true } },
            },
          },
        },
      }),
      this.prisma.rol.count(),
    ]);

    return {
      data: roles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneRol(id: string) {
    const rol = await this.prisma.rol.findUnique({
      where: { id },
      include: {
        _count: { select: { usuarios: true } },
        permisos: {
          select: {
            permiso: { select: { id: true, recurso: true, accion: true } },
          },
        },
      },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con id ${id} no encontrado`);
    }

    return rol;
  }

  async createRol(dto: CreateRolDto) {
    const existing = await this.prisma.rol.findUnique({
      where: { nombre: dto.nombre },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un rol con nombre "${dto.nombre}"`);
    }

    const rol = await this.prisma.rol.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        permisos: dto.permisoIds
          ? {
              create: dto.permisoIds.map((permisoId) => ({
                permiso: { connect: { id: permisoId } },
              })),
            }
          : undefined,
      },
      include: {
        permisos: {
          select: {
            permiso: { select: { id: true, recurso: true, accion: true } },
          },
        },
      },
    });

    this.logger.log(`Rol creado: ${rol.nombre}`);
    return rol;
  }

  async updateRol(id: string, dto: UpdateRolDto) {
    await this.findOneRol(id);

    if (dto.nombre) {
      const existing = await this.prisma.rol.findFirst({
        where: { nombre: dto.nombre, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Ya existe un rol con nombre "${dto.nombre}"`);
      }
    }

    // Si se envían permisoIds, reemplazar todos los permisos
    if (dto.permisoIds !== undefined) {
      await this.prisma.permisoRol.deleteMany({ where: { rolId: id } });

      if (dto.permisoIds.length > 0) {
        await this.prisma.permisoRol.createMany({
          data: dto.permisoIds.map((permisoId) => ({
            rolId: id,
            permisoId,
          })),
        });
      }
    }

    const { permisoIds: _permisoIds, ...updateData } = dto;

    const rol = await this.prisma.rol.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { usuarios: true } },
        permisos: {
          select: {
            permiso: { select: { id: true, recurso: true, accion: true } },
          },
        },
      },
    });

    this.logger.log(`Rol actualizado: ${rol.nombre}`);
    return rol;
  }

  async deleteRol(id: string) {
    const rol = await this.findOneRol(id);

    if (rol._count.usuarios > 0) {
      throw new ConflictException(
        `No se puede eliminar el rol "${rol.nombre}" porque tiene ${rol._count.usuarios} usuarios asignados`,
      );
    }

    await this.prisma.permisoRol.deleteMany({ where: { rolId: id } });
    await this.prisma.rol.delete({ where: { id } });

    this.logger.log(`Rol eliminado: ${rol.nombre}`);
    return { message: 'Rol eliminado exitosamente' };
  }

  // ═══════════════════════════════════════
  // PERMISOS
  // ═══════════════════════════════════════

  async findAllPermisos() {
    return this.prisma.permiso.findMany({
      orderBy: [{ recurso: 'asc' }, { accion: 'asc' }],
    });
  }
}
