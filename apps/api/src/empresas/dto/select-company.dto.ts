import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectCompanyDto {
  @ApiProperty({ 
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID de la empresa a seleccionar'
  })
  @IsUUID()
  @IsNotEmpty({ message: 'El ID de la empresa es requerido' })
  companyId: string;
}
