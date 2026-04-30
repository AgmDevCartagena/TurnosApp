import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import {
  CreateUsuarioDto,
  UpdateUsuarioDto,
  CreateRolDto,
  UpdateRolDto,
  CreateEmpresaDto,
  UpdateEmpresaDto,
  AsignarEmpresaUsuarioDto,
  CreateCentroCostoDto,
  UpdateCentroCostoDto,
  CreateAreaDto,
  UpdateAreaDto,
  CreatePermisoDto,
  UpdatePermisoDto,
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
        include: {
          rol: {
            select: { id: true, nombre: true, descripcion: true },
          },
          empresas: {
            select: {
              empresa: {
                select: { id: true, nombre: true },
              },
              rol: {
                select: { id: true, nombre: true },
              },
            },
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
                permiso: { select: { id: true, codigo: true, nombre: true, modulo: true, accion: true } },
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
    // Validar username único
    const existingUsername = await this.prisma.usuario.findUnique({
      where: { username: dto.username },
    });

    if (existingUsername) {
      throw new ConflictException('El nombre de usuario ya está registrado');
    }

    // Validar email único
    const existingEmail = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException('El email ya está registrado');
    }

    // Validar que la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: dto.empresaId },
    });

    if (!empresa) {
      throw new NotFoundException('La empresa especificada no existe');
    }

    // Validar que el rol existe
    const rol = await this.prisma.rol.findUnique({
      where: { id: dto.rolId },
    });

    if (!rol) {
      throw new NotFoundException('El rol especificado no existe');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Crear usuario con relación a empresa
    const usuario = await this.prisma.usuario.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        nombre: dto.nombre,
        apellido: dto.apellido,
        rolId: dto.rolId,
        empresas: {
          create: {
            empresaId: dto.empresaId,
            rolId: dto.rolId,
            activo: true,
          },
        },
      },
      include: {
        rol: {
          select: { id: true, nombre: true, descripcion: true },
        },
        empresas: {
          include: {
            empresa: {
              select: { id: true, nombre: true },
            },
            rol: {
              select: { id: true, nombre: true },
            },
          },
        },
      },
    });

    this.logger.log(`Usuario creado: ${usuario.username} (${usuario.email}) - Empresa: ${empresa.nombre}`);
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
          _count: { select: { usuariosEmpresas: true } },
          permisos: {
            select: {
              permiso: { select: { id: true, codigo: true, nombre: true, modulo: true, accion: true } },
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
        _count: { select: { usuariosEmpresas: true } },
        permisos: {
          select: {
            permiso: { select: { id: true, codigo: true, nombre: true, modulo: true, accion: true } },
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
        codigo: dto.nombre.toLowerCase().replace(/\s+/g, '_') as any,
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
            permiso: { select: { id: true, codigo: true, nombre: true, modulo: true, accion: true } },
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
        _count: { select: { usuariosEmpresas: true } },
        permisos: {
          select: {
            permiso: { select: { id: true, codigo: true, nombre: true, modulo: true, accion: true } },
          },
        },
      },
    });

    this.logger.log(`Rol actualizado: ${rol.nombre}`);
    return rol;
  }

  async deleteRol(id: string) {
    const rol = await this.findOneRol(id) as any;

    if (rol._count?.usuariosEmpresas > 0) {
      throw new ConflictException(
        `No se puede eliminar el rol "${rol.nombre}" porque tiene ${rol._count.usuariosEmpresas} usuarios asignados`,
      );
    }

    await this.prisma.permisoRol.deleteMany({ where: { rolId: id } });
    await this.prisma.rol.delete({ where: { id } });

    this.logger.log(`Rol eliminado: ${rol.nombre}`);
    return { message: 'Rol eliminado exitosamente' };
  }

  // ═══════════════════════════════════════
  // ═══════════════════════════════════════
  // PERMISOS
  // ═══════════════════════════════════════

  async findAllPermisos(params: {
    page?: number;
    limit?: number;
    search?: string;
    modulo?: string;
    activo?: boolean;
  } = {}) {
    const { page = 1, limit = 50, search, modulo, activo } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filtro por estado activo
    if (activo !== undefined) {
      where.activo = activo;
    }

    // Filtro por módulo
    if (modulo && modulo !== 'all') {
      where.modulo = modulo;
    }

    // Búsqueda por código, nombre o descripción
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { nombre: { contains: search, mode: 'insensitive' } },
        { modulo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [permisos, total] = await Promise.all([
      this.prisma.permiso.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ modulo: 'asc' }, { accion: 'asc' }],
        include: {
          _count: {
            select: { roles: true },
          },
        },
      }),
      this.prisma.permiso.count({ where }),
    ]);

    return {
      data: permisos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOnePermiso(id: string) {
    const permiso = await this.prisma.permiso.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            rol: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                activo: true,
              },
            },
          },
        },
        _count: {
          select: { roles: true },
        },
      },
    });

    if (!permiso) {
      throw new NotFoundException('Permiso no encontrado');
    }

    return permiso;
  }

  async createPermiso(dto: CreatePermisoDto) {
    // Validar que el código no exista
    const existingCodigo = await this.prisma.permiso.findUnique({
      where: { codigo: dto.codigo },
    });

    if (existingCodigo) {
      throw new ConflictException(`Ya existe un permiso con el código: ${dto.codigo}`);
    }

    // Validar que la combinación módulo + acción no exista
    const existingModuloAccion = await this.prisma.permiso.findFirst({
      where: {
        modulo: dto.modulo,
        accion: dto.accion,
      },
    });

    if (existingModuloAccion) {
      throw new ConflictException(
        `Ya existe un permiso para el módulo "${dto.modulo}" con la acción "${dto.accion}"`
      );
    }

    // Validar que el código coincida con módulo.acción
    const expectedCodigo = `${dto.modulo}.${dto.accion}`;
    if (dto.codigo !== expectedCodigo) {
      throw new BadRequestException(
        `El código debe ser "${expectedCodigo}" según el módulo y acción especificados`
      );
    }

    const permiso = await this.prisma.permiso.create({
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre,
        modulo: dto.modulo,
        accion: dto.accion,
        descripcion: dto.descripcion,
        activo: dto.activo ?? true,
      },
    });

    this.logger.log(`Permiso creado: ${permiso.codigo} - ${permiso.nombre}`);
    return permiso;
  }

  async updatePermiso(id: string, dto: UpdatePermisoDto) {
    const permiso = await this.prisma.permiso.findUnique({
      where: { id },
    });

    if (!permiso) {
      throw new NotFoundException('Permiso no encontrado');
    }

    const updated = await this.prisma.permiso.update({
      where: { id },
      data: dto,
    });

    this.logger.log(`Permiso actualizado: ${updated.codigo} - ${updated.nombre}`);
    return updated;
  }

  async deletePermiso(id: string) {
    const permiso = await this.prisma.permiso.findUnique({
      where: { id },
      include: {
        _count: {
          select: { roles: true },
        },
      },
    });

    if (!permiso) {
      throw new NotFoundException('Permiso no encontrado');
    }

    // Verificar si el permiso está asociado a roles
    if (permiso._count.roles > 0) {
      throw new BadRequestException(
        `No se puede eliminar el permiso porque está asociado a ${permiso._count.roles} rol(es). ` +
        `Considere desactivarlo en lugar de eliminarlo.`
      );
    }

    await this.prisma.permiso.delete({
      where: { id },
    });

    this.logger.log(`Permiso eliminado: ${permiso.codigo}`);
    return { message: 'Permiso eliminado exitosamente' };
  }

  async getModulosDisponibles() {
    const modulos = await this.prisma.permiso.groupBy({
      by: ['modulo'],
      _count: {
        modulo: true,
      },
      orderBy: {
        modulo: 'asc',
      },
    });

    return modulos.map(m => ({
      value: m.modulo,
      label: this.formatModuloLabel(m.modulo),
      count: m._count.modulo,
    }));
  }

  private formatModuloLabel(modulo: string): string {
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      requests: 'Solicitudes',
      approvals: 'Aprobaciones',
      quotes: 'Cotizaciones',
      orders: 'Órdenes de Compra',
      users: 'Usuarios',
      roles: 'Roles',
      permissions: 'Permisos',
      companies: 'Empresas',
      areas: 'Áreas',
      cost_centers: 'Centros de Costo',
      suppliers: 'Proveedores',
      catalog: 'Catálogo',
      inventory: 'Inventario',
      reports: 'Reportes',
      settings: 'Configuración',
    };
    return labels[modulo] || modulo;
  }

  // ═══════════════════════════════════════
  // EMPRESAS
  // ═══════════════════════════════════════

  async findAllEmpresas(query: PaginationQueryDto = {}) {
    const { page = 1, limit = 20, sortBy = 'nombre', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const [empresas, total] = await Promise.all([
      this.prisma.empresa.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { usuariosEmpresas: true },
          },
        },
      }),
      this.prisma.empresa.count(),
    ]);

    return {
      data: empresas,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneEmpresa(id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usuariosEmpresas: true },
        },
        usuariosEmpresas: {
          include: {
            usuario: {
              select: {
                id: true,
                username: true,
                nombre: true,
                apellido: true,
                email: true,
              },
            },
            rol: {
              select: { id: true, nombre: true },
            },
          },
        },
      },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa con id ${id} no encontrada`);
    }

    return empresa;
  }

  async createEmpresa(dto: CreateEmpresaDto) {
    const existingNit = await this.prisma.empresa.findUnique({
      where: { nit: dto.nit },
    });

    if (existingNit) {
      throw new ConflictException('El NIT ya está registrado');
    }

    const empresa = await this.prisma.empresa.create({
      data: {
        nombre: dto.nombre,
        nit: dto.nit,
        razonSocial: dto.razonSocial,
        direccion: dto.direccion,
        telefono: dto.telefono,
        email: dto.email,
        activo: dto.activo ?? true,
      },
    });

    this.logger.log(`Empresa creada: ${empresa.nombre} (${empresa.nit})`);
    return empresa;
  }

  async updateEmpresa(id: string, dto: UpdateEmpresaDto) {
    await this.findOneEmpresa(id);

    if (dto.nit) {
      const existing = await this.prisma.empresa.findFirst({
        where: { nit: dto.nit, NOT: { id } },
      });

      if (existing) {
        throw new ConflictException('El NIT ya está registrado');
      }
    }

    const empresa = await this.prisma.empresa.update({
      where: { id },
      data: dto,
    });

    this.logger.log(`Empresa actualizada: ${empresa.nombre}`);
    return empresa;
  }

  async deleteEmpresa(id: string) {
    const empresa = await this.findOneEmpresa(id) as any;

    if (empresa._count?.usuariosEmpresas > 0) {
      throw new ConflictException(
        `No se puede eliminar la empresa "${empresa.nombre}" porque tiene ${empresa._count.usuariosEmpresas} usuarios asignados`,
      );
    }

    await this.prisma.empresa.delete({ where: { id } });

    this.logger.log(`Empresa eliminada: ${empresa.nombre}`);
    return { message: 'Empresa eliminada exitosamente' };
  }

  // ═══════════════════════════════════════
  // ASIGNACIÓN USUARIO-EMPRESA
  // ═══════════════════════════════════════

  async asignarEmpresaUsuario(dto: AsignarEmpresaUsuarioDto) {
    // Validar que el usuario existe
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: dto.usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validar que la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: dto.empresaId },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Validar que el rol existe
    const rol = await this.prisma.rol.findUnique({
      where: { id: dto.rolId },
    });

    if (!rol) {
      throw new NotFoundException('Rol no encontrado');
    }

    // Verificar si ya existe la asignación
    const existingAsignacion = await this.prisma.usuarioEmpresaRol.findFirst({
      where: {
        usuarioId: dto.usuarioId,
        empresaId: dto.empresaId,
      },
    });

    if (existingAsignacion) {
      throw new ConflictException('El usuario ya está asignado a esta empresa');
    }

    // Crear la asignación
    const asignacion = await this.prisma.usuarioEmpresaRol.create({
      data: {
        usuarioId: dto.usuarioId,
        empresaId: dto.empresaId,
        rolId: dto.rolId,
        activo: dto.activo ?? true,
      },
      include: {
        usuario: {
          select: {
            id: true,
            username: true,
            nombre: true,
            apellido: true,
          },
        },
        empresa: {
          select: { id: true, nombre: true },
        },
        rol: {
          select: { id: true, nombre: true },
        },
      },
    });

    this.logger.log(
      `Usuario ${usuario.username} asignado a empresa ${empresa.nombre} con rol ${rol.nombre}`,
    );
    return asignacion;
  }

  async desasignarEmpresaUsuario(usuarioId: string, empresaId: string) {
    const asignacion = await this.prisma.usuarioEmpresaRol.findFirst({
      where: { usuarioId, empresaId },
    });

    if (!asignacion) {
      throw new NotFoundException('Asignación no encontrada');
    }

    await this.prisma.usuarioEmpresaRol.delete({
      where: { id: asignacion.id },
    });

    this.logger.log(`Usuario desasignado de empresa`);
    return { message: 'Usuario desasignado de la empresa exitosamente' };
  }

  // ═══════════════════════════════════════
  // CENTROS DE COSTO
  // ═══════════════════════════════════════

  async findAllCentrosCosto(empresaId?: string) {
    const where = empresaId ? { empresaId, activo: true } : { activo: true };
    
    const centrosCosto = await this.prisma.centroCosto.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        codigo: true,
        descripcion: true,
        empresaId: true,
        activo: true,
      },
      orderBy: { nombre: 'asc' },
    });

    return centrosCosto;
  }

  async findOneCentroCosto(id: string) {
    const centroCosto = await this.prisma.centroCosto.findUnique({
      where: { id },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (!centroCosto) {
      throw new NotFoundException('Centro de costo no encontrado');
    }

    return centroCosto;
  }

  async createCentroCosto(dto: CreateCentroCostoDto) {
    // Verificar que la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: dto.empresaId },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Verificar que el código no esté duplicado
    const existingCodigo = await this.prisma.centroCosto.findUnique({
      where: { codigo: dto.codigo },
    });

    if (existingCodigo) {
      throw new ConflictException('Ya existe un centro de costo con ese código');
    }

    const centroCosto = await this.prisma.centroCosto.create({
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        empresaId: dto.empresaId,
        activo: dto.activo ?? true,
      },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    this.logger.log(`Centro de costo creado: ${centroCosto.nombre}`);
    return centroCosto;
  }

  async updateCentroCosto(id: string, dto: UpdateCentroCostoDto) {
    const centroCosto = await this.prisma.centroCosto.findUnique({
      where: { id },
    });

    if (!centroCosto) {
      throw new NotFoundException('Centro de costo no encontrado');
    }

    // Si se está actualizando el código, verificar que no esté duplicado
    if (dto.codigo && dto.codigo !== centroCosto.codigo) {
      const existingCodigo = await this.prisma.centroCosto.findUnique({
        where: { codigo: dto.codigo },
      });

      if (existingCodigo) {
        throw new ConflictException('Ya existe un centro de costo con ese código');
      }
    }

    // Si se está actualizando la empresa, verificar que existe
    if (dto.empresaId) {
      const empresa = await this.prisma.empresa.findUnique({
        where: { id: dto.empresaId },
      });

      if (!empresa) {
        throw new NotFoundException('Empresa no encontrada');
      }
    }

    const updated = await this.prisma.centroCosto.update({
      where: { id },
      data: dto,
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    this.logger.log(`Centro de costo actualizado: ${updated.nombre}`);
    return updated;
  }

  async deleteCentroCosto(id: string) {
    const centroCosto = await this.prisma.centroCosto.findUnique({
      where: { id },
    });

    if (!centroCosto) {
      throw new NotFoundException('Centro de costo no encontrado');
    }

    await this.prisma.centroCosto.delete({
      where: { id },
    });

    this.logger.log(`Centro de costo eliminado: ${centroCosto.nombre}`);
    return { message: 'Centro de costo eliminado exitosamente' };
  }

  // ============================================
  // ÁREAS
  // ============================================

  async findAllAreas(empresaId?: string) {
    const where = empresaId ? { empresaId } : {};

    const areas = await this.prisma.area.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });

    return areas;
  }

  async findOneArea(id: string) {
    const area = await this.prisma.area.findUnique({
      where: { id },
    });

    if (!area) {
      throw new NotFoundException('Área no encontrada');
    }

    return area;
  }

  async createArea(dto: CreateAreaDto) {
    // Verificar que la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: dto.empresaId },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Verificar que el código no esté duplicado
    const existingCodigo = await this.prisma.area.findUnique({
      where: { codigo: dto.codigo },
    });

    if (existingCodigo) {
      throw new ConflictException('Ya existe un área con ese código');
    }

    // Si se especifica jefe de área, verificar que existe
    if (dto.jefeAreaId) {
      const jefeArea = await this.prisma.usuario.findUnique({
        where: { id: dto.jefeAreaId },
      });

      if (!jefeArea) {
        throw new NotFoundException('Jefe de área no encontrado');
      }
    }

    const area = await this.prisma.area.create({
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre,
        empresaId: dto.empresaId,
        jefeAreaId: dto.jefeAreaId,
        presupuestoAnual: dto.presupuestoAnual,
        activo: dto.activo ?? true,
      },
    });

    this.logger.log(`Área creada: ${area.nombre}`);
    return area;
  }

  async updateArea(id: string, dto: UpdateAreaDto) {
    const area = await this.prisma.area.findUnique({
      where: { id },
    });

    if (!area) {
      throw new NotFoundException('Área no encontrada');
    }

    // Si se está actualizando el código, verificar que no esté duplicado
    if (dto.codigo && dto.codigo !== area.codigo) {
      const existingCodigo = await this.prisma.area.findUnique({
        where: { codigo: dto.codigo },
      });

      if (existingCodigo) {
        throw new ConflictException('Ya existe un área con ese código');
      }
    }

    // Si se está actualizando la empresa, verificar que existe
    if (dto.empresaId) {
      const empresa = await this.prisma.empresa.findUnique({
        where: { id: dto.empresaId },
      });

      if (!empresa) {
        throw new NotFoundException('Empresa no encontrada');
      }
    }

    // Si se está actualizando el jefe de área, verificar que existe
    if (dto.jefeAreaId) {
      const jefeArea = await this.prisma.usuario.findUnique({
        where: { id: dto.jefeAreaId },
      });

      if (!jefeArea) {
        throw new NotFoundException('Jefe de área no encontrado');
      }
    }

    const updated = await this.prisma.area.update({
      where: { id },
      data: dto,
    });

    this.logger.log(`Área actualizada: ${updated.nombre}`);
    return updated;
  }

  async deleteArea(id: string) {
    const area = await this.prisma.area.findUnique({
      where: { id },
    });

    if (!area) {
      throw new NotFoundException('Área no encontrada');
    }

    await this.prisma.area.delete({
      where: { id },
    });

    this.logger.log(`Área eliminada: ${area.nombre}`);
    return { message: 'Área eliminada exitosamente' };
  }
}
