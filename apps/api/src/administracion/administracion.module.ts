import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AutenticacionModule } from '../autenticacion/autenticacion.module';
import { AdministracionService } from './administracion.service';
import { UsuariosController } from './controllers/usuarios.controller';
import { RolesController } from './controllers/roles.controller';
import { PermisosController } from './controllers/permisos.controller';
import { EmpresasController } from './controllers/empresas.controller';
import { CentrosCostoController } from './controllers/centros-costo.controller';
import { AreasController } from './controllers/areas.controller';

@Module({
  imports: [AutenticacionModule],
  controllers: [UsuariosController, RolesController, PermisosController, EmpresasController, CentrosCostoController, AreasController],
  providers: [PrismaService, AdministracionService],
  exports: [AdministracionService],
})
export class AdministracionModule {}
