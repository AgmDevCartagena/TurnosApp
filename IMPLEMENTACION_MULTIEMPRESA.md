# IMPLEMENTACIÓN COMPLETA: SISTEMA MULTIEMPRESA

## A. DIAGNÓSTICO DEL ESTADO ACTUAL

### Backend Existente
- ✅ Autenticación JWT + Sesiones Redis
- ✅ Modelo Usuario con rol único (1:1)
- ✅ Sistema de permisos por rol
- ✅ Guards básicos (JWT, Session)
- ❌ NO existe modelo Empresa
- ❌ NO existe relación multiempresa
- ❌ NO existe contexto de empresa activa

### Frontend Existente
- ✅ Auth store con Zustand
- ✅ Login funcional
- ✅ Layout dashboard
- ❌ NO existe selección de empresa
- ❌ NO existe selector en header
- ❌ NO existe contexto de empresa

### Conclusión
Sistema actual = **autorización monolítica**
Sistema objetivo = **autorización multiempresa con contexto**

---

## B. DISEÑO DE LA SOLUCIÓN

### Arquitectura de Datos
```
Usuario (identidad única)
    ↓
UsuarioEmpresaRol (pivote)
    ↓
Empresa + Rol (contexto)
    ↓
Permisos consolidados
```

### Flujo Funcional
1. Login → Autenticación
2. Consulta empresas disponibles
3. Si 1 empresa → Ingreso automático
4. Si N empresas → Selección obligatoria
5. Sesión con empresa activa
6. Autorización por empresa + rol + permisos
7. Cambio de empresa → Refresh contexto

### Estrategia de Autorización
**Consolidación de permisos por empresa**
- Usuario puede tener múltiples roles en una empresa
- Permisos = unión de todos los roles activos
- Simplifica UX sin perder control

---

## C. MODELO DE DATOS (Prisma Schema)

### Cambios Realizados

1. **Nuevo modelo Empresa**
```prisma
model Empresa {
  id          String   @id @default(uuid())
  nombre      String
  nit         String   @unique
  razonSocial String   @map("razon_social")
  direccion   String?
  telefono    String?
  email       String?
  activo      Boolean  @default(true)
  grupoId     String?  @map("grupo_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  usuariosEmpresas UsuarioEmpresaRol[]
  solicitudes      SolicitudCompra[]
  ordenes          OrdenCompra[]
  centrosCosto     CentroCosto[]
  auditLogs        CompanyAuditLog[]

  @@index([activo])
  @@map("empresas")
}
```

2. **Tabla pivote UsuarioEmpresaRol**
```prisma
model UsuarioEmpresaRol {
  id         String   @id @default(uuid())
  usuarioId  String   @map("usuario_id")
  usuario    Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  empresaId  String   @map("empresa_id")
  empresa    Empresa  @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  rolId      String   @map("rol_id")
  rol        Rol      @relation(fields: [rolId], references: [id])
  activo     Boolean  @default(true)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@unique([usuarioId, empresaId, rolId])
  @@index([usuarioId, empresaId, activo])
  @@index([empresaId, activo])
  @@map("usuarios_empresas_roles")
}
```

3. **Usuario refactorizado**
```prisma
model Usuario {
  id            String   @id @default(uuid())
  username      String   @unique
  email         String   @unique
  password      String?
  nombre        String
  apellido      String
  activo        Boolean  @default(true)
  
  // DEPRECATED: Mantener por compatibilidad temporal
  rolId         String?
  rol           Rol?     @relation("UsuarioRolLegacy", fields: [rolId], references: [id])
  
  authProvider  String   @default("local") @map("auth_provider")
  microsoftId   String?  @unique @map("microsoft_id")
  lastLoginAt   DateTime? @map("last_login_at")
  
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  empresas             UsuarioEmpresaRol[]
  // ... otras relaciones
}
```

4. **Rol con código único**
```prisma
model Rol {
  id          String    @id @default(uuid())
  codigo      String    @unique
  nombre      String    @unique
  descripcion String?
  activo      Boolean   @default(true)
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  usuariosLegacy      Usuario[]          @relation("UsuarioRolLegacy")
  usuariosEmpresas    UsuarioEmpresaRol[]
  permisos            PermisoRol[]

  @@map("roles")
}
```

5. **Entidades operativas con empresaId**
- SolicitudCompra → empresaId
- OrdenCompra → empresaId
- CentroCosto → empresaId

