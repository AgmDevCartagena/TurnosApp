import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsBoolean, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CatalogQueryDto {
  @ApiProperty({ description: 'Número de página', required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ description: 'Elementos por página', required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({ description: 'Término de búsqueda', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'ID de categoría', required: false })
  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @ApiProperty({ description: 'Marca', required: false })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiProperty({ description: 'Solo productos destacados', required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  destacado?: boolean;

  @ApiProperty({ description: 'Solo productos nuevos', required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  nuevo?: boolean;

  @ApiProperty({ description: 'Solo productos en oferta', required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enOferta?: boolean;

  @ApiProperty({ description: 'Precio mínimo', required: false })
  @IsOptional()
  @Type(() => Number)
  precioMin?: number;

  @ApiProperty({ description: 'Precio máximo', required: false })
  @IsOptional()
  @Type(() => Number)
  precioMax?: number;

  @ApiProperty({ description: 'Campo de ordenamiento', required: false, default: 'ordenVisualizacion' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'ordenVisualizacion';

  @ApiProperty({ description: 'Orden ascendente o descendente', required: false, default: 'asc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
