import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';

@Injectable()
export class SucursalesProveedoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByProveedor(proveedorId: string) {
    await this.assertProveedorExists(proveedorId);
    return this.prisma.sucursalProveedor.findMany({
      where: { proveedorId },
      orderBy: { numero: 'asc' },
    });
  }

  async findOne(id: string) {
    const sucursal = await this.prisma.sucursalProveedor.findUnique({ where: { id } });
    if (!sucursal) throw new NotFoundException(`Sucursal ${id} no encontrada`);
    return sucursal;
  }

  async create(proveedorId: string, dto: CreateSucursalDto) {
    await this.assertProveedorExists(proveedorId);

    const last = await this.prisma.sucursalProveedor.findFirst({
      where: { proveedorId },
      orderBy: { numero: 'desc' },
    });
    const numero = (last?.numero ?? 0) + 1;

    return this.prisma.sucursalProveedor.create({
      data: { ...dto, proveedorId, numero },
    });
  }

  async update(id: string, dto: UpdateSucursalDto) {
    await this.findOne(id);
    return this.prisma.sucursalProveedor.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.sucursalProveedor.delete({ where: { id } });
  }

  private async assertProveedorExists(proveedorId: string) {
    const prov = await this.prisma.proveedor.findUnique({ where: { id: proveedorId } });
    if (!prov) throw new NotFoundException(`Proveedor ${proveedorId} no encontrado`);
  }
}
