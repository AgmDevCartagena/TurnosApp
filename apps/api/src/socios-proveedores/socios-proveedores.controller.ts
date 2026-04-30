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
import { SociosProveedoresService } from './socios-proveedores.service';
import { CreateSocioDto } from './dto/create-socio.dto';
import { UpdateSocioDto } from './dto/update-socio.dto';

@ApiTags('Socios Proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('proveedores/:proveedorId/socios')
export class SociosProveedoresController {
  constructor(private readonly service: SociosProveedoresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar socios/accionistas de un proveedor' })
  findAll(@Param('proveedorId') proveedorId: string) {
    return this.service.findAllByProveedor(proveedorId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar socio/accionista' })
  create(@Param('proveedorId') proveedorId: string, @Body() dto: CreateSocioDto) {
    return this.service.create(proveedorId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar socio/accionista' })
  update(@Param('id') id: string, @Body() dto: UpdateSocioDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar socio/accionista' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
