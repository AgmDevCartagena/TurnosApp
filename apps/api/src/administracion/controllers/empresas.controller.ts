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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdministracionService } from '../administracion.service';
import { CreateEmpresaDto, UpdateEmpresaDto, AsignarEmpresaUsuarioDto, PaginationQueryDto } from '../dto';
import { JwtAuthGuard, RolesGuard } from '../../autenticacion/guards';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Empresas')
@Controller('admin/empresas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmpresasController {
  constructor(private readonly administracionService: AdministracionService) {}

  @Get()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Listar empresas con paginación' })
  @ApiResponse({ status: 200, description: 'Lista de empresas' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.administracionService.findAllEmpresas(query);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Obtener una empresa por ID' })
  @ApiResponse({ status: 200, description: 'Empresa encontrada' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  findOne(@Param('id') id: string) {
    return this.administracionService.findOneEmpresa(id);
  }

  @Post()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Crear una nueva empresa' })
  @ApiResponse({ status: 201, description: 'Empresa creada' })
  @ApiResponse({ status: 409, description: 'NIT ya registrado' })
  create(@Body() dto: CreateEmpresaDto) {
    return this.administracionService.createEmpresa(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Actualizar una empresa' })
  @ApiResponse({ status: 200, description: 'Empresa actualizada' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  update(@Param('id') id: string, @Body() dto: UpdateEmpresaDto) {
    return this.administracionService.updateEmpresa(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Eliminar una empresa' })
  @ApiResponse({ status: 200, description: 'Empresa eliminada' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  @ApiResponse({ status: 409, description: 'Empresa tiene usuarios asignados' })
  remove(@Param('id') id: string) {
    return this.administracionService.deleteEmpresa(id);
  }

  @Post('asignar-usuario')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Asignar un usuario a una empresa' })
  @ApiResponse({ status: 201, description: 'Usuario asignado a empresa' })
  @ApiResponse({ status: 404, description: 'Usuario o empresa no encontrados' })
  @ApiResponse({ status: 409, description: 'Usuario ya asignado a la empresa' })
  asignarUsuario(@Body() dto: AsignarEmpresaUsuarioDto) {
    return this.administracionService.asignarEmpresaUsuario(dto);
  }

  @Delete('desasignar-usuario/:usuarioId/:empresaId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Desasignar un usuario de una empresa' })
  @ApiResponse({ status: 200, description: 'Usuario desasignado de empresa' })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
  desasignarUsuario(
    @Param('usuarioId') usuarioId: string,
    @Param('empresaId') empresaId: string,
  ) {
    return this.administracionService.desasignarEmpresaUsuario(usuarioId, empresaId);
  }
}
