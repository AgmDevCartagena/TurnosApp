import { IsString, IsNotEmpty, IsOptional, IsBoolean, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermisoDto {
  @ApiProperty({ 
    example: 'requests.view', 
    description: 'Código único del permiso en formato modulo.accion',
    pattern: '^[a-z_]+\\.[a-z_]+$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z_]+\.[a-z_]+$/, {
    message: 'El código debe tener el formato modulo.accion (ej: requests.view)'
  })
  codigo: string;

  @ApiProperty({ 
    example: 'Ver Solicitudes', 
    description: 'Nombre legible del permiso' 
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ 
    example: 'requests', 
    description: 'Módulo al que pertenece el permiso',
    enum: [
      'dashboard', 'requests', 'approvals', 'quotes', 'orders',
      'users', 'roles', 'permissions', 'companies', 'areas',
      'cost_centers', 'suppliers', 'catalog', 'inventory',
      'reports', 'settings'
    ]
  })
  @IsString()
  @IsNotEmpty()
  modulo: string;

  @ApiProperty({ 
    example: 'view', 
    description: 'Acción que permite el permiso',
    enum: ['view', 'create', 'update', 'delete', 'approve', 'reject', 'export', 'import', 'manage', 'assign', 'configure']
  })
  @IsString()
  @IsNotEmpty()
  accion: string;

  @ApiProperty({ 
    example: 'Permite ver y consultar solicitudes de compra', 
    required: false 
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ 
    example: true, 
    required: false, 
    default: true 
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
