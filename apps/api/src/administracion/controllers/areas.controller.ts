import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdministracionService } from '../administracion.service';
import { SessionAuthGuard } from '../../autenticacion/guards/session-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateAreaDto, UpdateAreaDto } from '../dto';

@ApiTags('Áreas')
@ApiBearerAuth()
@Controller('admin/areas')
@UseGuards(SessionAuthGuard)
export class AreasController {
  constructor(private readonly administracionService: AdministracionService) {}

  @Get()
  @Roles('super_admin', 'admin', 'jefe_compras')
  @ApiOperation({ summary: 'Listar áreas' })
  async findAll(@Query('empresaId') empresaId?: string) {
    const areas = await this.administracionService.findAllAreas(empresaId);
    return { data: areas };
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'jefe_compras')
  @ApiOperation({ summary: 'Obtener área por ID' })
  async findOne(@Param('id') id: string) {
    const area = await this.administracionService.findOneArea(id);
    return { data: area };
  }

  @Post()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Crear área' })
  async create(@Body() dto: CreateAreaDto) {
    const area = await this.administracionService.createArea(dto);
    return { data: area };
  }

  @Put(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Actualizar área' })
  async update(@Param('id') id: string, @Body() dto: UpdateAreaDto) {
    const area = await this.administracionService.updateArea(id, dto);
    return { data: area };
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Eliminar área' })
  async delete(@Param('id') id: string) {
    return await this.administracionService.deleteArea(id);
  }
}
