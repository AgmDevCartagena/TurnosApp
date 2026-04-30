import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCuentaBancariaDto } from './dto/create-cuenta-bancaria.dto';
import { UpdateCuentaBancariaDto } from './dto/update-cuenta-bancaria.dto';

@Injectable()
export class CuentasBancariasProveedoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByProveedor(proveedorId: string) {
    await this.assertProveedorExists(proveedorId);
    return this.prisma.cuentaBancariaProveedor.findMany({
      where: { proveedorId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const cuenta = await this.prisma.cuentaBancariaProveedor.findUnique({ where: { id } });
    if (!cuenta) throw new NotFoundException(`Cuenta bancaria ${id} no encontrada`);
    return cuenta;
  }

  async create(proveedorId: string, dto: CreateCuentaBancariaDto) {
    await this.assertProveedorExists(proveedorId);
    await this.assertNumeroCuentaUnico(proveedorId, dto.numeroCuenta);

    return this.prisma.cuentaBancariaProveedor.create({
      data: { ...dto, proveedorId },
    });
  }

  async update(id: string, dto: UpdateCuentaBancariaDto) {
    const existing = await this.findOne(id);

    if (dto.numeroCuenta && dto.numeroCuenta !== existing.numeroCuenta) {
      await this.assertNumeroCuentaUnico(existing.proveedorId, dto.numeroCuenta, id);
    }

    return this.prisma.cuentaBancariaProveedor.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.cuentaBancariaProveedor.delete({ where: { id } });
  }

  private async assertProveedorExists(proveedorId: string) {
    const prov = await this.prisma.proveedor.findUnique({ where: { id: proveedorId } });
    if (!prov) throw new NotFoundException(`Proveedor ${proveedorId} no encontrado`);
  }

  private async assertNumeroCuentaUnico(
    proveedorId: string,
    numeroCuenta: string,
    excludeId?: string,
  ) {
    const dup = await this.prisma.cuentaBancariaProveedor.findFirst({
      where: {
        proveedorId,
        numeroCuenta,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });
    if (dup) {
      throw new ConflictException(
        `Ya existe una cuenta con número ${numeroCuenta} para este proveedor (RN-02)`,
      );
    }
  }
}
