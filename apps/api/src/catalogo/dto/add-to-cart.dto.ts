import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsUUID()
  productoId: string;

  @ApiProperty({ description: 'Cantidad a agregar', default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  cantidad: number = 1;

  @ApiProperty({ description: 'ID del proveedor preferido', required: false })
  @IsOptional()
  @IsUUID()
  proveedorId?: string;

  @ApiProperty({ description: 'Observaciones del ítem', required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
