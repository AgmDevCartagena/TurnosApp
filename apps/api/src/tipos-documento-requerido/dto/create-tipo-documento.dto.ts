import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn, IsInt, Min, MaxLength } from 'class-validator';

export class CreateTipoDocumentoDto {
  @ApiProperty({ example: 'RUT' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ example: 'Registro Único Tributario' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  @ApiPropertyOptional({ enum: ['natural', 'juridica', 'ambos'], default: 'ambos' })
  @IsOptional()
  @IsString()
  @IsIn(['natural', 'juridica', 'ambos'])
  aplicaPersona?: string;

  @ApiPropertyOptional({ enum: ['nacional', 'internacional', 'todos'], default: 'todos' })
  @IsOptional()
  @IsString()
  @IsIn(['nacional', 'internacional', 'todos'])
  aplicaProveedor?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiereVigencia?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
