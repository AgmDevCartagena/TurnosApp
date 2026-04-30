import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { SessionAuthGuard } from '../autenticacion/guards/session-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../autenticacion/interfaces/jwt-payload.interface';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('Empresas')
@Controller('empresas')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Get('my-companies')
  @ApiOperation({ summary: 'Obtener empresas del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de empresas del usuario' })
  async getMyCompanies(@CurrentUser() user: AuthenticatedUser) {
    return this.empresasService.getUserCompanies(user.id);
  }

  @Post()
  @RequirePermission('empresas:crear')
  @ApiOperation({ summary: 'Crear nueva empresa' })
  @ApiResponse({ status: 201, description: 'Empresa creada exitosamente' })
  async create(@Body() dto: CreateEmpresaDto) {
    return this.empresasService.create(dto);
  }

  @Get()
  @RequirePermission('empresas:leer')
  @ApiOperation({ summary: 'Listar todas las empresas activas' })
  @ApiResponse({ status: 200, description: 'Lista de empresas' })
  async findAll() {
    return this.empresasService.findAll();
  }

  @Get(':id')
  @RequirePermission('empresas:leer')
  @ApiOperation({ summary: 'Obtener empresa por ID' })
  @ApiResponse({ status: 200, description: 'Empresa encontrada' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  async findOne(@Param('id') id: string) {
    return this.empresasService.findOne(id);
  }
}
