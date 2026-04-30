import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  Ip,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AutenticacionService } from './autenticacion.service';
import { LoginDto, RegisterDto, RefreshTokenDto, MicrosoftCallbackDto } from './dto';
import { JwtAuthGuard, SessionAuthGuard } from './guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';
import { MicrosoftAuthService } from './services/microsoft-auth.service';
import { SessionService } from './services/session.service';
import { SelectCompanyDto } from '../empresas/dto';
import { EmpresasService } from '../empresas/empresas.service';
import { CompanyAuditService } from '../empresas/company-audit.service';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Autenticación')
@Controller('auth')
export class AutenticacionController {
  constructor(
    private readonly autenticacionService: AutenticacionService,
    private readonly microsoftAuthService: MicrosoftAuthService,
    private readonly sessionService: SessionService,
    private readonly empresasService: EmpresasService,
    private readonly companyAuditService: CompanyAuditService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.autenticacionService.login(dto);
    
    const sessionId = uuidv4();
    console.log('🔐 Creando sesión:', sessionId, 'para usuario:', result.usuario.email);
    
    await this.sessionService.createSession(sessionId, {
      userId: result.usuario.id,
      email: result.usuario.email,
      authProvider: 'local',
    });

    const cookieOptions = {
      httpOnly: true,
      secure: false, // Desactivado para desarrollo local
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/',
    };
    
    console.log('🍪 Estableciendo cookie session_id con opciones:', cookieOptions);
    res.cookie('session_id', sessionId, cookieOptions);

    return result;
  }

  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Registro exitoso' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  async register(@Body() dto: RegisterDto) {
    return this.autenticacionService.register(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens' })
  @ApiResponse({ status: 200, description: 'Tokens renovados' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.autenticacionService.refreshTokens(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.autenticacionService.getProfile(user.id);
  }

  @Post('microsoft/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Callback de autenticación Microsoft' })
  @ApiResponse({ status: 200, description: 'Autenticación exitosa' })
  @ApiResponse({ status: 401, description: 'Token inválido' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async microsoftCallback(
    @Body() dto: MicrosoftCallbackDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.microsoftAuthService.authenticateWithMicrosoft(
      dto.idToken,
      ip,
      userAgent,
    );

    const sessionId = uuidv4();
    await this.sessionService.createSession(sessionId, {
      userId: result.usuario.id,
      email: result.usuario.email,
      authProvider: 'microsoft',
    });

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      usuario: {
        id: result.usuario.id,
        email: result.usuario.email,
        nombre: result.usuario.nombre,
        apellido: result.usuario.apellido,
        rol: {
          id: result.usuario.rol.id,
          nombre: result.usuario.rol.nombre,
        },
        permisos: result.usuario.rol.permisos.map(
          (pr: any) => `${pr.permiso.recurso}:${pr.permiso.accion}`,
        ),
      },
      isNewUser: result.isNewUser,
    };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: 'Obtener contexto completo del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Contexto del usuario con empresas' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getCurrentUserContext(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const sessionId = req.cookies?.['session_id'];
    const session = sessionId ? await this.sessionService.getSession(sessionId) : null;

    const companies = await this.empresasService.getUserCompanies(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        username: user.username,
      },
      companies,
      activeCompany: session?.activeCompanyId 
        ? companies.find(c => c.id === session.activeCompanyId) 
        : null,
      activeRoles: session?.activeRoles || [],
      activePermissions: session?.activePermissions || [],
      requiresCompanySelection: companies.length > 1 && !session?.activeCompanyId,
    };
  }

  @Post('select-company')
  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seleccionar empresa activa' })
  @ApiResponse({ status: 200, description: 'Empresa seleccionada exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta empresa' })
  async selectCompany(
    @Body() dto: SelectCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const sessionId = req.cookies?.['session_id'];
    if (!sessionId) {
      throw new UnauthorizedException('Sesión no encontrada');
    }

    const hasAccess = await this.empresasService.validateUserCompanyAccess(
      user.id,
      dto.companyId,
    );

    if (!hasAccess) {
      await this.companyAuditService.log({
        evento: 'company_access_denied',
        usuarioId: user.id,
        empresaId: dto.companyId,
        exitoso: false,
        razon: 'Usuario no tiene acceso a esta empresa',
        ip,
        userAgent,
      });

      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    const { roles, permissions } = await this.empresasService.getCompanyRolesAndPermissions(
      user.id,
      dto.companyId,
    );

    await this.sessionService.setActiveCompany(
      sessionId,
      dto.companyId,
      roles.map((r: any) => r.codigo),
      permissions,
    );

    const session = await this.sessionService.getSession(sessionId);
    await this.companyAuditService.log({
      evento: session?.activeCompanyId ? 'company_changed' : 'company_selected',
      usuarioId: user.id,
      empresaId: dto.companyId,
      empresaAnteriorId: session?.activeCompanyId || undefined,
      exitoso: true,
      ip,
      userAgent,
    });

    const empresa = await this.empresasService.findOne(dto.companyId);

    return {
      success: true,
      activeCompany: {
        id: empresa.id,
        nombre: empresa.nombre,
        nit: empresa.nit,
        razonSocial: empresa.razonSocial,
      },
      activeRoles: roles,
      activePermissions: permissions,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = req.cookies?.['session_id'];
    
    if (sessionId) {
      await this.sessionService.destroySession(sessionId);
    }

    res.clearCookie('session_id', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Sesión cerrada exitosamente' };
  }
}
