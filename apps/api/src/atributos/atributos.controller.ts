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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AtributosService } from './atributos.service';
import { CreateAtributoDto, UpdateAtributoDto, QueryAtributoDto } from './dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';

@ApiTags('Atributos Dinámicos')
@Controller('atributos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AtributosController {
  constructor(private readonly atributosService: AtributosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear atributo dinámico' })
  create(@Body() dto: CreateAtributoDto) {
    return this.atributosService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar atributos dinámicos' })
  findAll(@Query() query: QueryAtributoDto) {
    return this.atributosService.findAll(query);
  }

  @Get('categorias')
  @ApiOperation({ summary: 'Obtener lista de categorías' })
  getCategorias() {
    return this.atributosService.getCategorias();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener atributo por ID' })
  findOne(@Param('id') id: string) {
    return this.atributosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar atributo' })
  update(@Param('id') id: string, @Body() dto: UpdateAtributoDto) {
    return this.atributosService.update(id, dto);
  }

  @Patch(':id/toggle-activo')
  @ApiOperation({ summary: 'Activar/desactivar atributo' })
  toggleActivo(@Param('id') id: string) {
    return this.atributosService.toggleActivo(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar atributo' })
  remove(@Param('id') id: string) {
    return this.atributosService.remove(id);
  }
}
