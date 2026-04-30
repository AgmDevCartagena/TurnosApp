import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsEnum } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ description: 'ID del centro de costo' })
  @IsUUID()
  centroCostoId: string;

  @ApiProperty({ description: 'Prioridad de la solicitud', enum: ['baja', 'media', 'alta', 'urgente'] })
  @IsEnum(['baja', 'media', 'alta', 'urgente'])
  prioridad: string = 'media';

  @ApiProperty({ description: 'Justificación de la compra' })
  @IsString()
  justificacion: string;

  @ApiProperty({ description: 'Título de la solicitud', required: false })
  @IsOptional()
  @IsString()
  titulo?: string;

  @ApiProperty({ description: 'Observaciones generales', required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ description: 'Fecha requerida en formato ISO', required: false })
  @IsOptional()
  @IsString()
  fechaRequerida?: string;
}
