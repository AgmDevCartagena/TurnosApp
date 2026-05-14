import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { AsistenteService } from './asistente.service';

export class ConsultaDto {
  @ApiProperty({ example: '¿Cuál proveedor tiene el menor precio?' })
  @IsString({ message: 'La pregunta debe ser texto.' })
  @IsNotEmpty({ message: 'La pregunta es obligatoria.' })
  pregunta: string;

  @ApiProperty({ example: 'uuid-empresa', required: false })
  @IsUUID('4', { message: 'El ID de empresa no es válido.' })
  @IsOptional()
  empresaId?: string;
}

@ApiTags('Asistente IA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('asistente')
export class AsistenteController {
  constructor(private readonly asistenteService: AsistenteService) {}

  @Post('consulta')
  @ApiOperation({ summary: 'Realizar consulta al asistente inteligente de compras' })
  async consultar(@Body() dto: ConsultaDto): Promise<Record<string, unknown>> {
    return this.asistenteService.consultar(dto) as unknown as Record<string, unknown>;
  }
}
