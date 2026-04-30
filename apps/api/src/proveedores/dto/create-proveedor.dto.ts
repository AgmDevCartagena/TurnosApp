import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsArray,
  MinLength,
  MaxLength,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  ValidateIf,
  IsIn,
} from 'class-validator';

export class CreateProveedorDto {
  @ApiProperty({ description: 'Razón social (para persona jurídica)' })
  @IsString()
  @ValidateIf((o) => o.tipoPersona === 'juridica')
  @IsNotEmpty({ message: 'Razón social es obligatoria para persona jurídica' })
  @MinLength(3)
  @MaxLength(200)
  razonSocial: string;

  @ApiProperty({ description: 'Nombre completo (para persona natural)', required: false })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.tipoPersona === 'natural')
  @IsNotEmpty({ message: 'Nombre completo es obligatorio para persona natural' })
  @MinLength(3)
  @MaxLength(200)
  nombreCompleto?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nit: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  direccion: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  telefono: string;

  @ApiProperty()
  @IsEmail()
  emailCorporativo: string;

  @ApiProperty({ description: 'Tipo de proveedor', enum: ['nacional', 'internacional', 'mixto'], default: 'nacional' })
  @IsEnum(['nacional', 'internacional', 'mixto'])
  @IsOptional()
  tipoProveedor?: string = 'nacional';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['natural', 'juridica'])
  tipoPersona?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['nit', 'cc', 'ce', 'pasaporte'])
  tipoIdentificacion?: string;

  @ApiProperty({ description: 'ID del país', required: false })
  @IsUUID('4', { message: 'ID de país debe ser un UUID válido' })
  @IsOptional()
  paisId?: string;

  @ApiProperty({ description: 'ID del departamento', required: false })
  @IsUUID('4', { message: 'ID de departamento debe ser un UUID válido' })
  @IsOptional()
  departamentoId?: string;

  @ApiProperty({ description: 'ID de la ciudad', required: false })
  @IsUUID('4', { message: 'ID de ciudad debe ser un UUID válido' })
  @IsOptional()
  ciudadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['sas', 'sa', 'ltda', 'eu', 'persona_natural', 'otro'])
  tipoEmpresa?: string;

  @ApiProperty({ description: 'Fecha de constitución (no puede ser futura)', required: false })
  @IsDateString({}, { message: 'Fecha de constitución debe ser una fecha válida' })
  @IsOptional()
  fechaConstitucion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigoCiiu?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcionActividad?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certificaciones?: string[];

  @ApiProperty({ description: 'Observaciones generales', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  repLegalNombres?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  repLegalApellidos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['cc', 'ce', 'pasaporte'])
  repLegalTipoDoc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  repLegalNumDoc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  repLegalTelefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  repLegalEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['activo', 'borrador'])
  estado?: string;

  // Estados del wizard
  @ApiPropertyOptional({ description: 'Estado de onboarding', enum: ['borrador', 'en_proceso', 'completado'], default: 'borrador' })
  @IsOptional()
  @IsEnum(['borrador', 'en_proceso', 'completado'])
  estadoOnboarding?: string;

  @ApiPropertyOptional({ description: 'Estado operativo', enum: ['activo', 'inactivo', 'suspendido', 'en_evaluacion'], default: 'inactivo' })
  @IsOptional()
  @IsEnum(['activo', 'inactivo', 'suspendido', 'en_evaluacion'])
  estadoOperativo?: string;
}
