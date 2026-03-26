import { IsNotEmpty, IsString, MaxLength, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRolDto {
  @ApiProperty({ example: 'coordinador' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombre: string;

  @ApiPropertyOptional({ example: 'Coordinador de área' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  descripcion?: string;

  @ApiPropertyOptional({ example: ['uuid-permiso-1', 'uuid-permiso-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  permisoIds?: string[];
}
