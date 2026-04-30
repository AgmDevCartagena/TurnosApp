import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn, Matches, MaxLength } from 'class-validator';

export class CreateCuentaBancariaDto {
  @ApiProperty({ example: 'Empresa Ejemplo S.A.S.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  titularCuenta: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^\d+$/, { message: 'El número de cuenta debe contener solo dígitos' })
  numeroCuenta: string;

  @ApiProperty({ example: 'ahorros', enum: ['ahorros', 'corriente'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ahorros', 'corriente'])
  tipoCuenta: string;

  @ApiProperty({ example: 'Bancolombia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  banco: string;

  @ApiProperty({ example: 'Bogotá D.C.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ciudad: string;

  @ApiProperty({ example: 'contado', enum: ['contado', 'credito_15', 'credito_mas_15'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['contado', 'credito_15', 'credito_mas_15'])
  condicionPago: string;
}
