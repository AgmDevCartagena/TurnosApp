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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto, UpdateProveedorDto, ProveedorQueryDto } from './dto';
import { JwtAuthGuard } from '../autenticacion/guards';

@ApiTags('Proveedores')
@Controller('proveedores')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar proveedores con paginación y filtros' })
  @ApiResponse({ status: 200, description: 'Lista de proveedores' })
  findAll(@Query() query: ProveedorQueryDto) {
    return this.proveedoresService.findAll(query);
  }

  @Get('validate/nit')
  @ApiOperation({ summary: 'Validar disponibilidad de NIT' })
  @ApiResponse({ status: 200, description: 'Resultado de validación' })
  validateNit(@Query('nit') nit: string) {
    return this.proveedoresService.validateNit(nit);
  }

  @Get('validate/email')
  @ApiOperation({ summary: 'Validar disponibilidad de email corporativo' })
  @ApiResponse({ status: 200, description: 'Resultado de validación' })
  validateEmail(@Query('email') email: string) {
    return this.proveedoresService.validateEmail(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un proveedor por ID' })
  @ApiResponse({ status: 200, description: 'Proveedor encontrado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.proveedoresService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo proveedor' })
  @ApiResponse({ status: 201, description: 'Proveedor creado' })
  @ApiResponse({ status: 409, description: 'NIT ya registrado' })
  create(@Body() dto: CreateProveedorDto, @Req() req: any) {
    return this.proveedoresService.create(dto, req.user?.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un proveedor' })
  @ApiResponse({ status: 200, description: 'Proveedor actualizado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProveedorDto) {
    return this.proveedoresService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un proveedor (soft delete)' })
  @ApiResponse({ status: 200, description: 'Proveedor desactivado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.proveedoresService.remove(id);
  }
}
