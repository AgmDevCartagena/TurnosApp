import { PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsIn,
  IsBoolean,
  IsDecimal,
  IsDateString,
  IsArray,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProveedorDto } from './create-proveedor.dto';

export class UpdateProveedorDto extends PartialType(CreateProveedorDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['activo', 'inactivo', 'suspendido', 'en_evaluacion', 'borrador'])
  estado?: string;

  // ── Datos Tributarios ──────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regimenIva?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  esAutorretenedorRenta?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  resolucionRentaNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  resolucionRentaFecha?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  resolucionRentaPct?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  esGranContribuyente?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  resolucionGcNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  resolucionGcFecha?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actividadesIca?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigoIca?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  municipioIca?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  esAutorretenedorIca?: boolean;

  // ── Experiencia en el Mercado ──────────────────
  @ApiPropertyOptional({ enum: ['menos_1_anio', 'de_1_5_anios', 'mas_5_anios'] })
  @IsOptional()
  @IsString()
  @IsIn(['menos_1_anio', 'de_1_5_anios', 'mas_5_anios'])
  rangoExperiencia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'La descripción debe contener mínimo 20 caracteres (RN-03)' })
  @MaxLength(500)
  descripcionExperiencia?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certificaciones?: string[];
}