6. **Auditoría de empresa**
```prisma
model CompanyAuditLog {
  id                String   @id @default(uuid())
  evento            String
  usuarioId         String   @map("usuario_id")
  empresaId         String?  @map("empresa_id")
  empresa           Empresa? @relation(fields: [empresaId], references: [id])
  empresaAnteriorId String?  @map("empresa_anterior_id")
  exitoso           Boolean
  razon             String?
  ip                String?
  userAgent         String?  @map("user_agent")
  metadata          Json?
  createdAt         DateTime @default(now()) @map("created_at")

  @@index([evento, createdAt(sort: Desc)])
  @@index([usuarioId, empresaId])
  @@map("company_audit_logs")
}
```

---

## D. MIGRACIÓN DE BASE DE DATOS

### Paso 1: Crear migración
```bash
cd apps/api
pnpm prisma migrate dev --create-only --name add_multicompany_support
```

### Paso 2: Editar migración SQL

El archivo generado necesitará ajustes manuales para:

1. **Crear tabla empresas**
2. **Crear tabla usuarios_empresas_roles**
3. **Agregar campo codigo a roles**
4. **Hacer rolId nullable en usuarios**
5. **Agregar empresaId a entidades operativas**
6. **Crear tabla company_audit_logs**
7. **Migrar datos existentes** (crear empresa por defecto y asignar usuarios)

### Paso 3: Script de migración de datos

```sql
-- 1. Crear tabla empresas
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "nit" TEXT NOT NULL UNIQUE,
    "razon_social" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "grupo_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "empresas_activo_idx" ON "empresas"("activo");

-- 2. Crear tabla usuarios_empresas_roles
CREATE TABLE "usuarios_empresas_roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "rol_id" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "usuarios_empresas_roles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE,
    CONSTRAINT "usuarios_empresas_roles_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas" ("id") ON DELETE CASCADE,
    CONSTRAINT "usuarios_empresas_roles_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles" ("id")
);

CREATE UNIQUE INDEX "usuarios_empresas_roles_usuario_id_empresa_id_rol_id_key" 
    ON "usuarios_empresas_roles"("usuario_id", "empresa_id", "rol_id");
CREATE INDEX "usuarios_empresas_roles_usuario_id_empresa_id_activo_idx" 
    ON "usuarios_empresas_roles"("usuario_id", "empresa_id", "activo");
CREATE INDEX "usuarios_empresas_roles_empresa_id_activo_idx" 
    ON "usuarios_empresas_roles"("empresa_id", "activo");

-- 3. Agregar campo codigo a roles
ALTER TABLE "roles" ADD COLUMN "codigo" TEXT;
UPDATE "roles" SET "codigo" = LOWER(REPLACE("nombre", ' ', '_'));
ALTER TABLE "roles" ALTER COLUMN "codigo" SET NOT NULL;
CREATE UNIQUE INDEX "roles_codigo_key" ON "roles"("codigo");

-- 4. Hacer rolId nullable en usuarios
ALTER TABLE "usuarios" ALTER COLUMN "rol_id" DROP NOT NULL;

-- 5. Crear empresa por defecto
INSERT INTO "empresas" ("id", "nombre", "nit", "razon_social", "activo", "created_at", "updated_at")
VALUES (
    gen_random_uuid(),
    'AGM DESARROLLOS SAS',
    '900.000.000-1',
    'AGM DESARROLLOS SAS',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 6. Migrar usuarios existentes a la empresa por defecto
INSERT INTO "usuarios_empresas_roles" ("id", "usuario_id", "empresa_id", "rol_id", "activo", "created_at", "updated_at")
SELECT 
    gen_random_uuid(),
    u."id",
    (SELECT "id" FROM "empresas" LIMIT 1),
    u."rol_id",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "usuarios" u
WHERE u."rol_id" IS NOT NULL;

-- 7. Agregar empresaId a solicitudes_compra
ALTER TABLE "solicitudes_compra" ADD COLUMN "empresa_id" TEXT;
UPDATE "solicitudes_compra" SET "empresa_id" = (SELECT "id" FROM "empresas" LIMIT 1);
ALTER TABLE "solicitudes_compra" ALTER COLUMN "empresa_id" SET NOT NULL;
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_empresa_id_fkey" 
    FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id");
CREATE INDEX "solicitudes_compra_empresa_id_idx" ON "solicitudes_compra"("empresa_id");

-- 8. Agregar empresaId a ordenes_compra
ALTER TABLE "ordenes_compra" ADD COLUMN "empresa_id" TEXT;
UPDATE "ordenes_compra" SET "empresa_id" = (SELECT "id" FROM "empresas" LIMIT 1);
ALTER TABLE "ordenes_compra" ALTER COLUMN "empresa_id" SET NOT NULL;
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_empresa_id_fkey" 
    FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id");
CREATE INDEX "ordenes_compra_empresa_id_idx" ON "ordenes_compra"("empresa_id");

-- 9. Agregar empresaId a centros_costo
ALTER TABLE "centros_costo" ADD COLUMN "empresa_id" TEXT;
UPDATE "centros_costo" SET "empresa_id" = (SELECT "id" FROM "empresas" LIMIT 1);
ALTER TABLE "centros_costo" ALTER COLUMN "empresa_id" SET NOT NULL;
ALTER TABLE "centros_costo" ADD CONSTRAINT "centros_costo_empresa_id_fkey" 
    FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id");
CREATE INDEX "centros_costo_empresa_id_idx" ON "centros_costo"("empresa_id");

-- 10. Crear tabla company_audit_logs
CREATE TABLE "company_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evento" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "empresa_id" TEXT,
    "empresa_anterior_id" TEXT,
    "exitoso" BOOLEAN NOT NULL,
    "razon" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_audit_logs_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
);

CREATE INDEX "company_audit_logs_evento_created_at_idx" ON "company_audit_logs"("evento", "created_at" DESC);
CREATE INDEX "company_audit_logs_usuario_id_empresa_id_idx" ON "company_audit_logs"("usuario_id", "empresa_id");
```

