import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdministracionService } from '../administracion.service';
import { SessionAuthGuard } from '../../autenticacion/guards/session-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateCentroCostoDto, UpdateCentroCostoDto } from '../dto';

@ApiTags('Centros de Costo')
@ApiBearerAuth()
@Controller('admin/centros-costo')
@UseGuards(SessionAuthGuard)
export class CentrosCostoController {
  constructor(private readonly administracionService: AdministracionService) {}

  @Get()
  @Roles('super_admin', 'admin', 'jefe_compras')
  @ApiOperation({ summary: 'Listar centros de costo' })
  async findAll(@Query('empresaId') empresaId?: string) {
    const centrosCosto = await this.administracionService.findAllCentrosCosto(empresaId);
    return { data: centrosCosto };
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'jefe_compras')
  @ApiOperation({ summary: 'Obtener centro de costo por ID' })
  async findOne(@Param('id') id: string) {
    const centroCosto = await this.administracionService.findOneCentroCosto(id);
    return { data: centroCosto };
  }

  @Post()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Crear centro de costo' })
  async create(@Body() dto: CreateCentroCostoDto) {
    const centroCosto = await this.administracionService.createCentroCosto(dto);
    return { data: centroCosto };
  }

  @Put(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Actualizar centro de costo' })
  async update(@Param('id') id: string, @Body() dto: UpdateCentroCostoDto) {
    const centroCosto = await this.administracionService.updateCentroCosto(id, dto);
    return { data: centroCosto };
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Eliminar centro de costo' })
  async delete(@Param('id') id: string) {
    return await this.administracionService.deleteCentroCosto(id);
  }
}
