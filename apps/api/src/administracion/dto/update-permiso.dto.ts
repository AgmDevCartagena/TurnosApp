import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePermisoDto {
  @ApiProperty({ 
    example: 'Ver Solicitudes de Compra', 
    required: false 
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({ 
    example: 'Permite ver y consultar todas las solicitudes de compra del sistema', 
    required: false 
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ 
    example: true, 
    required: false 
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
