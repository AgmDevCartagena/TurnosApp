import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateSucursalDto {
  @ApiProperty({ example: 'Calle 100 # 15-20, Piso 5' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  direccion: string;

  @ApiProperty({ example: 'Bogotá D.C.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ciudad: string;

  @ApiPropertyOptional({ example: 'Colombia' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pais?: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/, {
    message: 'El contacto solo debe contener letras y espacios',
  })
  contacto: string;

  @ApiProperty({ example: '310 123 4567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^\+?[\d\s\-()]{7,20}$/, {
    message: 'Formato de teléfono inválido',
  })
  telefono: string;

  @ApiPropertyOptional({ example: '604 987 6544' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[\d\s\-()]{7,20}$/, {
    message: 'Formato de fax inválido',
  })
  fax?: string;
}
