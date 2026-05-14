import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'jperez' })
  @IsString({ message: 'El nombre de usuario debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio.' })
  @MaxLength(50, { message: 'El nombre de usuario no puede tener más de 50 caracteres.' })
  username: string;

  @ApiProperty({ example: '12345678' })
  @IsString({ message: 'La cédula debe ser texto.' })
  @IsNotEmpty({ message: 'La cédula es obligatoria.' })
  @MaxLength(20, { message: 'La cédula no puede tener más de 20 caracteres.' })
  cedula: string;

  @ApiProperty({ example: 'Juan' })
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres.' })
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString({ message: 'El apellido debe ser texto.' })
  @IsNotEmpty({ message: 'El apellido es obligatorio.' })
  @MaxLength(100, { message: 'El apellido no puede tener más de 100 caracteres.' })
  apellido: string;

  @ApiProperty({ example: 'usuario@empresa.com' })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString({ message: 'La contraseña debe ser texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(8, { message: 'La contraseña debe tener mínimo 8 caracteres.' })
  password: string;

  @ApiPropertyOptional({ example: 'Calle 123 #45-67' })
  @IsString({ message: 'La dirección debe ser texto.' })
  @IsOptional()
  @MaxLength(255, { message: 'La dirección no puede tener más de 255 caracteres.' })
  direccion?: string;

  @ApiProperty({ example: 'uuid-de-empresa' })
  @IsUUID('4', { message: 'Debe seleccionar una empresa válida.' })
  @IsNotEmpty({ message: 'La empresa es obligatoria.' })
  empresaId: string;

  @ApiPropertyOptional({ example: 'Compras' })
  @IsString({ message: 'El área debe ser texto.' })
  @IsOptional()
  @MaxLength(100, { message: 'El área no puede tener más de 100 caracteres.' })
  area?: string;

  @ApiPropertyOptional({ example: 'uuid-de-centro-costo' })
  @IsUUID('4', { message: 'Debe seleccionar un centro de costo válido.' })
  @IsOptional()
  centroCostoId?: string;

  @ApiProperty({ example: 'uuid-del-rol' })
  @IsUUID('4', { message: 'Debe seleccionar un rol válido.' })
  @IsNotEmpty({ message: 'El rol es obligatorio.' })
  rolId: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'El estado debe ser verdadero o falso.' })
  @IsOptional()
  activo?: boolean;
}
