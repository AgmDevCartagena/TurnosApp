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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudDto, UpdateSolicitudDto, SolicitudQueryDto } from './dto';

@ApiTags('Solicitudes de Compra')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar solicitudes de compra' })
  findAll(@Query() query: SolicitudQueryDto) {
    return this.solicitudesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener solicitud por ID' })
  findOne(@Param('id') id: string) {
    return this.solicitudesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva solicitud de compra' })
  create(@Body() dto: CreateSolicitudDto, @Request() req: any) {
    return this.solicitudesService.create(dto, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar solicitud de compra' })
  update(@Param('id') id: string, @Body() dto: UpdateSolicitudDto) {
    return this.solicitudesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar/cancelar solicitud' })
  remove(@Param('id') id: string) {
    return this.solicitudesService.remove(id);
  }
}
