import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @ApiProperty({ description: 'Nueva cantidad', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  cantidad?: number;

  @ApiProperty({ description: 'Observaciones del ítem', required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
