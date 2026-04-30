import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecepcionDto {
  @ApiProperty()
  @IsString()
  ordenCompraId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaRecepcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
