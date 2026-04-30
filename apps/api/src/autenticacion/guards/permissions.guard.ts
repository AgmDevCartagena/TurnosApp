import { Injectable, CanActivate, ExecutionContext, SetMetadata, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionService } from '../services/session.service';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const sessionId = request.cookies?.['session_id'];

    if (!sessionId) {
      throw new ForbiddenException('Sesión no encontrada');
    }

    const session = await this.sessionService.getSession(sessionId);

    if (!session) {
      throw new ForbiddenException('Sesión inválida');
    }

    if (!session.activeCompanyId) {
      throw new ForbiddenException('Debes seleccionar una empresa');
    }

    const hasPermissions = requiredPermissions.every((perm) =>
      session.activePermissions.includes(perm),
    );

    if (!hasPermissions) {
      throw new ForbiddenException(
        `No tienes permiso para realizar esta acción en la empresa actual`,
      );
    }

    return true;
  }
}
