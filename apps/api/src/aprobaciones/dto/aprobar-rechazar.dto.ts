import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AprobarRechazarDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comentario?: string;
}
