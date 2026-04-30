import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComprasService } from './compras.service';
import { CreateOrdenCompraDto, UpdateOrdenCompraDto, QueryOrdenCompraDto } from './dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';

@ApiTags('Órdenes de Compra')
@Controller('ordenes-compra')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear orden de compra' })
  create(@Req() req: any, @Body() dto: CreateOrdenCompraDto) {
    const empresaId = req.user?.activeCompany?.id;
    const creadorId = req.user?.id;
    if (!empresaId || !creadorId) {
      throw new Error('No hay empresa activa o usuario no autenticado');
    }
    return this.comprasService.create(empresaId, creadorId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar órdenes de compra' })
  findAll(@Req() req: any, @Query() query: QueryOrdenCompraDto) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.comprasService.findAll(empresaId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener orden de compra por ID' })
  findOne(@Req() req: any, @Param('id') id: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.comprasService.findOne(empresaId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar orden de compra' })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateOrdenCompraDto) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.comprasService.update(empresaId, id, dto);
  }

  @Post(':id/emitir')
  @ApiOperation({ summary: 'Emitir orden de compra' })
  emitir(@Req() req: any, @Param('id') id: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.comprasService.emitir(empresaId, id);
  }

  @Post(':id/enviar-proveedor')
  @ApiOperation({ summary: 'Enviar orden al proveedor' })
  enviarProveedor(@Req() req: any, @Param('id') id: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.comprasService.enviarProveedor(empresaId, id);
  }

  @Post(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar orden de compra' })
  cancelar(@Req() req: any, @Param('id') id: string, @Body('motivo') motivo: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.comprasService.cancelar(empresaId, id, motivo);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar orden de compra' })
  remove(@Req() req: any, @Param('id') id: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.comprasService.remove(empresaId, id);
  }
}
