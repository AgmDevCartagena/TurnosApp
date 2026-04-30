import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecepcionesService } from './recepciones.service';
import { CreateRecepcionDto, QueryRecepcionDto } from './dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';

@ApiTags('Recepciones')
@Controller('recepciones')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecepcionesController {
  constructor(private readonly recepcionesService: RecepcionesService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar recepción de orden de compra' })
  create(@Req() req: any, @Body() dto: CreateRecepcionDto) {
    const empresaId = req.user?.activeCompany?.id;
    const recibidoPorId = req.user?.id;
    if (!empresaId || !recibidoPorId) {
      throw new Error('No hay empresa activa o usuario no autenticado');
    }
    return this.recepcionesService.create(empresaId, recibidoPorId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar recepciones' })
  findAll(@Req() req: any, @Query() query: QueryRecepcionDto) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.recepcionesService.findAll(empresaId, query);
  }

  @Get('ordenes-pendientes')
  @ApiOperation({ summary: 'Obtener órdenes pendientes de recepción' })
  getOrdenesPendientes(@Req() req: any) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.recepcionesService.getOrdenesPendientes(empresaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener recepción por ID' })
  findOne(@Req() req: any, @Param('id') id: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.recepcionesService.findOne(empresaId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar recepción' })
  remove(@Req() req: any, @Param('id') id: string) {
    const empresaId = req.user?.activeCompany?.id;
    if (!empresaId) {
      throw new Error('No hay empresa activa');
    }
    return this.recepcionesService.remove(empresaId, id);
  }
}
