import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsArray, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductoDto {
  @ApiProperty({ description: 'ID del bien/servicio base' })
  @IsUUID()
  bienServicioId: string;

  @ApiProperty({ description: 'SKU único del producto' })
  @IsString()
  sku: string;

  @ApiProperty({ description: 'Slug único para URL' })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Nombre corto del producto' })
  @IsString()
  nombreCorto: string;

  @ApiProperty({ description: 'Descripción corta', required: false })
  @IsOptional()
  @IsString()
  descripcionCorta?: string;

  @ApiProperty({ description: 'Descripción larga', required: false })
  @IsOptional()
  @IsString()
  descripcionLarga?: string;

  @ApiProperty({ description: 'Marca del producto', required: false })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiProperty({ description: 'Modelo del producto', required: false })
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiProperty({ description: 'URL de la imagen principal', required: false })
  @IsOptional()
  @IsString()
  imagenPrincipal?: string;

  @ApiProperty({ description: 'URLs de imágenes adicionales', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagenesAdicionales?: string[];

  @ApiProperty({ description: 'URL de la ficha técnica', required: false })
  @IsOptional()
  @IsString()
  fichatecnicaUrl?: string;

  @ApiProperty({ description: 'Stock disponible', required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stockDisponible?: number;

  @ApiProperty({ description: 'Stock mínimo', required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stockMinimo?: number;

  @ApiProperty({ description: 'Tiempo de entrega en días', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  tiempoEntregaDias?: number;

  @ApiProperty({ description: 'Producto destacado', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  destacado?: boolean;

  @ApiProperty({ description: 'Producto nuevo', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  nuevo?: boolean;

  @ApiProperty({ description: 'Producto en oferta', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  enOferta?: boolean;

  @ApiProperty({ description: 'Precio referencial', required: false })
  @IsOptional()
  @Type(() => Number)
  precioReferencial?: number;

  @ApiProperty({ description: 'Visible en catálogo', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  visibleCatalogo?: boolean;

  @ApiProperty({ description: 'Orden de visualización', required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  ordenVisualizacion?: number;

  @ApiProperty({ description: 'Metadatos adicionales en JSON', required: false })
  @IsOptional()
  metadatos?: any;
}
