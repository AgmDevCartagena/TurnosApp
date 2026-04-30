import { IsNotEmpty, IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AsignarEmpresaUsuarioDto {
  @ApiProperty({ example: 'uuid-del-usuario' })
  @IsUUID('4', { message: 'usuarioId debe ser un UUID válido' })
  @IsNotEmpty()
  usuarioId: string;

  @ApiProperty({ example: 'uuid-de-empresa' })
  @IsUUID('4', { message: 'empresaId debe ser un UUID válido' })
  @IsNotEmpty()
  empresaId: string;

  @ApiProperty({ example: 'uuid-del-rol' })
  @IsUUID('4', { message: 'rolId debe ser un UUID válido' })
  @IsNotEmpty()
  rolId: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
