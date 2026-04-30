import { Module, forwardRef } from '@nestjs/common';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';
import { CompanyAuditService } from './company-audit.service';
import { PrismaService } from '../database/prisma.service';
import { AutenticacionModule } from '../autenticacion/autenticacion.module';

@Module({
  imports: [forwardRef(() => AutenticacionModule)],
  controllers: [EmpresasController],
  providers: [EmpresasService, CompanyAuditService, PrismaService],
  exports: [EmpresasService, CompanyAuditService],
})
export class EmpresasModule {}
