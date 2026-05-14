import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsArray,
  ValidateNested,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLineaSolicitudDto {
  @ApiProperty({ example: 'Laptop Dell Latitude 5540' })
  @IsString({ message: 'La descripción del ítem debe ser texto.' })
  @IsNotEmpty({ message: 'La descripción del ítem es obligatoria.' })
  descripcion: string;

  @ApiProperty({ example: 2 })
  @IsNumber({}, { message: 'La cantidad debe ser un número.' })
  @Min(1, { message: 'La cantidad debe ser mayor a cero.' })
  cantidad: number;

  @ApiProperty({ example: 'Unidad' })
  @IsString({ message: 'La unidad de medida debe ser texto.' })
  @IsOptional()
  unidadMedida?: string;

  @ApiPropertyOptional({ example: 'Core i7, 16GB RAM, 512GB SSD' })
  @IsString({ message: 'Las especificaciones deben ser texto.' })
  @IsOptional()
  especificaciones?: string;

  @ApiProperty({ example: 3500000 })
  @IsNumber({}, { message: 'El precio estimado debe ser un número.' })
  @Min(0, { message: 'El precio estimado no puede ser negativo.' })
  @IsOptional()
  precioEstimado?: number;
}

export class CreateSolicitudDto {
  @ApiProperty({ example: 'Compra de equipos de cómputo para oficina' })
  @IsString({ message: 'El título debe ser texto.' })
  @IsNotEmpty({ message: 'El título de la solicitud es obligatorio.' })
  titulo: string;

  @ApiProperty({ example: 'uuid-de-empresa' })
  @IsUUID('4', { message: 'Debe seleccionar una empresa válida.' })
  @IsNotEmpty({ message: 'La empresa es obligatoria.' })
  empresaId: string;

  @ApiPropertyOptional({ example: 'Tecnología' })
  @IsString({ message: 'El área debe ser texto.' })
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
  @IsString({ message: 'La descripción debe ser texto.' })
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 'Necesarios para el área de desarrollo' })
  @IsString({ message: 'La justificación debe ser texto.' })
  @IsNotEmpty({ message: 'La justificación es obligatoria.' })
  justificacion: string;

  @ApiPropertyOptional({ enum: ['borrador', 'enviada'], default: 'borrador' })
  @IsEnum(['borrador', 'enviada'])
  @IsOptional()
  estado?: string = 'borrador';

  @ApiProperty({ type: [CreateLineaSolicitudDto] })
  @IsArray({ message: 'Debe agregar al menos un ítem a la solicitud.' })
  @ValidateNested({ each: true })
  @Type(() => CreateLineaSolicitudDto)
  lineas: CreateLineaSolicitudDto[];
}
