import { IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmpresaDto {
  @ApiPropertyOptional({ example: 'Empresa Principal S.A.S.' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  nombre?: string;

  @ApiPropertyOptional({ example: '900123456-1' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  nit?: string;

  @ApiPropertyOptional({ example: 'Empresa Principal S.A.S.' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  razonSocial?: string;

  @ApiPropertyOptional({ example: 'Calle 100 #20-30' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  direccion?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({ example: 'contacto@empresa.com' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