### Paso 4: Aplicar migración
```bash
pnpm prisma migrate dev
pnpm prisma generate
```

---

## E. BACKEND: INTERFACES Y DTOS

### 1. Interfaces de Sesión Actualizada

**Archivo:** `apps/api/src/autenticacion/interfaces/session-data.interface.ts`
```typescript
export interface SessionData {
  userId: string;
  email: string;
  authProvider: string;
  activeCompanyId: string | null;
  companies: CompanyAccess[];
  activeRoles: string[];
  activePermissions: string[];
  createdAt: number;
  lastActivity: number;
}

export interface CompanyAccess {
  id: string;
  nombre: string;
  nit: string;
  roles: RoleInfo[];
}

export interface RoleInfo {
  id: string;
  codigo: string;
  nombre: string;
}
```

### 2. DTOs de Empresa

**Archivo:** `apps/api/src/empresas/dto/select-company.dto.ts`
```typescript
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectCompanyDto {
  @ApiProperty({ example: 'uuid-empresa' })
  @IsUUID()
  @IsNotEmpty({ message: 'El ID de la empresa es requerido' })
  companyId: string;
}
```

**Archivo:** `apps/api/src/empresas/dto/create-empresa.dto.ts`
```typescript
import { IsNotEmpty, IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmpresaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nit: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razonSocial: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  grupoId?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
```

---

## F. BACKEND: SERVICIOS

### 1. Servicio de Empresas

