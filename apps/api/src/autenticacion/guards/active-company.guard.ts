import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SessionService } from '../services/session.service';

@Injectable()
export class ActiveCompanyGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
      throw new ForbiddenException(
        'Debes seleccionar una empresa antes de continuar',
      );
    }

    request.activeCompany = {
      id: session.activeCompanyId,
      roles: session.activeRoles,
      permissions: session.activePermissions,
    };

    return true;
  }
}
