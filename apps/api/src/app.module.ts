import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { appConfig, databaseConfig, redisConfig, jwtConfig } from './config/app.config';
import { PrismaService } from './database/prisma.service';
import { AutenticacionModule } from './autenticacion/autenticacion.module';
import { AdministracionModule } from './administracion/administracion.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { AprobacionesModule } from './aprobaciones/aprobaciones.module';
import { ComprasModule } from './compras/compras.module';
import { InventariosModule } from './inventarios/inventarios.module';
import { DocumentosModule } from './documentos/documentos.module';
import { ReportesModule } from './reportes/reportes.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AutenticacionModule,
    AdministracionModule,
    ProveedoresModule,
    CatalogoModule,
    SolicitudesModule,
    AprobacionesModule,
    ComprasModule,
    InventariosModule,
    DocumentosModule,
    ReportesModule,
    NotificacionesModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
