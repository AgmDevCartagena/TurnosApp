import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { jwtConfig } from './config/app.config';
import { PrismaService } from './database/prisma.service';
import { AutenticacionModule } from './autenticacion/autenticacion.module';
import { EmpresasModule } from './empresas/empresas.module';
import { AdministracionModule } from './administracion/administracion.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { UbicacionesModule } from './ubicaciones/ubicaciones.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { CotizacionesModule } from './cotizaciones/cotizaciones.module';
import { AprobacionesModule } from './aprobaciones/aprobaciones.module';
import { ComprasModule } from './compras/compras.module';
import { InventariosModule } from './inventarios/inventarios.module';
import { DocumentosModule } from './documentos/documentos.module';
import { ReportesModule } from './reportes/reportes.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { SeguimientoModule } from './seguimiento/seguimiento.module';
import { AtributosModule } from './atributos/atributos.module';
import { SucursalesProveedoresModule } from './sucursales-proveedores/sucursales-proveedores.module';
import { SociosProveedoresModule } from './socios-proveedores/socios-proveedores.module';
import { CuentasBancariasProveedoresModule } from './cuentas-bancarias-proveedores/cuentas-bancarias-proveedores.module';
import { TiposDocumentoRequeridoModule } from './tipos-documento-requerido/tipos-documento-requerido.module';
import { DocumentosProveedoresModule } from './documentos-proveedores/documentos-proveedores.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [jwtConfig],
    }),
    AutenticacionModule,
    AdministracionModule,
    ProveedoresModule,
    UbicacionesModule,
    CatalogoModule,
    CotizacionesModule,
    SolicitudesModule,
    ComprasModule,
    AprobacionesModule,
    DocumentosModule,
    NotificacionesModule,
    SeguimientoModule,
    AtributosModule,
    SucursalesProveedoresModule,
    SociosProveedoresModule,
    CuentasBancariasProveedoresModule,
    TiposDocumentoRequeridoModule,
    DocumentosProveedoresModule,
    ReportesModule,
    InventariosModule,
    EmpresasModule,
    HealthModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