**Archivo:** `apps/api/src/empresas/empresas.service.ts`
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserCompanies(userId: string) {
    const userCompanies = await this.prisma.usuarioEmpresaRol.findMany({
      where: {
        usuarioId: userId,
        activo: true,
        empresa: { activo: true },
      },
      include: {
        empresa: true,
        rol: {
          include: {
            permisos: {
              include: {
                permiso: true,
              },
            },
          },
        },
      },
    });

    // Agrupar por empresa y consolidar roles
    const companiesMap = new Map();

    for (const uer of userCompanies) {
      if (!companiesMap.has(uer.empresaId)) {
        companiesMap.set(uer.empresaId, {
          id: uer.empresa.id,
          nombre: uer.empresa.nombre,
          nit: uer.empresa.nit,
          razonSocial: uer.empresa.razonSocial,
          roles: [],
        });
      }

      const company = companiesMap.get(uer.empresaId);
      company.roles.push({
        id: uer.rol.id,
        codigo: uer.rol.codigo,
        nombre: uer.rol.nombre,
      });
    }

    return Array.from(companiesMap.values());
  }

  async getCompanyRolesAndPermissions(userId: string, companyId: string) {
    const userCompanyRoles = await this.prisma.usuarioEmpresaRol.findMany({
      where: {
        usuarioId,
        empresaId: companyId,
        activo: true,
      },
      include: {
        rol: {
          include: {
            permisos: {
              include: {
                permiso: true,
              },
            },
          },
        },
      },
    });

    if (userCompanyRoles.length === 0) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    const roles = userCompanyRoles.map(ucr => ({
      id: ucr.rol.id,
      codigo: ucr.rol.codigo,
      nombre: ucr.rol.nombre,
    }));

    // Consolidar permisos de todos los roles
    const permissionsSet = new Set<string>();
    for (const ucr of userCompanyRoles) {
      for (const pr of ucr.rol.permisos) {
        permissionsSet.add(`${pr.permiso.recurso}:${pr.permiso.accion}`);
      }
    }

    return {
      roles,
      permissions: Array.from(permissionsSet),
    };
  }

  async validateUserCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    const access = await this.prisma.usuarioEmpresaRol.findFirst({
      where: {
        usuarioId,
        empresaId: companyId,
        activo: true,
        empresa: { activo: true },
      },
    });

    return !!access;
  }

  async create(dto: CreateEmpresaDto) {
    return this.prisma.empresa.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.empresa.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return empresa;
  }
}
```

### 2. Servicio de Sesión Actualizado

**Archivo:** `apps/api/src/autenticacion/services/session.service.ts`
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { SessionData, CompanyAccess } from '../interfaces/session-data.interface';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly redis: Redis;
  private readonly sessionTTL: number;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.sessionDb', 1),
    });

    this.sessionTTL = this.configService.get<number>('session.ttl', 86400);
  }

  async createSession(sessionId: string, data: Partial<SessionData>): Promise<void> {
    const key = this.getSessionKey(sessionId);
    const sessionData: SessionData = {
      userId: data.userId!,
      email: data.email!,
      authProvider: data.authProvider!,
      activeCompanyId: data.activeCompanyId || null,
      companies: data.companies || [],
      activeRoles: data.activeRoles || [],
      activePermissions: data.activePermissions || [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    await this.redis.setex(key, this.sessionTTL, JSON.stringify(sessionData));
    this.logger.log(`Sesión creada: ${sessionId} para usuario ${data.userId}`);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = this.getSessionKey(sessionId);
    const data = await this.redis.get(key);
    
    if (!data) {
      return null;
    }

    const session = JSON.parse(data) as SessionData;
    
    // Actualizar última actividad
    await this.redis.setex(
      key,
      this.sessionTTL,
      JSON.stringify({
        ...session,
        lastActivity: Date.now(),
      }),
    );

    return session;
  }

  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Sesión no encontrada');
    }

    const updatedSession = {
      ...session,
      ...updates,
      lastActivity: Date.now(),
    };

    const key = this.getSessionKey(sessionId);
    await this.redis.setex(key, this.sessionTTL, JSON.stringify(updatedSession));
    this.logger.log(`Sesión actualizada: ${sessionId}`);
  }

  async setActiveCompany(
    sessionId: string,
    companyId: string,
    roles: string[],
    permissions: string[],
  ): Promise<void> {
    await this.updateSession(sessionId, {
      activeCompanyId: companyId,
      activeRoles: roles,
      activePermissions: permissions,
    });
  }

  async destroySession(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    await this.redis.del(key);
    this.logger.log(`Sesión destruida: ${sessionId}`);
  }

  async destroyAllUserSessions(userId: string): Promise<void> {
    const pattern = `session:*`;
    const keys = await this.redis.keys(pattern);
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = JSON.parse(data) as SessionData;
        if (session.userId === userId) {
          await this.redis.del(key);
        }
      }
    }
    
    this.logger.log(`Todas las sesiones destruidas para usuario: ${userId}`);
  }

  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
```

---

## G. BACKEND: CONTROLADORES

### Controlador de Autenticación Actualizado

**Archivo:** `apps/api/src/autenticacion/autenticacion.controller.ts`

Agregar estos endpoints:

