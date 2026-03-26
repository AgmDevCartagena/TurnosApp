import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLineaSolicitudDto {
  @ApiProperty({ example: 'Laptop Dell Latitude 5540' })
  @IsString()
  descripcion: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  cantidad: number;

  @ApiProperty({ example: 'Unidad' })
  @IsString()
  @IsOptional()
  unidadMedida?: string = 'Unidad';

  @ApiPropertyOptional({ example: 'Core i7, 16GB RAM, 512GB SSD' })
  @IsString()
  @IsOptional()
  especificaciones?: string;

  @ApiProperty({ example: 3500000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  precioEstimado?: number = 0;
}

export class CreateSolicitudDto {
  @ApiProperty({ example: 'Compra de equipos de cómputo para oficina' })
  @IsString()
  titulo: string;

  @ApiPropertyOptional({ example: 'Tecnología' })
  @IsString()
  @IsOptional()
  departamento?: string;

  @ApiPropertyOptional({ example: 'Equipos y Tecnología' })
  @IsString()
  @IsOptional()
  categoria?: string;

  @ApiPropertyOptional({ enum: ['baja', 'media', 'alta', 'urgente'], default: 'media' })
  @IsEnum(['baja', 'media', 'alta', 'urgente'])
  @IsOptional()
  prioridad?: string = 'media';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  centroCostoId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  fechaRequerida?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsInt()
  @IsOptional()
  tiempoEntrega?: number;

  @ApiPropertyOptional({ enum: ['COP', 'USD', 'EUR'], default: 'COP' })
  @IsEnum(['COP', 'USD', 'EUR'])
  @IsOptional()
  moneda?: string = 'COP';

  @ApiPropertyOptional({ example: 'Se requieren equipos para el nuevo personal' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 'Necesarios para el área de desarrollo' })
  @IsString()
  justificacion: string;

  @ApiPropertyOptional({ enum: ['borrador', 'enviada'], default: 'borrador' })
  @IsEnum(['borrador', 'enviada'])
  @IsOptional()
  estado?: string = 'borrador';

  @ApiProperty({ type: [CreateLineaSolicitudDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLineaSolicitudDto)
  lineas: CreateLineaSolicitudDto[];
}
