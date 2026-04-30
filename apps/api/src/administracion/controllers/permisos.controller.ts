import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdministracionService } from '../administracion.service';
import { SessionAuthGuard } from '../../autenticacion/guards/session-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreatePermisoDto, UpdatePermisoDto } from '../dto';

@ApiTags('Administración - Permisos')
@Controller('admin/permisos')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class PermisosController {
  constructor(private readonly administracionService: AdministracionService) {}

  @Get()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Listar permisos con búsqueda, filtros y paginación' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'modulo', required: false, type: String })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista paginada de permisos' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('modulo') modulo?: string,
    @Query('activo') activo?: boolean,
  ) {
    const result = await this.administracionService.findAllPermisos({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      modulo,
      activo,
    });
    return result;
  }

  @Get('modulos')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Obtener lista de módulos disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de módulos con conteo' })
  async getModulos() {
    const modulos = await this.administracionService.getModulosDisponibles();
    return { data: modulos };
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Obtener detalle de un permiso' })
  @ApiResponse({ status: 200, description: 'Detalle del permiso' })
  @ApiResponse({ status: 404, description: 'Permiso no encontrado' })
  async findOne(@Param('id') id: string) {
    const permiso = await this.administracionService.findOnePermiso(id);
    return { data: permiso };
  }

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: 'Crear nuevo permiso' })
  @ApiResponse({ status: 201, description: 'Permiso creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'El permiso ya existe' })
  async create(@Body() dto: CreatePermisoDto) {
    const permiso = await this.administracionService.createPermiso(dto);
    return { data: permiso };
  }

  @Put(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Actualizar permiso existente' })
  @ApiResponse({ status: 200, description: 'Permiso actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Permiso no encontrado' })
  async update(@Param('id') id: string, @Body() dto: UpdatePermisoDto) {
    const permiso = await this.administracionService.updatePermiso(id, dto);
    return { data: permiso };
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Eliminar permiso' })
  @ApiResponse({ status: 200, description: 'Permiso eliminado exitosamente' })
  @ApiResponse({ status: 400, description: 'El permiso está en uso y no puede eliminarse' })
  @ApiResponse({ status: 404, description: 'Permiso no encontrado' })
  async delete(@Param('id') id: string) {
    return await this.administracionService.deletePermiso(id);
  }
}