```typescript
@Get('me')
@UseGuards(SessionAuthGuard)
@ApiOperation({ summary: 'Obtener contexto completo del usuario autenticado' })
@ApiResponse({ status: 200, description: 'Contexto del usuario con empresas' })
async getCurrentUserContext(
  @CurrentUser() user: AuthenticatedUser,
  @Req() req: Request,
) {
  const sessionId = req.cookies?.['session_id'];
  const session = sessionId ? await this.sessionService.getSession(sessionId) : null;

  const companies = await this.empresasService.getUserCompanies(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      username: user.username,
    },
    companies,
    activeCompany: session?.activeCompanyId 
      ? companies.find(c => c.id === session.activeCompanyId) 
      : null,
    activeRoles: session?.activeRoles || [],
    activePermissions: session?.activePermissions || [],
    requiresCompanySelection: companies.length > 1 && !session?.activeCompanyId,
  };
}

@Post('select-company')
@UseGuards(SessionAuthGuard)
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Seleccionar empresa activa' })
@ApiResponse({ status: 200, description: 'Empresa seleccionada exitosamente' })
@ApiResponse({ status: 403, description: 'No tienes acceso a esta empresa' })
async selectCompany(
  @Body() dto: SelectCompanyDto,
  @CurrentUser() user: AuthenticatedUser,
  @Req() req: Request,
  @Ip() ip: string,
  @Headers('user-agent') userAgent: string,
) {
  const sessionId = req.cookies?.['session_id'];
  if (!sessionId) {
    throw new UnauthorizedException('Sesión no encontrada');
  }

  // Validar acceso
  const hasAccess = await this.empresasService.validateUserCompanyAccess(
    user.id,
    dto.companyId,
  );

  if (!hasAccess) {
    await this.companyAuditService.log({
      evento: 'company_access_denied',
      usuarioId: user.id,
      empresaId: dto.companyId,
      exitoso: false,
      razon: 'Usuario no tiene acceso a esta empresa',
      ip,
      userAgent,
    });

    throw new ForbiddenException('No tienes acceso a esta empresa');
  }

  // Obtener roles y permisos
  const { roles, permissions } = await this.empresasService.getCompanyRolesAndPermissions(
    user.id,
    dto.companyId,
  );

  // Actualizar sesión
  await this.sessionService.setActiveCompany(
    sessionId,
    dto.companyId,
    roles.map(r => r.codigo),
    permissions,
  );

  // Auditar
  const session = await this.sessionService.getSession(sessionId);
  await this.companyAuditService.log({
    evento: session?.activeCompanyId ? 'company_changed' : 'company_selected',
    usuarioId: user.id,
    empresaId: dto.companyId,
    empresaAnteriorId: session?.activeCompanyId,
    exitoso: true,
    ip,
    userAgent,
  });

  const empresa = await this.empresasService.findOne(dto.companyId);

  return {
    success: true,
    activeCompany: {
      id: empresa.id,
      nombre: empresa.nombre,
      nit: empresa.nit,
      razonSocial: empresa.razonSocial,
    },
    activeRoles: roles,
    activePermissions: permissions,
  };
}
```

### Controlador de Empresas

**Archivo:** `apps/api/src/empresas/empresas.controller.ts`
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { SessionAuthGuard } from '../autenticacion/guards/session-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../autenticacion/interfaces/jwt-payload.interface';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('Empresas')
@Controller('empresas')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Get('my-companies')
  @ApiOperation({ summary: 'Obtener empresas del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de empresas' })
  async getMyCompanies(@CurrentUser() user: AuthenticatedUser) {
    return this.empresasService.getUserCompanies(user.id);
  }

  @Post()
  @RequirePermission('empresas:crear')
  @ApiOperation({ summary: 'Crear nueva empresa' })
  @ApiResponse({ status: 201, description: 'Empresa creada' })
  async create(@Body() dto: CreateEmpresaDto) {
    return this.empresasService.create(dto);
  }

  @Get()
  @RequirePermission('empresas:leer')
  @ApiOperation({ summary: 'Listar todas las empresas' })
  @ApiResponse({ status: 200, description: 'Lista de empresas' })
  async findAll() {
    return this.empresasService.findAll();
  }

  @Get(':id')
  @RequirePermission('empresas:leer')
  @ApiOperation({ summary: 'Obtener empresa por ID' })
  @ApiResponse({ status: 200, description: 'Empresa encontrada' })
  async findOne(@Param('id') id: string) {
    return this.empresasService.findOne(id);
  }
}
```

---

## H. BACKEND: GUARDS

### Guard de Empresa Activa

**Archivo:** `apps/api/src/autenticacion/guards/active-company.guard.ts`
```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionService } from '../services/session.service';

