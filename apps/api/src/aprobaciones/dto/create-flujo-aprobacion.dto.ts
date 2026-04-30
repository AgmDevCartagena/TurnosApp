import { IsString, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePasoAprobacionDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  orden: number;

  @ApiProperty()
  @IsString()
  aprobadorId: string;
}

export class CreateFlujoAprobacionDto {
  @ApiProperty()
  @IsString()
  solicitudId: string;

  @ApiProperty({ type: [CreatePasoAprobacionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePasoAprobacionDto)
  pasos: CreatePasoAprobacionDto[];
}
