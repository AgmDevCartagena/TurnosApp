import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdministracionService } from '../administracion.service';
import { JwtAuthGuard, RolesGuard } from '../../autenticacion/guards';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Administración - Permisos')
@Controller('admin/permisos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PermisosController {
  constructor(private readonly administracionService: AdministracionService) {}

  @Get()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Listar todos los permisos disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de permisos' })
  findAll() {
    return this.administracionService.findAllPermisos();
  }
}