@Injectable()
export class ActiveCompanyGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.cookies?.['session_id'];

    if (!sessionId) {
      throw new ForbiddenException('Sesión no encontrada');
    }

    const session = await this.sessionService.getSession(sessionId);

    if (!session) {
      throw new ForbiddenException('Sesión inválida');
    }

    if (!session.activeCompanyId) {
      throw new ForbiddenException(
        'Debes seleccionar una empresa antes de continuar',
      );
    }

    // Adjuntar contexto de empresa al request
    request.activeCompany = {
      id: session.activeCompanyId,
      roles: session.activeRoles,
      permissions: session.activePermissions,
    };

    return true;
  }
}
```

### Guard de Permisos Actualizado

**Archivo:** `apps/api/src/autenticacion/guards/permissions.guard.ts`
```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionService } from '../services/session.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const sessionId = request.cookies?.['session_id'];

    if (!sessionId) {
      throw new ForbiddenException('Sesión no encontrada');
    }

    const session = await this.sessionService.getSession(sessionId);

    if (!session) {
      throw new ForbiddenException('Sesión inválida');
    }

    if (!session.activeCompanyId) {
      throw new ForbiddenException('Debes seleccionar una empresa');
    }

    const hasPermission = session.activePermissions.includes(requiredPermission);

    if (!hasPermission) {
      throw new ForbiddenException(
        `No tienes permiso para realizar esta acción en la empresa actual`,
      );
    }

    return true;
  }
}
```

### Decorador de Permisos

**Archivo:** `apps/api/src/common/decorators/require-permission.decorator.ts`
```typescript
import { SetMetadata } from '@nestjs/common';

export const RequirePermission = (permission: string) =>
  SetMetadata('permission', permission);
```

---

## I. BACKEND: MÓDULOS

### Módulo de Empresas

**Archivo:** `apps/api/src/empresas/empresas.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';
import { PrismaModule } from '../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmpresasController],
  providers: [EmpresasService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
```

### Actualizar AppModule

**Archivo:** `apps/api/src/app.module.ts`
```typescript
import { EmpresasModule } from './empresas/empresas.module';

@Module({
  imports: [
    // ... otros módulos
    EmpresasModule,
  ],
})
export class AppModule {}
```

---

## J. FRONTEND: TIPOS E INTERFACES

### Tipos de Empresa

**Archivo:** `apps/web/src/types/company.ts`
```typescript
export interface Company {
  id: string;
  nombre: string;
  nit: string;
  razonSocial: string;
  roles: Role[];
}

export interface Role {
  id: string;
  codigo: string;
  nombre: string;
}

export interface UserContext {
  user: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    username: string;
  };
  companies: Company[];
  activeCompany: Company | null;
  activeRoles: string[];
  activePermissions: string[];
  requiresCompanySelection: boolean;
}
```

---

## K. FRONTEND: STORE DE CONTEXTO

### Company Store

**Archivo:** `apps/web/src/lib/company-store.ts`
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from './api-client';
import { Company, UserContext } from '@/types/company';

interface CompanyState {
  companies: Company[];
  activeCompany: Company | null;
  activeRoles: string[];
  activePermissions: string[];
  isLoading: boolean;
  requiresSelection: boolean;

  fetchUserContext: () => Promise<UserContext>;
  selectCompany: (companyId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  clearCompanyContext: () => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set, get) => ({
      companies: [],
      activeCompany: null,
      activeRoles: [],
      activePermissions: [],
      isLoading: false,
      requiresSelection: false,

      fetchUserContext: async () => {
        set({ isLoading: true });
        try {
          const { data } = await apiClient.get('/auth/me');
          const context = data.data ?? data;

          set({
            companies: context.companies,
            activeCompany: context.activeCompany,
            activeRoles: context.activeRoles,
            activePermissions: context.activePermissions,
            requiresSelection: context.requiresCompanySelection,
            isLoading: false,
          });

          return context;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      selectCompany: async (companyId: string) => {
        set({ isLoading: true });
        try {
          const { data } = await apiClient.post('/auth/select-company', {
            companyId,
          });
          const result = data.data ?? data;

          const company = get().companies.find(c => c.id === companyId);

          set({
            activeCompany: company || null,
            activeRoles: result.activeRoles.map((r: any) => r.codigo),
            activePermissions: result.activePermissions,
            requiresSelection: false,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      hasPermission: (permission: string) => {
        const { activePermissions } = get();
        return activePermissions.includes(permission);
      },

      hasRole: (role: string) => {
        const { activeRoles } = get();
        return activeRoles.includes(role);
      },

      clearCompanyContext: () => {
        set({
          companies: [],
          activeCompany: null,
          activeRoles: [],
          activePermissions: [],
          requiresSelection: false,
        });
      },
    }),
    {
      name: 'company-storage',
      partialize: (state) => ({
        activeCompany: state.activeCompany,
        companies: state.companies,
        activeRoles: state.activeRoles,
        activePermissions: state.activePermissions,
      }),
    },
  ),
);
```

---

## L. FRONTEND: PANTALLA DE SELECCIÓN DE EMPRESA

**Archivo:** `apps/web/src/app/select-company/page.tsx`
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useCompanyStore } from '@/lib/company-store';
import { useAuthStore } from '@/lib/auth-store';

