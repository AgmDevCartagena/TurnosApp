import { PartialType } from '@nestjs/swagger';
import { CreateAtributoDto } from './create-atributo.dto';

export class UpdateAtributoDto extends PartialType(CreateAtributoDto) {}
