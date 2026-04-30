import {
  Injectable,
  UnauthorizedException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { PrismaService } from '../../database/prisma.service';
import { MicrosoftClaims, MicrosoftAuthResult } from '../interfaces/microsoft-claims.interface';

@Injectable()
export class MicrosoftAuthService {
  private readonly logger = new Logger(MicrosoftAuthService.name);
  private jwksClient: jwksClient.JwksClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const tenantId = this.configService.get<string>('microsoft.tenantId');
    this.jwksClient = jwksClient({
      jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      cache: true,
      cacheMaxAge: 86400000,
    });
  }

  async validateIdToken(idToken: string): Promise<MicrosoftClaims> {
    try {
      const decoded = jwt.decode(idToken, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw new UnauthorizedException('Token inválido');
      }

      const kid = decoded.header.kid;
      if (!kid) {
        throw new UnauthorizedException('Token sin kid en header');
      }
      const signingKey = await this.getSigningKey(kid);

      const verified = jwt.verify(idToken, signingKey, {
        algorithms: ['RS256'],
        audience: this.configService.get<string>('microsoft.clientId'),
        issuer: `https://login.microsoftonline.com/${this.configService.get<string>('microsoft.tenantId')}/v2.0`,
      }) as MicrosoftClaims;

      this.logger.log(`Token de Microsoft validado para: ${verified.email}`);
      return verified;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error validando token de Microsoft: ${errorMessage}`);
      throw new UnauthorizedException('Token de Microsoft inválido o expirado');
    }
  }

  async authenticateWithMicrosoft(
    idToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<MicrosoftAuthResult> {
    const claims = await this.validateIdToken(idToken);

    const email = claims.email || claims.preferred_username;
    if (!email) {
      await this.logAuthEvent({
        evento: 'microsoft_login_failed',
        email: 'unknown',
        authProvider: 'microsoft',
        exitoso: false,
        razon: 'Email no encontrado en claims',
        ip,
        userAgent,
      });
      throw new UnauthorizedException('Email no encontrado en el token de Microsoft');
    }

    const allowedDomains = this.configService.get<string[]>('microsoft.allowedDomains', []);
    if (allowedDomains.length > 0) {
      const emailDomain = email.split('@')[1]?.toLowerCase();
      if (!emailDomain || !allowedDomains.includes(emailDomain)) {
        await this.logAuthEvent({
          evento: 'microsoft_login_domain_denied',
          email,
          authProvider: 'microsoft',
          exitoso: false,
          razon: `Dominio ${emailDomain} no permitido`,
          ip,
          userAgent,
        });
        throw new ForbiddenException(
          'Tu cuenta corporativa no tiene acceso a esta plataforma. Contacta al administrador.',
        );
      }
    }

    let usuario = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { microsoftId: claims.oid },
          { email: email.toLowerCase() },
        ],
      },
      include: {
        rol: {
          include: {
            permisos: {
              include: { permiso: true },
            },
          },
        },
      },
    });

    let isNewUser = false;

    if (!usuario) {
      const autoProvision = this.configService.get<boolean>('microsoft.autoProvision', true);
      
      if (!autoProvision) {
        await this.logAuthEvent({
          evento: 'microsoft_login_user_not_authorized',
          email,
          authProvider: 'microsoft',
          exitoso: false,
          razon: 'Usuario no existe y auto-aprovisionamiento deshabilitado',
          ip,
          userAgent,
        });
        throw new ForbiddenException(
          'Tu cuenta no está autorizada para acceder a esta plataforma. Contacta al administrador.',
        );
      }

      usuario = await this.provisionUserFromMicrosoft(claims, email);
      if (!usuario) {
        throw new Error('Error al crear usuario desde Microsoft');
      }
      isNewUser = true;
      this.logger.log(`Usuario auto-aprovisionado: ${email}`);
    } else {
      if (!usuario.activo) {
        await this.logAuthEvent({
          evento: 'microsoft_login_user_inactive',
          usuarioId: usuario.id,
          email,
          authProvider: 'microsoft',
          exitoso: false,
          razon: 'Usuario desactivado',
          ip,
          userAgent,
        });
        throw new ForbiddenException('Tu cuenta ha sido desactivada. Contacta al administrador.');
      }

      if (!usuario.microsoftId) {
        await this.prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            microsoftId: claims.oid,
            authProvider: 'microsoft',
          },
        });
      }
    }

    if (usuario) {
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { lastLoginAt: new Date() },
      });
    }

    await this.logAuthEvent({
      evento: 'microsoft_login_success',
      usuarioId: usuario?.id,
      email,
      authProvider: 'microsoft',
      exitoso: true,
      ip,
      userAgent,
      metadata: {
        isNewUser,
        microsoftId: claims.oid,
        tenantId: claims.tid,
      },
    });

    return { usuario, isNewUser };
  }

  private async provisionUserFromMicrosoft(
    claims: MicrosoftClaims,
    email: string,
  ) {
    const defaultRole = this.configService.get<string>('microsoft.defaultRole', 'solicitante');
    
    const rol = await this.prisma.rol.findUnique({
      where: { nombre: defaultRole },
      include: {
        permisos: {
          include: { permiso: true },
        },
      },
    });

    if (!rol) {
      throw new Error(`Rol por defecto '${defaultRole}' no encontrado. Ejecute el seed.`);
    }

    const nombre = claims.given_name || claims.name?.split(' ')[0] || 'Usuario';
    const apellido = claims.family_name || claims.name?.split(' ').slice(1).join(' ') || 'Microsoft';

    // Generar username único desde el email
    const emailParts = email.split('@');
    const baseUsername = (emailParts[0] || 'user').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    let username = baseUsername;
    let counter = 1;

    // Verificar si el username ya existe y agregar sufijo si es necesario
    while (await this.prisma.usuario.findUnique({ where: { username } })) {
      username = `${baseUsername}_${counter}`;
      counter++;
    }

    return this.prisma.usuario.create({
      data: {
        username,
        email: email.toLowerCase(),
        nombre,
        apellido,
        microsoftId: claims.oid,
        authProvider: 'microsoft',
        password: null,
        rolId: rol.id,
      },
      include: {
        rol: {
          include: {
            permisos: {
              include: { permiso: true },
            },
          },
        },
      },
    });
  }

  private async getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(err);
        } else if (key) {
          const signingKey = key.getPublicKey();
          resolve(signingKey);
        } else {
          reject(new Error('No signing key found'));
        }
      });
    });
  }

  private async logAuthEvent(data: {
    evento: string;
    usuarioId?: string;
    email?: string;
    authProvider: string;
    exitoso: boolean;
    razon?: string;
    ip?: string;
    userAgent?: string;
    metadata?: any;
  }) {
    try {
      await this.prisma.authAuditLog.create({
        data: {
          evento: data.evento,
          usuarioId: data.usuarioId,
          email: data.email,
          authProvider: data.authProvider,
          exitoso: data.exitoso,
          razon: data.razon,
          ip: data.ip,
          userAgent: data.userAgent,
          metadata: data.metadata,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error logging auth event: ${errorMessage}`);
    }
  }
}
