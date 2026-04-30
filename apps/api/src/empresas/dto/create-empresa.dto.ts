import { IsNotEmpty, IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmpresaDto {
  @ApiProperty({ example: 'AGM DESARROLLOS SAS' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @ApiProperty({ example: '900.000.000-1' })
  @IsString()
  @IsNotEmpty({ message: 'El NIT es requerido' })
  nit: string;

  @ApiProperty({ example: 'AGM DESARROLLOS SAS' })
  @IsString()
  @IsNotEmpty({ message: 'La razón social es requerida' })
  razonSocial: string;

  @ApiProperty({ required: false, example: 'Calle 123 #45-67' })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiProperty({ required: false, example: '+57 300 123 4567' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({ required: false, example: 'contacto@agm.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  grupoId?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
