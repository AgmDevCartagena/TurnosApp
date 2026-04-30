import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SessionService } from '../services/session.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = request.cookies?.['session_id'];

    console.log('🔍 SessionAuthGuard - Cookies recibidas:', request.cookies);
    console.log('🔍 SessionAuthGuard - session_id:', sessionId);

    if (!sessionId) {
      console.log('❌ SessionAuthGuard - No hay session_id en las cookies');
      throw new UnauthorizedException('No hay sesión activa');
    }

    const session = await this.sessionService.getSession(sessionId);

    if (!session) {
      throw new UnauthorizedException('Sesión expirada o inválida');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: session.userId },
      include: {
        empresas: {
          where: { activo: true },
          include: {
            empresa: {
              select: { id: true, nombre: true, activo: true },
            },
            rol: {
              include: {
                permisos: {
                  include: { permiso: true },
                },
              },
            },
          },
        },
      },
    });

    if (!usuario || !usuario.activo) {
      await this.sessionService.destroySession(sessionId);
      throw new UnauthorizedException('Usuario no encontrado o desactivado');
    }

    // Obtener el rol de la primera empresa activa o la empresa activa en sesión
    const empresaActiva = session.activeCompanyId 
      ? usuario.empresas.find(ue => ue.empresa.id === session.activeCompanyId)
      : usuario.empresas[0];

    if (!empresaActiva || !empresaActiva.rol) {
      await this.sessionService.destroySession(sessionId);
      throw new UnauthorizedException('Usuario sin rol asignado');
    }

    request['user'] = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: {
        id: empresaActiva.rol.id,
        nombre: empresaActiva.rol.nombre,
      },
      permisos: empresaActiva.rol.permisos.map(
        (pr: any) => pr.permiso.codigo,
      ),
      activeCompany: {
        id: empresaActiva.empresa.id,
        nombre: empresaActiva.empresa.nombre,
      },
    };

    return true;
  }
}
