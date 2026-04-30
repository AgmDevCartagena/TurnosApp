import { Controller, Get, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guards';
import { UbicacionesService } from './ubicaciones.service';

@ApiTags('Ubicaciones')
@Controller('ubicaciones')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UbicacionesController {
  constructor(private readonly ubicacionesService: UbicacionesService) {}

  @Get('paises')
  @ApiOperation({ summary: 'Listar países activos' })
  async getPaises() {
    const paises = await this.ubicacionesService.findAllPaises();
    return { data: paises };
  }

  @Get('departamentos')
  @ApiOperation({ summary: 'Listar departamentos por país' })
  async getDepartamentos(@Query('paisId', ParseUUIDPipe) paisId: string) {
    const departamentos = await this.ubicacionesService.findDepartamentosByPais(paisId);
    return { data: departamentos };
  }

  @Get('ciudades')
  @ApiOperation({ summary: 'Listar ciudades por departamento' })
  async getCiudades(@Query('departamentoId', ParseUUIDPipe) departamentoId: string) {
    const ciudades = await this.ubicacionesService.findCiudadesByDepartamento(departamentoId);
    return { data: ciudades };
  }
}
