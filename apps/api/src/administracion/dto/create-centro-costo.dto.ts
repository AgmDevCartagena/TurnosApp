import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCentroCostoDto {
  @ApiProperty({ example: 'CC-001', description: 'Código único del centro de costo' })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiProperty({ example: 'Operaciones', description: 'Nombre del centro de costo' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Centro de costo para operaciones', required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 'uuid-empresa', description: 'ID de la empresa' })
  @IsUUID()
  @IsNotEmpty()
  empresaId: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
