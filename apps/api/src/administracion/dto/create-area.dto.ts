import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';

export class CreateAreaDto {
  @ApiProperty({ example: 'ARE-001', description: 'Código único del área' })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiProperty({ example: 'Compras', description: 'Nombre del área' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'uuid-empresa', description: 'ID de la empresa' })
  @IsUUID()
  @IsNotEmpty()
  empresaId: string;

  @ApiProperty({ example: 'uuid-usuario', required: false, description: 'ID del jefe de área' })
  @IsUUID()
  @IsOptional()
  jefeAreaId?: string;

  @ApiProperty({ example: 100000, required: false, description: 'Presupuesto anual del área' })
  @IsOptional()
  @Type(() => Number)
  presupuestoAnual?: number | Decimal;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
