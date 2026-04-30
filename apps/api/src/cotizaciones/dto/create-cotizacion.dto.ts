import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLineaCotizacionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lineaSolicitudId?: string;

  @ApiProperty()
  @IsString()
  descripcion: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  cantidad: number;

  @ApiProperty()
  @IsString()
  unidadMedida: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  precioUnitario: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  impuesto?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class CreateCotizacionDto {
  @ApiProperty()
  @IsString()
  solicitudId: string;

  @ApiProperty()
  @IsString()
  proveedorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaSolicitud?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaRespuesta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  tiempoEntrega?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  condicionesPago?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  garantia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  validezOferta?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moneda?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  calificacion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  historico?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentoAdjunto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  seleccionada?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivoRechazo?: string;

  @ApiProperty({ type: [CreateLineaCotizacionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLineaCotizacionDto)
  lineas: CreateLineaCotizacionDto[];
}
