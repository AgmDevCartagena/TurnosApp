import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SeguimientoService } from './seguimiento.service';
import { QuerySeguimientoDto } from './dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';

@ApiTags('Seguimiento')
@Controller('seguimiento')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SeguimientoController {
  constructor(private readonly seguimientoService: SeguimientoService) {}

  @Get('solicitudes')
  @ApiOperation({ summary: 'Consultar y hacer seguimiento de solicitudes' })
  consultarSolicitudes(@Req() req: any, @Query() query: QuerySeguimientoDto) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.seguimientoService.consultarSolicitudes(empresaId, query);
  }

  @Get('solicitudes/:id')
  @ApiOperation({ summary: 'Obtener detalle completo de seguimiento de solicitud' })
  obtenerDetalle(@Req() req: any, @Param('id') id: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.seguimientoService.obtenerDetalleSeguimiento(empresaId, id);
  }
}
