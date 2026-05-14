import { IsEmail, IsOptional, IsString, MinLength, MaxLength, IsUUID, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUsuarioDto {
  @ApiPropertyOptional({ example: 'usuario@empresa.com' })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido.' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'NuevoPassword123!' })
  @IsString({ message: 'La contraseña debe ser texto.' })
  @IsOptional()
  @MinLength(8, { message: 'La contraseña debe tener mínimo 8 caracteres.' })
  password?: string;

  @ApiPropertyOptional({ example: 'Juan' })
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsOptional()
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres.' })
  nombre?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsString({ message: 'El apellido debe ser texto.' })
  @IsOptional()
  @MaxLength(100, { message: 'El apellido no puede tener más de 100 caracteres.' })
  apellido?: string;

  @ApiPropertyOptional({ example: 'jperez' })
  @IsString({ message: 'El nombre de usuario debe ser texto.' })
  @IsOptional()
  @MaxLength(50, { message: 'El nombre de usuario no puede tener más de 50 caracteres.' })
  username?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @IsString({ message: 'La cédula debe ser texto.' })
  @IsOptional()
  @MaxLength(20, { message: 'La cédula no puede tener más de 20 caracteres.' })
  cedula?: string;

  @ApiPropertyOptional({ example: 'Compras' })
  @IsString({ message: 'El área debe ser texto.' })
  @IsOptional()
  @MaxLength(100, { message: 'El área no puede tener más de 100 caracteres.' })
  area?: string;

  @ApiPropertyOptional({ example: 'Calle 123 #45-67' })
  @IsString({ message: 'La dirección debe ser texto.' })
  @IsOptional()
  @MaxLength(255, { message: 'La dirección no puede tener más de 255 caracteres.' })
  direccion?: string;

  @ApiPropertyOptional({ example: 'uuid-del-rol' })
  @IsUUID('4', { message: 'Debe seleccionar un rol válido.' })
  @IsOptional()
  rolId?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'El estado debe ser verdadero o falso.' })
  @IsOptional()
  activo?: boolean;
}
