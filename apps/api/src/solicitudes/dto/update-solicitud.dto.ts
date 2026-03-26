import { PartialType } from '@nestjs/swagger';
import { CreateSolicitudDto } from './create-solicitud.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSolicitudDto extends PartialType(CreateSolicitudDto) {
  @ApiPropertyOptional({
    enum: ['borrador', 'enviada', 'en_aprobacion', 'aprobada', 'rechazada', 'cancelada'],
  })
  @IsEnum(['borrador', 'enviada', 'en_aprobacion', 'aprobada', 'rechazada', 'cancelada'])
  @IsOptional()
  estado?: string;
}
