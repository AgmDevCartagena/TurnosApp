import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CotizacionesService } from './cotizaciones.service';
import { CreateCotizacionDto, UpdateCotizacionDto, QueryCotizacionDto } from './dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';

@ApiTags('Cotizaciones')
@Controller('cotizaciones')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva cotización' })
  create(@Req() req: any, @Body() dto: CreateCotizacionDto) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.cotizacionesService.create(empresaId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cotizaciones' })
  findAll(@Req() req: any, @Query() query: QueryCotizacionDto) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.cotizacionesService.findAll(empresaId, query);
  }

  @Get('solicitud/:solicitudId')
  @ApiOperation({ summary: 'Obtener cotizaciones por solicitud (comparativo)' })
  findBySolicitud(@Req() req: any, @Param('solicitudId') solicitudId: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.cotizacionesService.findBySolicitud(empresaId, solicitudId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cotización por ID' })
  findOne(@Req() req: any, @Param('id') id: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.cotizacionesService.findOne(empresaId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cotización' })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCotizacionDto) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.cotizacionesService.update(empresaId, id, dto);
  }

  @Post(':id/seleccionar')
  @ApiOperation({ summary: 'Seleccionar cotización ganadora' })
  seleccionar(@Req() req: any, @Param('id') id: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.cotizacionesService.seleccionarCotizacion(empresaId, id);
  }

  @Post(':id/rechazar')
  @ApiOperation({ summary: 'Rechazar cotización' })
  rechazar(@Req() req: any, @Param('id') id: string, @Body('motivo') motivo: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.cotizacionesService.rechazarCotizacion(empresaId, id, motivo);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cotización' })
  remove(@Req() req: any, @Param('id') id: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.cotizacionesService.remove(empresaId, id);
  }
}
