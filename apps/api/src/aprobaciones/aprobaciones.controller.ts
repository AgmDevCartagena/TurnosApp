import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AprobacionesService } from './aprobaciones.service';
import { CreateFlujoAprobacionDto, AprobarRechazarDto, QueryAprobacionDto } from './dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';

@ApiTags('Aprobaciones')
@Controller('aprobaciones')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AprobacionesController {
  constructor(private readonly aprobacionesService: AprobacionesService) {}

  @Post('flujos')
  @ApiOperation({ summary: 'Crear flujo de aprobación' })
  create(@Req() req: any, @Body() dto: CreateFlujoAprobacionDto) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.aprobacionesService.createFlujo(empresaId, dto);
  }

  @Get('flujos')
  @ApiOperation({ summary: 'Listar flujos de aprobación' })
  findAll(@Req() req: any, @Query() query: QueryAprobacionDto) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.aprobacionesService.findAll(empresaId, query);
  }

  @Get('flujos/:id')
  @ApiOperation({ summary: 'Obtener flujo de aprobación por ID' })
  findOne(@Req() req: any, @Param('id') id: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.aprobacionesService.findOne(empresaId, id);
  }

  @Get('solicitud/:solicitudId')
  @ApiOperation({ summary: 'Obtener flujo de aprobación por solicitud' })
  findBySolicitud(@Req() req: any, @Param('solicitudId') solicitudId: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.aprobacionesService.findBySolicitud(empresaId, solicitudId);
  }

  @Get('pendientes/mis-aprobaciones')
  @ApiOperation({ summary: 'Obtener aprobaciones pendientes del usuario actual' })
  getPendientes(@Req() req: any, @Query() query: QueryAprobacionDto) {
    const empresaId = req.user?.activeCompany?.id;
    const usuarioId = req.user?.id;
    if (!empresaId || !usuarioId) {
      throw new Error('No hay empresa activa o usuario no autenticado');
    }
    return this.aprobacionesService.getPendientesByAprobador(empresaId, usuarioId, query);
  }

  @Post('pasos/:pasoId/aprobar')
  @ApiOperation({ summary: 'Aprobar paso de aprobación' })
  aprobar(@Req() req: any, @Param('pasoId') pasoId: string, @Body() dto: AprobarRechazarDto) {
    const empresaId = req.user?.activeCompany?.id;
    const usuarioId = req.user?.id;
    if (!empresaId || !usuarioId) {
      throw new Error('No hay empresa activa o usuario no autenticado');
    }
    return this.aprobacionesService.aprobar(empresaId, pasoId, usuarioId, dto);
  }

  @Post('pasos/:pasoId/rechazar')
  @ApiOperation({ summary: 'Rechazar paso de aprobación' })
  rechazar(@Req() req: any, @Param('pasoId') pasoId: string, @Body() dto: AprobarRechazarDto) {
    const empresaId = req.user?.activeCompany?.id;
    const usuarioId = req.user?.id;
    if (!empresaId || !usuarioId) {
      throw new Error('No hay empresa activa o usuario no autenticado');
    }
    return this.aprobacionesService.rechazar(empresaId, pasoId, usuarioId, dto);
  }
}
