import {
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProveedorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razonSocial: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['nacional', 'internacional', 'mixto'])
  tipoProveedor?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departamento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['sas', 'sa', 'ltda', 'eu', 'persona_natural', 'otro'])
  tipoEmpresa?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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
}
