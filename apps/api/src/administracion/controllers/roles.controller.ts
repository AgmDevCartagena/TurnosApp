import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdministracionService } from '../administracion.service';
import { CreateRolDto, UpdateRolDto, PaginationQueryDto } from '../dto';
import { JwtAuthGuard, RolesGuard } from '../../autenticacion/guards';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Administración - Roles')
@Controller('admin/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly administracionService: AdministracionService) {}

  @Get()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Listar roles con paginación' })
  @ApiResponse({ status: 200, description: 'Lista de roles' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.administracionService.findAllRoles(query);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Obtener un rol por ID' })
  @ApiResponse({ status: 200, description: 'Rol encontrado' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.administracionService.findOneRol(id);
  }

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: 'Crear un nuevo rol' })
  @ApiResponse({ status: 201, description: 'Rol creado' })
  @ApiResponse({ status: 409, description: 'Nombre de rol duplicado' })
  create(@Body() dto: CreateRolDto) {
    return this.administracionService.createRol(dto);
  }

  @Patch(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Actualizar un rol' })
  @ApiResponse({ status: 200, description: 'Rol actualizado' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRolDto) {
    return this.administracionService.updateRol(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Eliminar un rol' })
  @ApiResponse({ status: 200, description: 'Rol eliminado' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @ApiResponse({ status: 409, description: 'Rol tiene usuarios asignados' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.administracionService.deleteRol(id);
  }
}
