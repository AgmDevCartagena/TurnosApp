import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { DocumentosProveedoresService } from './documentos-proveedores.service';
import { CreateDocumentoProveedorDto } from './dto/create-documento-proveedor.dto';
import { UpdateDocumentoProveedorDto } from './dto/update-documento-proveedor.dto';

@ApiTags('Documentos Proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('proveedores/:proveedorId/documentos-wizard')
export class DocumentosProveedoresController {
  constructor(private readonly service: DocumentosProveedoresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar documentos cargados por el proveedor' })
  findAll(@Param('proveedorId') proveedorId: string) {
    return this.service.findAllByProveedor(proveedorId);
  }

  @Get('pendientes')
  @ApiOperation({ summary: 'Verificar documentos obligatorios pendientes' })
  checkPendientes(
    @Param('proveedorId') proveedorId: string,
    @Body() body: { tipoPersona: string; tipoProveedor: string },
  ) {
    return this.service.checkPendientes(
      proveedorId,
      body.tipoPersona ?? 'juridica',
      body.tipoProveedor ?? 'nacional',
    );
  }

  @Post()
  @ApiOperation({ summary: 'Registrar o actualizar documento del proveedor (upsert por tipo)' })
  upsert(
    @Param('proveedorId') proveedorId: string,
    @Body() dto: CreateDocumentoProveedorDto,
  ) {
    return this.service.upsert(proveedorId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar documento del proveedor' })
  update(@Param('id') id: string, @Body() dto: UpdateDocumentoProveedorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar documento del proveedor' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
