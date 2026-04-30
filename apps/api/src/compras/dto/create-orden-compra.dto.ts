import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLineaOrdenDto {
  @ApiProperty()
  @IsString()
  bienServicioId: string;

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
}

export class CreateOrdenCompraDto {
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

  @ApiProperty()
  @IsString()
  condicionesPago: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaEmision?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaEntregaEstimada?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ type: [CreateLineaOrdenDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLineaOrdenDto)
  lineas: CreateLineaOrdenDto[];
}
