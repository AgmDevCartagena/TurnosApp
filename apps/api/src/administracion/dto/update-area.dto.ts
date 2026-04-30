import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';

export class UpdateAreaDto {
  @ApiProperty({ example: 'ARE-001', required: false })
  @IsString()
  @IsOptional()
  codigo?: string;

  @ApiProperty({ example: 'Compras', required: false })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({ example: 'uuid-empresa', required: false })
  @IsUUID()
  @IsOptional()
  empresaId?: string;

  @ApiProperty({ example: 'uuid-usuario', required: false })
  @IsUUID()
  @IsOptional()
  jefeAreaId?: string;

  @ApiProperty({ example: 100000, required: false })
  @IsOptional()
  @Type(() => Number)
  presupuestoAnual?: number | Decimal;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
