import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsDecimal,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateSocioDto {
  @ApiProperty({ example: 'cc', description: 'cc | ce | nit | pasaporte | pep' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['cc', 'ce', 'nit', 'pasaporte', 'pep'])
  tipoDoc: string;

  @ApiProperty({ example: '900123456-7' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^[\d\-]+$/, { message: 'Solo se permiten dígitos y guiones' })
  numeroDoc: string;

  @ApiProperty({ example: 'Inversiones ABC S.A.S.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombreRazon: string;

  @ApiProperty({ example: '25.50', description: 'Porcentaje > 5 y <= 100, máx 2 decimales' })
  @IsDecimal({ decimal_digits: '0,2', locale: 'en-US' }, { message: 'Máximo 2 decimales' })
  participacion: string;

  @ApiPropertyOptional({ example: 'directa', description: 'directa | indirecta' })
  @IsString()
  @IsIn(['directa', 'indirecta'])
  tipoParticipacion: string;
}
