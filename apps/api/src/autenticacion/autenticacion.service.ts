import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto';
import { JwtPayload, AuthenticatedUser } from './interfaces/jwt-payload.interface';

@Injectable()
export class AutenticacionService {
  private readonly logger = new Logger(AutenticacionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
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

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    const passwordValid = await bcrypt.compare(dto.password, usuario.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generateTokens(usuario.id, usuario.email, usuario.rol.nombre);

    this.logger.log(`Login exitoso: ${usuario.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      usuario: this.mapToAuthenticatedUser(usuario),
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const rolSolicitante = await this.prisma.rol.findUnique({
      where: { nombre: 'solicitante' },
    });

    if (!rolSolicitante) {
      throw new ConflictException('Rol por defecto no encontrado. Ejecute el seed.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        nombre: dto.nombre,
        apellido: dto.apellido,
        rolId: rolSolicitante.id,
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

    const tokens = await this.generateTokens(usuario.id, usuario.email, usuario.rol.nombre);

    this.logger.log(`Registro exitoso: ${usuario.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      usuario: this.mapToAuthenticatedUser(usuario),
    };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const usuario = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
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

      if (!usuario || !usuario.activo) {
        throw new UnauthorizedException('Token inválido');
      }

      const tokens = await this.generateTokens(usuario.id, usuario.email, usuario.rol.nombre);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        usuario: this.mapToAuthenticatedUser(usuario),
      };
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async getProfile(userId: string): Promise<AuthenticatedUser> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
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

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no encontrado o desactivado');
    }

    return this.mapToAuthenticatedUser(usuario);
  }

  async validateUserById(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
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

    if (!usuario || !usuario.activo) {
      return null;
    }

    return this.mapToAuthenticatedUser(usuario);
  }

  private async generateTokens(userId: string, email: string, rol: string) {
    const payload: JwtPayload = { sub: userId, email, rol };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private mapToAuthenticatedUser(usuario: any): AuthenticatedUser {
    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: {
        id: usuario.rol.id,
        nombre: usuario.rol.nombre,
      },
      permisos: usuario.rol.permisos.map(
        (pr: any) => `${pr.permiso.recurso}:${pr.permiso.accion}`,
      ),
    };
  }
}
