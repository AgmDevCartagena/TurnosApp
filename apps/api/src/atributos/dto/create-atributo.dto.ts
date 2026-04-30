import { IsString, IsBoolean, IsOptional, IsInt, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAtributoDto {
  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiProperty()
  @IsString()
  categoria: string;

  @ApiProperty({ enum: ['TEXTO', 'NUMERO', 'LISTA', 'BOOLEANO'] })
  @IsString()
  @IsIn(['TEXTO', 'NUMERO', 'LISTA', 'BOOLEANO'])
  tipoDato: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  valores?: string; // JSON string array para tipo LISTA

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  orden?: number;
}
