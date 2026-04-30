import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface CompanyAuditLogData {
  evento: string;
  usuarioId: string;
  empresaId?: string;
  empresaAnteriorId?: string;
  exitoso: boolean;
  razon?: string;
  ip?: string;
  userAgent?: string;
  metadata?: any;
}

@Injectable()
export class CompanyAuditService {
  private readonly logger = new Logger(CompanyAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(data: CompanyAuditLogData): Promise<void> {
    try {
      await this.prisma.companyAuditLog.create({
        data: {
          evento: data.evento,
          usuarioId: data.usuarioId,
          empresaId: data.empresaId,
          empresaAnteriorId: data.empresaAnteriorId,
          exitoso: data.exitoso,
          razon: data.razon,
          ip: data.ip,
          userAgent: data.userAgent,
          metadata: data.metadata,
        },
      });

      this.logger.log(
        `Auditoría: ${data.evento} - Usuario: ${data.usuarioId} - Empresa: ${data.empresaId} - Exitoso: ${data.exitoso}`,
      );
    } catch (error) {
      this.logger.error('Error al registrar auditoría de empresa', error);
    }
  }
}
