import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { SucursalesProveedoresService } from './sucursales-proveedores.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';

@ApiTags('Sucursales Proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('proveedores/:proveedorId/sucursales')
export class SucursalesProveedoresController {
  constructor(private readonly service: SucursalesProveedoresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar sucursales de un proveedor' })
  findAll(@Param('proveedorId') proveedorId: string) {
    return this.service.findAllByProveedor(proveedorId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear sucursal para un proveedor' })
  create(@Param('proveedorId') proveedorId: string, @Body() dto: CreateSucursalDto) {
    return this.service.create(proveedorId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar sucursal' })
  update(@Param('id') id: string, @Body() dto: UpdateSucursalDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar sucursal' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
