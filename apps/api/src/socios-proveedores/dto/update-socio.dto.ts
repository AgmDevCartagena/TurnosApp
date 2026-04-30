import { PartialType } from '@nestjs/swagger';
import { CreateSocioDto } from './create-socio.dto';

export class UpdateSocioDto extends PartialType(CreateSocioDto) {}
