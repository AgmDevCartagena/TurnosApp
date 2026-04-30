import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AutenticacionService } from '../autenticacion.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly autenticacionService: AutenticacionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.autenticacionService.validateUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario no válido');
    }
    
    // Agregar activeCompany si existe
    if (user.empresas && user.empresas.length > 0) {
      const primeraEmpresa = user.empresas[0];
      if (primeraEmpresa) {
        return {
          ...user,
          activeCompany: {
            id: primeraEmpresa.id,
            nombre: primeraEmpresa.nombre,
          },
        };
      }
    }
    
    return user;
  }
}
