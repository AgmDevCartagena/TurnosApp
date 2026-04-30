import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AutenticacionService } from './autenticacion.service';
import { AutenticacionController } from './autenticacion.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard, RolesGuard, PermissionsGuard, SessionAuthGuard } from './guards';
import { MicrosoftAuthService } from './services/microsoft-auth.service';
import { SessionService } from './services/session.service';

@Module({
  imports: [
    forwardRef(() => require('../empresas/empresas.module').EmpresasModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') },
      }),
    }),
  ],
  controllers: [AutenticacionController],
  providers: [
    PrismaService,
    AutenticacionService,
    MicrosoftAuthService,
    SessionService,
    JwtStrategy,
    JwtAuthGuard,
    SessionAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [
    JwtModule,
    AutenticacionService,
    MicrosoftAuthService,
    SessionService,
    JwtAuthGuard,
    SessionAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class AutenticacionModule {}
