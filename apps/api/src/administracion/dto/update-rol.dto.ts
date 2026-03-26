import { IsOptional, IsString, MaxLength, IsArray, IsUUID, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRolDto {
  @ApiPropertyOptional({ example: 'coordinador' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  nombre?: string;

  @ApiPropertyOptional({ example: 'Coordinador de área' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  descripcion?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiPropertyOptional({ example: ['uuid-permiso-1', 'uuid-permiso-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  permisoIds?: string[];
}
