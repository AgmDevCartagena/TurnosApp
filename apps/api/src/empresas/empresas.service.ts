import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';

@Injectable()
export class EmpresasService {
  private readonly logger = new Logger(EmpresasService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserCompanies(userId: string) {
    const userCompanies = await this.prisma.usuarioEmpresaRol.findMany({
      where: {
        usuarioId: userId,
        activo: true,
        empresa: { activo: true },
      },
      include: {
        empresa: true,
        rol: {
          include: {
            permisos: {
              include: {
                permiso: true,
              },
            },
          },
        },
      },
    });

    const companiesMap = new Map();

    for (const uer of userCompanies) {
      if (!companiesMap.has(uer.empresaId)) {
        companiesMap.set(uer.empresaId, {
          id: uer.empresa.id,
          nombre: uer.empresa.nombre,
          nit: uer.empresa.nit,
          razonSocial: uer.empresa.razonSocial,
          roles: [],
        });
      }

      const company = companiesMap.get(uer.empresaId);
      company.roles.push({
        id: uer.rol.id,
        codigo: uer.rol.codigo,
        nombre: uer.rol.nombre,
      });
    }

    return Array.from(companiesMap.values());
  }

  async getCompanyRolesAndPermissions(userId: string, companyId: string) {
    const userCompanyRoles = await this.prisma.usuarioEmpresaRol.findMany({
      where: {
        usuarioId: userId,
        empresaId: companyId,
        activo: true,
      },
      include: {
        rol: {
          include: {
            permisos: {
              include: {
                permiso: true,
              },
            },
          },
        },
      },
    });

    if (userCompanyRoles.length === 0) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    const roles = userCompanyRoles.map((ucr: any) => ({
      id: ucr.rol.id,
      codigo: ucr.rol.codigo,
      nombre: ucr.rol.nombre,
    }));

    const permissionsSet = new Set<string>();
    for (const ucr of userCompanyRoles) {
      for (const pr of ucr.rol.permisos) {
        permissionsSet.add(pr.permiso.codigo);
      }
    }

    return {
      roles,
      permissions: Array.from(permissionsSet),
    };
  }

  async validateUserCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    const access = await this.prisma.usuarioEmpresaRol.findFirst({
      where: {
        usuarioId: userId,
        empresaId: companyId,
        activo: true,
        empresa: { activo: true },
      },
    });

    return !!access;
  }

  async create(dto: CreateEmpresaDto) {
    this.logger.log(`Creando empresa: ${dto.nombre}`);
    return this.prisma.empresa.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.empresa.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return empresa;
  }
}
