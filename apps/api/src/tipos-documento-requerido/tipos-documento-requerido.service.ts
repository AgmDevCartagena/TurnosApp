import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTipoDocumentoDto } from './dto/create-tipo-documento.dto';
import { UpdateTipoDocumentoDto } from './dto/update-tipo-documento.dto';

const TIPOS_DEFAULT = [
  { nombre: 'RUT', descripcion: 'Registro Único Tributario', obligatorio: true, aplicaPersona: 'ambos', aplicaProveedor: 'nacional', requiereVigencia: false, orden: 1 },
  { nombre: 'Cámara de Comercio', descripcion: 'Certificado de existencia y representación legal (vigente)', obligatorio: true, aplicaPersona: 'juridica', aplicaProveedor: 'nacional', requiereVigencia: true, orden: 2 },
  { nombre: 'Cédula de Ciudadanía Rep. Legal', descripcion: 'Documento de identidad del representante legal', obligatorio: true, aplicaPersona: 'juridica', aplicaProveedor: 'todos', requiereVigencia: false, orden: 3 },
  { nombre: 'Cédula de Ciudadanía', descripcion: 'Documento de identidad del titular (persona natural)', obligatorio: true, aplicaPersona: 'natural', aplicaProveedor: 'todos', requiereVigencia: false, orden: 4 },
  { nombre: 'Estados Financieros', descripcion: 'Balance general y estado de resultados del último año', obligatorio: false, aplicaPersona: 'juridica', aplicaProveedor: 'nacional', requiereVigencia: false, orden: 5 },
  { nombre: 'Certificado Bancario', descripcion: 'Certificación de cuenta bancaria activa', obligatorio: true, aplicaPersona: 'ambos', aplicaProveedor: 'todos', requiereVigencia: true, orden: 6 },
  { nombre: 'Referencias Comerciales', descripcion: 'Al menos dos referencias comerciales', obligatorio: false, aplicaPersona: 'ambos', aplicaProveedor: 'todos', requiereVigencia: false, orden: 7 },
];

@Injectable()
export class TiposDocumentoRequeridoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(activo?: boolean) {
    const tipos = await this.prisma.tipoDocumentoRequerido.findMany({
      where: activo !== undefined ? { activo } : {},
      orderBy: { orden: 'asc' },
    });
    if (tipos.length === 0) {
      await this.seed();
      return this.prisma.tipoDocumentoRequerido.findMany({
        where: activo !== undefined ? { activo } : {},
        orderBy: { orden: 'asc' },
      });
    }
    return tipos;
  }

  async findApplicable(tipoPersona: string, tipoProveedor: string) {
    await this.findAll(true);
    return this.prisma.tipoDocumentoRequerido.findMany({
      where: {
        activo: true,
        aplicaPersona: { in: [tipoPersona, 'ambos'] },
        aplicaProveedor: { in: [tipoProveedor, 'todos'] },
      },
      orderBy: { orden: 'asc' },
    });
  }

  async findOne(id: string) {
    const tipo = await this.prisma.tipoDocumentoRequerido.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException(`Tipo de documento ${id} no encontrado`);
    return tipo;
  }

  async create(dto: CreateTipoDocumentoDto) {
    return this.prisma.tipoDocumentoRequerido.create({ data: dto });
  }

  async update(id: string, dto: UpdateTipoDocumentoDto) {
    await this.findOne(id);
    return this.prisma.tipoDocumentoRequerido.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tipoDocumentoRequerido.delete({ where: { id } });
  }

  private async seed() {
    await this.prisma.tipoDocumentoRequerido.createMany({
      data: TIPOS_DEFAULT.map(t => ({ ...t, activo: true })),
      skipDuplicates: true,
    });
  }
}
