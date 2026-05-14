import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'jperez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cedula: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido: string;

  @ApiProperty({ example: 'usuario@empresa.com' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'Calle 123 #45-67' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  direccion?: string;

  @ApiProperty({ example: 'uuid-de-empresa' })
  @IsUUID('4', { message: 'empresaId debe ser un UUID válido' })
  @IsNotEmpty()
  empresaId: string;

  @ApiPropertyOptional({ example: 'Compras' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  area?: string;

  @ApiPropertyOptional({ example: 'uuid-de-centro-costo' })
  @IsUUID('4', { message: 'centroCostoId debe ser un UUID válido' })
  @IsOptional()
  centroCostoId?: string;

  @ApiProperty({ example: 'uuid-del-rol' })
  @IsUUID('4', { message: 'rolId debe ser un UUID válido' })
  @IsNotEmpty()
  rolId: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