export default function SelectCompanyPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { companies, selectCompany, fetchUserContext, isLoading } = useCompanyStore();
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchUserContext().catch((err) => {
      console.error('Error al cargar contexto:', err);
      setError('Error al cargar las empresas disponibles');
    });
  }, [isAuthenticated]);

  const handleSelectCompany = async (companyId: string) => {
    setError(null);
    setSelectedCompanyId(companyId);

    try {
      await selectCompany(companyId);
      router.push('/dashboard');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        'Error al seleccionar la empresa';
      setError(message);
      setSelectedCompanyId(null);
    }
  };

  if (isLoading && companies.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-sm text-slate-600">Cargando empresas...</p>
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-9 w-9 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Sin Empresas Asignadas
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              No tienes acceso a ninguna empresa. Contacta al administrador del sistema.
            </p>
          </div>
          <button
            onClick={() => {
              useAuthStore.getState().logout();
              router.push('/login');
            }}
            className="w-full rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
              <Building2 className="h-9 w-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Selecciona tu Empresa
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Hola <span className="font-semibold">{user?.nombre}</span>, selecciona la empresa con la que deseas operar
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleSelectCompany(company.id)}
                disabled={selectedCompanyId !== null}
                className="group relative w-full rounded-lg border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">
                      {company.nombre}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      NIT: {company.nit}
                    </p>
                    {company.roles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {company.roles.map((role) => (
                          <span
                            key={role.id}
                            className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                          >
                            {role.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    {selectedCompanyId === company.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-center text-xs text-slate-500">
              ¿No ves tu empresa? Contacta al administrador del sistema.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          © 2026 AGM - Gestión de Compras. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
```

---

## M. FRONTEND: SELECTOR DE EMPRESA EN HEADER

**Archivo:** `apps/web/src/components/company-selector.tsx`
```typescript
'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronDown, Loader2 } from 'lucide-react';
import { useCompanyStore } from '@/lib/company-store';

export function CompanySelector() {
  const router = useRouter();
  const { companies, activeCompany, selectCompany } = useCompanyStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const handleSelectCompany = async (companyId: string) => {
    if (companyId === activeCompany?.id) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    try {
      await selectCompany(companyId);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error al cambiar empresa:', error);
    } finally {
      setIsChanging(false);
    }
  };

  if (!activeCompany) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Building2 className="h-4 w-4 text-slate-500" />
        <span className="max-w-[200px] truncate">{activeCompany.nombre}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Cambiar Empresa
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleSelectCompany(company.id)}
                  disabled={isChanging}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {company.nombre}
                    </p>
                    <p className="text-xs text-slate-500">NIT: {company.nit}</p>
                  </div>
                  {company.id === activeCompany.id && (
                    <Check className="h-4 w-4 flex-shrink-0 text-blue-600" />
                  )}
                  {isChanging && company.id !== activeCompany.id && (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-slate-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## N. FRONTEND: MIDDLEWARE DE PROTECCIÓN

**Archivo:** `apps/web/src/middleware.ts`
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionId = request.cookies.get('session_id');
  const { pathname } = request.nextUrl;

  // Rutas públicas
  const publicRoutes = ['/login', '/'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Si no hay sesión y intenta acceder a ruta protegida
  if (!sessionId && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si tiene sesión y está en login, redirigir a dashboard
  if (sessionId && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## O. FRONTEND: ACTUALIZAR LAYOUT DE DASHBOARD

**Archivo:** `apps/web/src/app/(dashboard)/layout.tsx`

Agregar el CompanySelector en el header:

```typescript
import { CompanySelector } from '@/components/company-selector';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-900">
              Gestión de Compras
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <CompanySelector />
            {/* Otros elementos del header */}
          </div>
        </div>
      </header>
      
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
```

---

## P. FRONTEND: ACTUALIZAR FLUJO DE LOGIN

**Archivo:** `apps/web/src/app/login/page.tsx`

Actualizar el onSubmit para manejar selección de empresa:

```typescript
const onSubmit = async (data: LoginFormData) => {
  setError(null);
  setIsLoading(true);
  try {
    await login(data.username, data.password);
    
    // Obtener contexto del usuario
    const context = await useCompanyStore.getState().fetchUserContext();
    
    // Si tiene una sola empresa, seleccionarla automáticamente
    if (context.companies.length === 1) {
      await useCompanyStore.getState().selectCompany(context.companies[0].id);
      router.push('/dashboard');
    } 
    // Si tiene múltiples empresas, ir a selección
    else if (context.companies.length > 1) {
      router.push('/select-company');
    }
    // Si no tiene empresas, mostrar error
    else {
      setError('No tienes empresas asignadas. Contacta al administrador.');
      useAuthStore.getState().logout();
    }
  } catch (err: any) {
    const message =
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      'Error al iniciar sesión';
    setError(message);
  } finally {
    setIsLoading(false);
  }
};
```

---

## Q. SEED ACTUALIZADO

**Archivo:** `apps/api/src/database/prisma/seed.ts`

Agregar creación de empresas y asignaciones:

```typescript
// Crear empresas
const empresa1 = await prisma.empresa.create({
  data: {
    nombre: 'AGM DESARROLLOS SAS',
    nit: '900.000.000-1',
    razonSocial: 'AGM DESARROLLOS SAS',
    activo: true,
  },
});

const empresa2 = await prisma.empresa.create({
  data: {
    nombre: 'AMERICAN LIGHTING',
    nit: '900.000.000-2',
    razonSocial: 'AMERICAN LIGHTING SAS',
    activo: true,
  },
});

console.log('  ✅ 2 empresas creadas');

// Actualizar roles con códigos
await prisma.rol.update({
  where: { nombre: 'super_admin' },
  data: { codigo: 'super_admin' },
});

await prisma.rol.update({
  where: { nombre: 'admin' },
  data: { codigo: 'admin' },
});

// ... actualizar todos los roles con códigos

// Asignar usuario admin a ambas empresas
await prisma.usuarioEmpresaRol.create({
  data: {
    usuarioId: admin.id,
    empresaId: empresa1.id,
    rolId: rolSuperAdmin.id,
    activo: true,
  },
});

await prisma.usuarioEmpresaRol.create({
  data: {
    usuarioId: admin.id,
    empresaId: empresa2.id,
    rolId: rolSuperAdmin.id,
    activo: true,
  },
});

console.log('  ✅ Usuario admin asignado a 2 empresas');
```

---

## R. CHECKLIST DE PRUEBAS

### Pruebas Backend
- [ ] Migración ejecutada correctamente
- [ ] Empresas creadas en seed
- [ ] Usuario asignado a empresas
- [ ] GET /auth/me retorna empresas
- [ ] POST /auth/select-company valida acceso
- [ ] POST /auth/select-company actualiza sesión
- [ ] Guards validan empresa activa
- [ ] Permisos consolidados correctamente
- [ ] Auditoría de cambio de empresa funciona

### Pruebas Frontend
- [ ] Login redirige según cantidad de empresas
- [ ] Pantalla de selección muestra empresas
- [ ] Selección de empresa actualiza contexto
- [ ] Selector en header muestra empresa activa
- [ ] Cambio de empresa refresca permisos
- [ ] Middleware protege rutas correctamente
- [ ] Recarga de página mantiene contexto

### Casos de Prueba
1. **Usuario con 1 empresa**: Login → Dashboard directo
2. **Usuario con N empresas**: Login → Selección → Dashboard
3. **Usuario sin empresas**: Login → Error → Logout
4. **Cambio de empresa**: Header → Seleccionar → Refresh
5. **Acceso denegado**: Intento de cambiar a empresa no autorizada
6. **Sesión expirada**: Redirigir a login
7. **Permisos por empresa**: Validar acciones según empresa activa

---

## S. PRÓXIMOS PASOS

1. **Ejecutar migración** cuando la base de datos esté disponible
2. **Ejecutar seed** para poblar datos de prueba
3. **Probar flujo completo** de login y selección
4. **Ajustar UI** según feedback
5. **Implementar auditoría completa**
6. **Documentar API** con Swagger
7. **Crear tests unitarios** y de integración

---

## T. COMANDOS DE EJECUCIÓN

```bash
# Backend
cd apps/api
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma db seed
pnpm dev

# Frontend
cd apps/web
pnpm dev
```

---

## U. NOTAS IMPORTANTES

1. **Compatibilidad**: El campo `rolId` en Usuario se mantiene como nullable para no romper código existente
2. **Migración gradual**: Los usuarios existentes se migran automáticamente a la empresa por defecto
3. **Sesiones**: Redis almacena el contexto completo (empresa + roles + permisos)
4. **Autorización**: Toda validación crítica ocurre en backend, no solo en UI
5. **Auditoría**: Todos los cambios de empresa quedan registrados
6. **Escalabilidad**: El sistema soporta múltiples empresas y múltiples roles por empresa

---

FIN DE LA IMPLEMENTACIÓN COMPLETA
