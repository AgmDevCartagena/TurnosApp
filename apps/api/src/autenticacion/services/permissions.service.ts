import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface EffectivePermissions {
  permissions: string[];
  roles: string[];
  isSuperAdmin: boolean;
}

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getEffectivePermissions(
    userId: string,
    companyId: string,
  ): Promise<EffectivePermissions> {
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
      return {
        permissions: [],
        roles: [],
        isSuperAdmin: false,
      };
    }

    const roles = userCompanyRoles.map(ucr => ucr.rol.codigo);
    const isSuperAdmin = roles.includes('super_admin');

    const permissionsSet = new Set<string>();
    
    for (const ucr of userCompanyRoles) {
      for (const pr of ucr.rol.permisos) {
        const permCode = pr.permiso.codigo;
        permissionsSet.add(permCode);
      }
    }

    const permissions = Array.from(permissionsSet);

    this.logger.log(
      `Permisos efectivos para usuario ${userId} en empresa ${companyId}: ${permissions.length} permisos`,
    );

    return {
      permissions,
      roles,
      isSuperAdmin,
    };
  }

  async hasPermission(
    userId: string,
    companyId: string,
    requiredPermission: string,
  ): Promise<boolean> {
    const { permissions, isSuperAdmin } = await this.getEffectivePermissions(
      userId,
      companyId,
    );

    if (isSuperAdmin) return true;

    return permissions.includes(requiredPermission);
  }

  async hasAnyPermission(
    userId: string,
    companyId: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    const { permissions, isSuperAdmin } = await this.getEffectivePermissions(
      userId,
      companyId,
    );

    if (isSuperAdmin) return true;

    return requiredPermissions.some(perm => permissions.includes(perm));
  }

  async hasAllPermissions(
    userId: string,
    companyId: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    const { permissions, isSuperAdmin } = await this.getEffectivePermissions(
      userId,
      companyId,
    );

    if (isSuperAdmin) return true;

    return requiredPermissions.every(perm => permissions.includes(perm));
  }
}
