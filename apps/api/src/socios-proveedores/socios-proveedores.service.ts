import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSocioDto } from './dto/create-socio.dto';
import { UpdateSocioDto } from './dto/update-socio.dto';

const MIN_PARTICIPACION = 5;
const MAX_TOTAL = 100;

@Injectable()
export class SociosProveedoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByProveedor(proveedorId: string) {
    await this.assertProveedorExists(proveedorId);
    return this.prisma.socioProveedor.findMany({
      where: { proveedorId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const socio = await this.prisma.socioProveedor.findUnique({ where: { id } });
    if (!socio) throw new NotFoundException(`Socio ${id} no encontrado`);
    return socio;
  }

  async create(proveedorId: string, dto: CreateSocioDto) {
    await this.assertProveedorExists(proveedorId);

    const participacion = parseFloat(dto.participacion);

    if (participacion <= MIN_PARTICIPACION) {
      throw new BadRequestException(
        `La participación debe ser mayor al ${MIN_PARTICIPACION}% (RN-01)`,
      );
    }

    await this.assertNoDuplicate(proveedorId, dto.tipoDoc, dto.numeroDoc);
    await this.assertTotalNoExcede(proveedorId, participacion);

    return this.prisma.socioProveedor.create({
      data: {
        proveedorId,
        tipoDoc: dto.tipoDoc,
        numeroDoc: dto.numeroDoc,
        nombreRazon: dto.nombreRazon,
        participacion,
        tipoParticipacion: dto.tipoParticipacion ?? 'directa',
      },
    });
  }

  async update(id: string, dto: UpdateSocioDto) {
    const existing = await this.findOne(id);

    const participacion =
      dto.participacion !== undefined ? parseFloat(dto.participacion) : undefined;

    if (participacion !== undefined && participacion <= MIN_PARTICIPACION) {
      throw new BadRequestException(
        `La participación debe ser mayor al ${MIN_PARTICIPACION}% (RN-01)`,
      );
    }

    if (
      (dto.tipoDoc || dto.numeroDoc) &&
      (dto.tipoDoc !== existing.tipoDoc || dto.numeroDoc !== existing.numeroDoc)
    ) {
      await this.assertNoDuplicate(
        existing.proveedorId,
        dto.tipoDoc ?? existing.tipoDoc,
        dto.numeroDoc ?? existing.numeroDoc,
        id,
      );
    }

    if (participacion !== undefined) {
      await this.assertTotalNoExcede(existing.proveedorId, participacion, id);
    }

    return this.prisma.socioProveedor.update({
      where: { id },
      data: {
        ...(dto.tipoDoc && { tipoDoc: dto.tipoDoc }),
        ...(dto.numeroDoc && { numeroDoc: dto.numeroDoc }),
        ...(dto.nombreRazon && { nombreRazon: dto.nombreRazon }),
        ...(participacion !== undefined && { participacion }),
        ...(dto.tipoParticipacion && { tipoParticipacion: dto.tipoParticipacion }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.socioProveedor.delete({ where: { id } });
  }

  // ── helpers ────────────────────────────────────
  private async assertProveedorExists(proveedorId: string) {
    const prov = await this.prisma.proveedor.findUnique({ where: { id: proveedorId } });
    if (!prov) throw new NotFoundException(`Proveedor ${proveedorId} no encontrado`);
  }

  private async assertNoDuplicate(
    proveedorId: string,
    tipoDoc: string,
    numeroDoc: string,
    excludeId?: string,
  ) {
    const dup = await this.prisma.socioProveedor.findFirst({
      where: { proveedorId, tipoDoc, numeroDoc, ...(excludeId && { NOT: { id: excludeId } }) },
    });
    if (dup) {
      throw new ConflictException(
        `Ya existe un socio con ${tipoDoc.toUpperCase()} ${numeroDoc} para este proveedor (RF-03)`,
      );
    }
  }

  private async assertTotalNoExcede(
    proveedorId: string,
    nueva: number,
    excludeId?: string,
  ) {
    const socios = await this.prisma.socioProveedor.findMany({
      where: { proveedorId, ...(excludeId && { NOT: { id: excludeId } }) },
    });
    const total = socios.reduce((sum: number, s: { participacion: unknown }) => sum + Number(s.participacion), 0);
    if (total + nueva > MAX_TOTAL) {
      throw new BadRequestException(
        `La suma total de participaciones (${(total + nueva).toFixed(2)}%) supera el 100% (RN-02)`,
      );
    }
  }
}
