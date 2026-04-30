import { PartialType } from '@nestjs/swagger';
import { CreateDocumentoProveedorDto } from './create-documento-proveedor.dto';

export class UpdateDocumentoProveedorDto extends PartialType(CreateDocumentoProveedorDto) {}
