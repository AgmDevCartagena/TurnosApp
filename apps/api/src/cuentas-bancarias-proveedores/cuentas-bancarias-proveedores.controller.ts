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
import { CuentasBancariasProveedoresService } from './cuentas-bancarias-proveedores.service';
import { CreateCuentaBancariaDto } from './dto/create-cuenta-bancaria.dto';
import { UpdateCuentaBancariaDto } from './dto/update-cuenta-bancaria.dto';

@ApiTags('Cuentas Bancarias Proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('proveedores/:proveedorId/cuentas-bancarias')
export class CuentasBancariasProveedoresController {
  constructor(private readonly service: CuentasBancariasProveedoresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cuentas bancarias de un proveedor' })
  findAll(@Param('proveedorId') proveedorId: string) {
    return this.service.findAllByProveedor(proveedorId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar cuenta bancaria' })
  create(
    @Param('proveedorId') proveedorId: string,
    @Body() dto: CreateCuentaBancariaDto,
  ) {
    return this.service.create(proveedorId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cuenta bancaria' })
  update(@Param('id') id: string, @Body() dto: UpdateCuentaBancariaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cuenta bancaria' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
