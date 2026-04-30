import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDocumentoProveedorDto } from './dto/create-documento-proveedor.dto';
import { UpdateDocumentoProveedorDto } from './dto/update-documento-proveedor.dto';

@Injectable()
export class DocumentosProveedoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByProveedor(proveedorId: string) {
    await this.assertProveedorExists(proveedorId);
    return this.prisma.documentoProveedor.findMany({
      where: { proveedorId },
      include: { tipoDocumento: true },
      orderBy: { tipoDocumento: { orden: 'asc' } },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.documentoProveedor.findUnique({
      where: { id },
      include: { tipoDocumento: true },
    });
    if (!doc) throw new NotFoundException(`Documento ${id} no encontrado`);
    return doc;
  }

  async upsert(proveedorId: string, dto: CreateDocumentoProveedorDto) {
    await this.assertProveedorExists(proveedorId);

    const data = {
      proveedorId,
      tipoDocumentoId: dto.tipoDocumentoId,
      nombre: dto.nombre,
      url: dto.url ?? null,
      fechaExpedicion: dto.fechaExpedicion ? new Date(dto.fechaExpedicion) : null,
      fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
      observaciones: dto.observaciones ?? null,
      estado: this.resolveEstado(dto.fechaVencimiento),
    };

    return this.prisma.documentoProveedor.upsert({
      where: {
        proveedorId_tipoDocumentoId: {
          proveedorId,
          tipoDocumentoId: dto.tipoDocumentoId,
        },
      },
      create: data,
      update: data,
      include: { tipoDocumento: true },
    });
  }

  async update(id: string, dto: UpdateDocumentoProveedorDto) {
    await this.findOne(id);
    return this.prisma.documentoProveedor.update({
      where: { id },
      data: {
        ...dto,
        fechaExpedicion: dto.fechaExpedicion ? new Date(dto.fechaExpedicion) : undefined,
        fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : undefined,
        estado: dto.fechaVencimiento ? this.resolveEstado(dto.fechaVencimiento) : undefined,
      },
      include: { tipoDocumento: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.documentoProveedor.delete({ where: { id } });
  }

  async checkPendientes(proveedorId: string, tipoPersona: string, tipoProveedor: string) {
    const tiposRequeridos = await this.prisma.tipoDocumentoRequerido.findMany({
      where: {
        activo: true,
        obligatorio: true,
        aplicaPersona: { in: [tipoPersona, 'ambos'] },
        aplicaProveedor: { in: [tipoProveedor, 'todos'] },
      },
    });

    const cargados = await this.prisma.documentoProveedor.findMany({
      where: { proveedorId, estado: 'cargado' },
    });

    const cargadosIds = new Set(cargados.map(c => c.tipoDocumentoId));

    const pendientes = tiposRequeridos.filter(t => !cargadosIds.has(t.id));
    return { pendientes, total: tiposRequeridos.length, cargados: cargados.length };
  }

  private resolveEstado(fechaVencimiento?: string): string {
    if (!fechaVencimiento) return 'cargado';
    return new Date(fechaVencimiento) < new Date() ? 'vencido' : 'cargado';
  }

  private async assertProveedorExists(proveedorId: string) {
    const prov = await this.prisma.proveedor.findUnique({ where: { id: proveedorId } });
    if (!prov) throw new NotFoundException(`Proveedor ${proveedorId} no encontrado`);
    return prov;
  }
}
