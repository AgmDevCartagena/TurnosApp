import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { TiposDocumentoRequeridoService } from './tipos-documento-requerido.service';
import { CreateTipoDocumentoDto } from './dto/create-tipo-documento.dto';
import { UpdateTipoDocumentoDto } from './dto/update-tipo-documento.dto';

@ApiTags('Tipos Documento Requerido')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tipos-documento-requerido')
export class TiposDocumentoRequeridoController {
  constructor(private readonly service: TiposDocumentoRequeridoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tipos de documento (maestro)' })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  findAll(@Query('activo') activo?: string) {
    const activoFilter = activo === undefined ? undefined : activo === 'true';
    return this.service.findAll(activoFilter);
  }

  @Get('aplicables')
  @ApiOperation({ summary: 'Obtener tipos aplicables según tipo de persona y proveedor' })
  @ApiQuery({ name: 'tipoPersona', required: true })
  @ApiQuery({ name: 'tipoProveedor', required: true })
  findApplicable(
    @Query('tipoPersona') tipoPersona: string,
    @Query('tipoProveedor') tipoProveedor: string,
  ) {
    return this.service.findApplicable(tipoPersona, tipoProveedor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tipo de documento por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear tipo de documento requerido' })
  create(@Body() dto: CreateTipoDocumentoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar tipo de documento requerido' })
  update(@Param('id') id: string, @Body() dto: UpdateTipoDocumentoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar tipo de documento requerido' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
