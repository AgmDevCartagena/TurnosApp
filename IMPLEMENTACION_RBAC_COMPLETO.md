# IMPLEMENTACIÓN COMPLETA: SISTEMA RBAC CON MENÚ DINÁMICO

## A. DIAGNÓSTICO DEL ESTADO ACTUAL

### ✅ Existente
- Modelo básico de permisos: `Permiso`, `Rol`, `PermisoRol`
- Sistema multiempresa: `UsuarioEmpresaRol`
- Sidebar con filtrado básico por roles hardcodeados
- Seed con permisos básicos (recurso + acción)
- Guards básicos: `JwtAuthGuard`, `SessionAuthGuard`, `PermissionsGuard`

### ❌ Faltante
- **Permisos granulares**: No hay código/módulo en permisos
- **Resolución de permisos efectivos**: No se consolidan permisos por empresa
- **Menú dinámico**: El sidebar usa roles hardcodeados, no permisos
- **Protección de rutas**: No hay validación de permisos en rutas
- **Control de acciones**: No hay control de botones/acciones por permisos
- **Hook de permisos**: No existe utilidad para verificar permisos en frontend
- **Dashboard dinámico**: Las tarjetas del dashboard no se filtran por permisos

### Problemas Identificados
1. El sidebar filtra por `user.rol.nombre` (rol legacy monolítico)
2. No usa el contexto multiempresa para permisos
3. Los permisos en BD son genéricos (recurso:acción) sin código específico
4. No hay forma de verificar permisos específicos como `dashboard.view` o `users.create`

---

## B. DISEÑO DE LA SOLUCIÓN

### Arquitectura de Permisos

```
Usuario → Empresa Activa → Roles en Empresa → Permisos Consolidados
                                                      ↓
                                            Frontend consume permisos
                                            Backend valida permisos
```

### Modelo de Permisos Mejorado

```typescript
interface Permission {
  id: string;
  code: string;           // "dashboard.view", "users.create"
  module: string;         // "dashboard", "users", "catalog"
  action: string;         // "view", "create", "update", "delete", "approve"
  resource: string;       // "usuarios", "solicitudes" (legacy)
  description: string;
}
```

### Permisos por Módulo

**Dashboard**
- `dashboard.view` - Ver dashboard

**Catálogo**
- `catalog.view` - Ver catálogo
- `catalog.create` - Crear items
- `catalog.update` - Editar items
- `catalog.delete` - Eliminar items

**Solicitudes**
- `requests.view` - Ver solicitudes
- `requests.create` - Crear solicitudes
- `requests.update` - Editar solicitudes
- `requests.delete` - Eliminar solicitudes

**Aprobaciones**
- `approvals.view` - Ver aprobaciones
- `approvals.approve` - Aprobar solicitudes
- `approvals.reject` - Rechazar solicitudes

**Cotizaciones**
- `quotations.view` - Ver cotizaciones
- `quotations.create` - Crear cotizaciones
- `quotations.update` - Editar cotizaciones

**Órdenes de Compra**
- `purchase_orders.view` - Ver órdenes
- `purchase_orders.create` - Crear órdenes
- `purchase_orders.update` - Editar órdenes
- `purchase_orders.approve` - Aprobar órdenes

**Recepción**
- `reception.view` - Ver recepciones
- `reception.create` - Registrar recepción
- `reception.update` - Actualizar recepción

**Seguimiento**
- `tracking.view` - Ver seguimiento

**Proveedores**
- `suppliers.view` - Ver proveedores
- `suppliers.create` - Crear proveedores
- `suppliers.update` - Editar proveedores
- `suppliers.delete` - Eliminar proveedores

**Parametrización**
- `settings.view` - Ver configuración
- `settings.update` - Actualizar configuración

**Atributos**
- `attributes.view` - Ver atributos
- `attributes.manage` - Gestionar atributos

**Usuarios**
- `users.view` - Ver usuarios
- `users.create` - Crear usuarios
- `users.update` - Editar usuarios
- `users.delete` - Eliminar usuarios

**Roles**
- `roles.view` - Ver roles
- `roles.create` - Crear roles
- `roles.update` - Editar roles
- `roles.delete` - Eliminar roles

**Permisos**
- `permissions.view` - Ver permisos
- `permissions.manage` - Gestionar permisos

**Empresas**
- `companies.view` - Ver empresas
- `companies.create` - Crear empresas
- `companies.update` - Editar empresas
- `companies.delete` - Eliminar empresas

**Reportes**
- `reports.view` - Ver reportes
- `reports.export` - Exportar reportes

---

## C. FLUJO TÉCNICO DESPUÉS DEL LOGIN

### 1. Login Exitoso
```typescript
POST /auth/login
→ Usuario autenticado
→ Tokens generados
→ Sesión creada en Redis
```

### 2. Selección de Empresa (si aplica)
```typescript
POST /auth/select-company
→ Empresa activa guardada en sesión
→ Roles del usuario en esa empresa cargados
→ Permisos consolidados calculados
```

### 3. Obtener Contexto Completo
```typescript
GET /auth/me
Response: {
  user: { id, email, username, nombre, apellido },
  activeCompany: { id, nombre, nit },
  companies: [...],
  roles: ['comprador', 'aprobador'],
  permissions: [
    'dashboard.view',
    'requests.view',
    'requests.create',
    'approvals.view',
    'approvals.approve',
    ...
  ],
  isSuperAdmin: false
}
```

### 4. Frontend Consume Permisos
```typescript
// Store actualizado
useAuthStore.setState({
  user,
  permissions,
  isSuperAdmin
});

// Sidebar se renderiza dinámicamente
const menuItems = getAuthorizedMenuItems(permissions);

// Dashboard se filtra
const dashboardCards = getDashboardCards(permissions);

// Rutas se protegen
if (!hasPermission('users.view')) redirect('/dashboard');
```

---

## D. BACKEND: ARCHIVOS A CREAR/MODIFICAR

### 1. Actualizar Schema Prisma

**Archivo:** `apps/api/src/database/prisma/schema.prisma`

```prisma
model Permiso {
  id          String @id @default(uuid())
  codigo      String @unique  // "dashboard.view", "users.create"
  modulo      String          // "dashboard", "users", "catalog"
  accion      String          // "view", "create", "update", "delete"
  recurso     String          // "usuarios", "solicitudes" (legacy)
  descripcion String?

  roles    PermisoRol[]

  @@unique([recurso, accion])
  @@index([modulo])
  @@index([codigo])
  @@map("permisos")
}
```

### 2. Crear Servicio de Permisos

**Archivo:** `apps/api/src/autenticacion/services/permissions.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface EffectivePermissions {
  permissions: string[];
  roles: string[];
  isSuperAdmin: boolean;
}

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getEffectivePermissions(
    userId: string,
    companyId: string,
  ): Promise<EffectivePermissions> {
    // Obtener roles del usuario en la empresa
    const userCompanyRoles = await this.prisma.usuarioEmpresaRol.findMany({
      where: {
        usuarioId: userId,
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
      return {
        permissions: [],
        roles: [],
        isSuperAdmin: false,
      };
    }

    const roles = userCompanyRoles.map(ucr => ucr.rol.codigo);
    const isSuperAdmin = roles.includes('super_admin');

    // Consolidar permisos de todos los roles
    const permissionsSet = new Set<string>();
    
    for (const ucr of userCompanyRoles) {
      for (const pr of ucr.rol.permisos) {
        // Usar código si existe, sino construir desde recurso:acción
        const permCode = pr.permiso.codigo || `${pr.permiso.recurso}:${pr.permiso.accion}`;
        permissionsSet.add(permCode);
      }
    }

    const permissions = Array.from(permissionsSet);

    this.logger.log(
      `Permisos efectivos para usuario ${userId} en empresa ${companyId}: ${permissions.length} permisos`,
    );

    return {
      permissions,
      roles,
      isSuperAdmin,
    };
  }

  async hasPermission(
    userId: string,
    companyId: string,
    requiredPermission: string,
  ): Promise<boolean> {
    const { permissions, isSuperAdmin } = await this.getEffectivePermissions(
      userId,
      companyId,
    );

    // SuperAdmin tiene todos los permisos
    if (isSuperAdmin) return true;

    return permissions.includes(requiredPermission);
  }

  async hasAnyPermission(
    userId: string,
    companyId: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    const { permissions, isSuperAdmin } = await this.getEffectivePermissions(
      userId,
      companyId,
    );

    if (isSuperAdmin) return true;

    return requiredPermissions.some(perm => permissions.includes(perm));
  }

  async hasAllPermissions(
    userId: string,
    companyId: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    const { permissions, isSuperAdmin } = await this.getEffectivePermissions(
      userId,
      companyId,
    );

    if (isSuperAdmin) return true;

    return requiredPermissions.every(perm => permissions.includes(perm));
  }
}
```

### 3. Actualizar Endpoint /auth/me

**Archivo:** `apps/api/src/autenticacion/autenticacion.controller.ts`

Modificar el método `getCurrentUserContext`:

```typescript
@Get('me')
@UseGuards(SessionAuthGuard)
@ApiOperation({ summary: 'Obtener contexto completo del usuario autenticado' })
async getCurrentUserContext(
  @CurrentUser() user: AuthenticatedUser,
  @Req() req: Request,
) {
  const sessionId = req.cookies?.['session_id'];
  const session = sessionId ? await this.sessionService.getSession(sessionId) : null;

  const companies = await this.empresasService.getUserCompanies(user.id);

  let effectivePermissions = null;
  let roles = [];
  let isSuperAdmin = false;

  // Si hay empresa activa, resolver permisos
  if (session?.activeCompanyId) {
    const perms = await this.permissionsService.getEffectivePermissions(
      user.id,
      session.activeCompanyId,
    );
    effectivePermissions = perms.permissions;
    roles = perms.roles;
    isSuperAdmin = perms.isSuperAdmin;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      nombre: user.nombre,
      apellido: user.apellido,
    },
    companies,
    activeCompany: session?.activeCompanyId 
      ? companies.find(c => c.id === session.activeCompanyId) 
      : null,
    roles,
    permissions: effectivePermissions || [],
    isSuperAdmin,
    requiresCompanySelection: companies.length > 1 && !session?.activeCompanyId,
  };
}
```

### 4. Actualizar Guard de Permisos

**Archivo:** `apps/api/src/autenticacion/guards/permissions.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../services/permissions.service';

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(
      PERMISSION_KEY,
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const activeCompany = request.activeCompany;

    if (!user || !activeCompany) {
      throw new ForbiddenException('Usuario o empresa no encontrados');
    }

    const hasPermission = await this.permissionsService.hasPermission(
      user.id,
      activeCompany.id,
      requiredPermission,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `No tienes permiso para realizar esta acción: ${requiredPermission}`,
      );
    }

    return true;
  }
}
```

### 5. Crear Decorador de Permisos Múltiples

**Archivo:** `apps/api/src/common/decorators/require-permissions.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export interface PermissionsOptions {
  permissions: string[];
  requireAll?: boolean; // true = AND, false = OR
}

export const RequirePermissions = (
  permissions: string[],
  requireAll: boolean = false,
) => SetMetadata(PERMISSIONS_KEY, { permissions, requireAll });
```

---

## E. FRONTEND: ARCHIVOS A CREAR/MODIFICAR

### 1. Actualizar Auth Store con Permisos

**Archivo:** `apps/web/src/lib/auth-store.ts`

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  nombre: string;
  apellido: string;
}

interface AuthState {
  user: User | null;
  permissions: string[];
  roles: string[];
  isSuperAdmin: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      permissions: [],
      roles: [],
      isSuperAdmin: false,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // ... métodos existentes ...

      fetchProfile: async () => {
        try {
          const { data } = await apiClient.get('/auth/profile');
          const result = data.data ?? data;
          set({ 
            user: result.user,
            permissions: result.permissions || [],
            roles: result.roles || [],
            isSuperAdmin: result.isSuperAdmin || false,
            isAuthenticated: true 
          });
        } catch {
          get().logout();
        }
      },

      hasPermission: (permission: string) => {
        const { permissions, isSuperAdmin } = get();
        if (isSuperAdmin) return true;
        return permissions.includes(permission);
      },

      hasAnyPermission: (perms: string[]) => {
        const { permissions, isSuperAdmin } = get();
        if (isSuperAdmin) return true;
        return perms.some(p => permissions.includes(p));
      },

      hasAllPermissions: (perms: string[]) => {
        const { permissions, isSuperAdmin } = get();
        if (isSuperAdmin) return true;
        return perms.every(p => permissions.includes(p));
      },

      hasRole: (role: string) => {
        const { roles, isSuperAdmin } = get();
        if (isSuperAdmin) return true;
        return roles.includes(role);
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({
          user: null,
          permissions: [],
          roles: [],
          isSuperAdmin: false,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        permissions: state.permissions,
        roles: state.roles,
        isSuperAdmin: state.isSuperAdmin,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
```

### 2. Crear Hook de Permisos

**Archivo:** `apps/web/src/hooks/use-permissions.ts`

```typescript
import { useAuthStore } from '@/lib/auth-store';

export function usePermissions() {
  const { permissions, isSuperAdmin, hasPermission, hasAnyPermission, hasAllPermissions } = useAuthStore();

  return {
    permissions,
    isSuperAdmin,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canView: (module: string) => hasPermission(`${module}.view`),
    canCreate: (module: string) => hasPermission(`${module}.create`),
    canUpdate: (module: string) => hasPermission(`${module}.update`),
    canDelete: (module: string) => hasPermission(`${module}.delete`),
    canApprove: (module: string) => hasPermission(`${module}.approve`),
  };
}
```

### 3. Configuración de Menú Dinámico

**Archivo:** `apps/web/src/config/menu-config.ts`

```typescript
import {
  LayoutDashboard,
  Users,
  Shield,
  ShoppingCart,
  FileText,
  ClipboardList,
  CheckSquare,
  Package,
  Warehouse,
  FolderOpen,
  BarChart3,
  Truck,
  Settings,
  Sliders,
  Building2,
  Key,
} from 'lucide-react';

export interface MenuItem {
  label: string;
  href: string;
  icon: any;
  permission: string;
  children?: MenuItem[];
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const menuConfig: MenuSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        permission: 'dashboard.view',
      },
      {
        label: 'Catálogo',
        href: '/dashboard/catalogo',
        icon: Package,
        permission: 'catalog.view',
      },
      {
        label: 'Solicitudes',
        href: '/dashboard/solicitudes',
        icon: ClipboardList,
        permission: 'requests.view',
      },
      {
        label: 'Aprobaciones',
        href: '/dashboard/aprobaciones',
        icon: CheckSquare,
        permission: 'approvals.view',
      },
      {
        label: 'Cotizaciones',
        href: '/dashboard/cotizaciones',
        icon: FileText,
        permission: 'quotations.view',
      },
      {
        label: 'Órdenes de Compra',
        href: '/dashboard/compras',
        icon: ShoppingCart,
        permission: 'purchase_orders.view',
      },
      {
        label: 'Recepción',
        href: '/dashboard/recepcion',
        icon: Warehouse,
        permission: 'reception.view',
      },
      {
        label: 'Seguimiento',
        href: '/dashboard/seguimiento',
        icon: BarChart3,
        permission: 'tracking.view',
      },
      {
        label: 'Proveedores',
        href: '/dashboard/proveedores',
        icon: Truck,
        permission: 'suppliers.view',
      },
    ],
  },
  {
    title: 'CONFIG',
    items: [
      {
        label: 'Parametrización',
        href: '/dashboard/parametrizacion',
        icon: Settings,
        permission: 'settings.view',
      },
      {
        label: 'Atributos',
        href: '/dashboard/atributos',
        icon: Sliders,
        permission: 'attributes.view',
      },
    ],
  },
  {
    title: 'SEGURIDAD',
    items: [
      {
        label: 'Usuarios',
        href: '/dashboard/usuarios',
        icon: Users,
        permission: 'users.view',
      },
      {
        label: 'Roles',
        href: '/dashboard/roles',
        icon: Shield,
        permission: 'roles.view',
      },
      {
        label: 'Permisos',
        href: '/dashboard/permisos',
        icon: Key,
        permission: 'permissions.view',
      },
      {
        label: 'Empresas',
        href: '/dashboard/empresas',
        icon: Building2,
        permission: 'companies.view',
      },
    ],
  },
];
```

### 4. Sidebar Dinámico Completo

**Archivo:** `apps/web/src/components/layout/sidebar.tsx`

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { menuConfig, MenuItem, MenuSection } from '@/config/menu-config';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { useState } from 'react';

export function Sidebar() {
  const pathname = usePathname();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);

  // Filtrar secciones y items por permisos
  const authorizedSections = menuConfig
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => 
        isSuperAdmin || hasPermission(item.permission)
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={`flex h-screen flex-col border-r bg-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">SGC</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {authorizedSections.map((section, idx) => (
          <div key={section.title} className={idx > 0 ? 'mt-6' : ''}>
            {!collapsed && (
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
```

### 5. Componente de Protección de Ruta

**Archivo:** `apps/web/src/components/auth/permission-guard.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { AlertCircle } from 'lucide-react';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function PermissionGuard({
  permission,
  children,
  fallback,
  redirectTo = '/dashboard',
}: PermissionGuardProps) {
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const authorized = isSuperAdmin || hasPermission(permission);

  useEffect(() => {
    if (!authorized && redirectTo) {
      router.push(redirectTo);
    }
  }, [authorized, redirectTo, router]);

  if (!authorized) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Acceso Denegado
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            No tienes permisos para acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

### 6. Componente de Control de Acciones

**Archivo:** `apps/web/src/components/auth/can.tsx`

```typescript
'use client';

import { usePermissions } from '@/hooks/use-permissions';

interface CanProps {
  permission: string | string[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ 
  permission, 
  requireAll = false, 
  children, 
  fallback = null 
}: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = usePermissions();

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  
  const authorized = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  return authorized ? <>{children}</> : <>{fallback}</>;
}
```

---

## F. MIGRACIÓN DE BASE DE DATOS

### Script SQL para Actualizar Permisos

**Archivo:** `MIGRACION_PERMISOS_GRANULARES.sql`

```sql
-- Agregar campos a tabla permisos
ALTER TABLE "permisos" ADD COLUMN IF NOT EXISTS "codigo" TEXT;
ALTER TABLE "permisos" ADD COLUMN IF NOT EXISTS "modulo" TEXT;
ALTER TABLE "permisos" ADD COLUMN IF NOT EXISTS "descripcion" TEXT;

-- Crear índices
CREATE INDEX IF NOT EXISTS "permisos_modulo_idx" ON "permisos"("modulo");
CREATE INDEX IF NOT EXISTS "permisos_codigo_idx" ON "permisos"("codigo");

-- Actualizar permisos existentes con códigos
UPDATE "permisos" SET 
  "codigo" = "recurso" || '.' || "accion",
  "modulo" = "recurso"
WHERE "codigo" IS NULL;

-- Hacer codigo único
CREATE UNIQUE INDEX IF NOT EXISTS "permisos_codigo_key" ON "permisos"("codigo");

-- Insertar permisos granulares nuevos
INSERT INTO "permisos" ("id", "codigo", "modulo", "accion", "recurso", "descripcion")
VALUES
  -- Dashboard
  (gen_random_uuid(), 'dashboard.view', 'dashboard', 'view', 'dashboard', 'Ver dashboard'),
  
  -- Catalog
  (gen_random_uuid(), 'catalog.view', 'catalog', 'view', 'catalogo', 'Ver catálogo'),
  (gen_random_uuid(), 'catalog.create', 'catalog', 'create', 'catalogo', 'Crear items de catálogo'),
  (gen_random_uuid(), 'catalog.update', 'catalog', 'update', 'catalogo', 'Editar items de catálogo'),
  (gen_random_uuid(), 'catalog.delete', 'catalog', 'delete', 'catalogo', 'Eliminar items de catálogo'),
  
  -- Requests
  (gen_random_uuid(), 'requests.view', 'requests', 'view', 'solicitudes', 'Ver solicitudes'),
  (gen_random_uuid(), 'requests.create', 'requests', 'create', 'solicitudes', 'Crear solicitudes'),
  (gen_random_uuid(), 'requests.update', 'requests', 'update', 'solicitudes', 'Editar solicitudes'),
  (gen_random_uuid(), 'requests.delete', 'requests', 'delete', 'solicitudes', 'Eliminar solicitudes'),
  
  -- Approvals
  (gen_random_uuid(), 'approvals.view', 'approvals', 'view', 'aprobaciones', 'Ver aprobaciones'),
  (gen_random_uuid(), 'approvals.approve', 'approvals', 'approve', 'aprobaciones', 'Aprobar solicitudes'),
  (gen_random_uuid(), 'approvals.reject', 'approvals', 'reject', 'aprobaciones', 'Rechazar solicitudes'),
  
  -- Quotations
  (gen_random_uuid(), 'quotations.view', 'quotations', 'view', 'cotizaciones', 'Ver cotizaciones'),
  (gen_random_uuid(), 'quotations.create', 'quotations', 'create', 'cotizaciones', 'Crear cotizaciones'),
  (gen_random_uuid(), 'quotations.update', 'quotations', 'update', 'cotizaciones', 'Editar cotizaciones'),
  
  -- Purchase Orders
  (gen_random_uuid(), 'purchase_orders.view', 'purchase_orders', 'view', 'compras', 'Ver órdenes de compra'),
  (gen_random_uuid(), 'purchase_orders.create', 'purchase_orders', 'create', 'compras', 'Crear órdenes'),
  (gen_random_uuid(), 'purchase_orders.update', 'purchase_orders', 'update', 'compras', 'Editar órdenes'),
  (gen_random_uuid(), 'purchase_orders.approve', 'purchase_orders', 'approve', 'compras', 'Aprobar órdenes'),
  
  -- Reception
  (gen_random_uuid(), 'reception.view', 'reception', 'view', 'recepcion', 'Ver recepciones'),
  (gen_random_uuid(), 'reception.create', 'reception', 'create', 'recepcion', 'Registrar recepción'),
  
  -- Tracking
  (gen_random_uuid(), 'tracking.view', 'tracking', 'view', 'seguimiento', 'Ver seguimiento'),
  
  -- Suppliers
  (gen_random_uuid(), 'suppliers.view', 'suppliers', 'view', 'proveedores', 'Ver proveedores'),
  (gen_random_uuid(), 'suppliers.create', 'suppliers', 'create', 'proveedores', 'Crear proveedores'),
  (gen_random_uuid(), 'suppliers.update', 'suppliers', 'update', 'proveedores', 'Editar proveedores'),
  (gen_random_uuid(), 'suppliers.delete', 'suppliers', 'delete', 'proveedores', 'Eliminar proveedores'),
  
  -- Settings
  (gen_random_uuid(), 'settings.view', 'settings', 'view', 'configuracion', 'Ver configuración'),
  (gen_random_uuid(), 'settings.update', 'settings', 'update', 'configuracion', 'Actualizar configuración'),
  
  -- Attributes
  (gen_random_uuid(), 'attributes.view', 'attributes', 'view', 'atributos', 'Ver atributos'),
  (gen_random_uuid(), 'attributes.manage', 'attributes', 'manage', 'atributos', 'Gestionar atributos'),
  
  -- Users
  (gen_random_uuid(), 'users.view', 'users', 'view', 'usuarios', 'Ver usuarios'),
  (gen_random_uuid(), 'users.create', 'users', 'create', 'usuarios', 'Crear usuarios'),
  (gen_random_uuid(), 'users.update', 'users', 'update', 'usuarios', 'Editar usuarios'),
  (gen_random_uuid(), 'users.delete', 'users', 'delete', 'usuarios', 'Eliminar usuarios'),
  
  -- Roles
  (gen_random_uuid(), 'roles.view', 'roles', 'view', 'roles', 'Ver roles'),
  (gen_random_uuid(), 'roles.create', 'roles', 'create', 'roles', 'Crear roles'),
  (gen_random_uuid(), 'roles.update', 'roles', 'update', 'roles', 'Editar roles'),
  (gen_random_uuid(), 'roles.delete', 'roles', 'delete', 'roles', 'Eliminar roles'),
  
  -- Permissions
  (gen_random_uuid(), 'permissions.view', 'permissions', 'view', 'permisos', 'Ver permisos'),
  (gen_random_uuid(), 'permissions.manage', 'permissions', 'manage', 'permisos', 'Gestionar permisos'),
  
  -- Companies
  (gen_random_uuid(), 'companies.view', 'companies', 'view', 'empresas', 'Ver empresas'),
  (gen_random_uuid(), 'companies.create', 'companies', 'create', 'empresas', 'Crear empresas'),
  (gen_random_uuid(), 'companies.update', 'companies', 'update', 'empresas', 'Editar empresas'),
  (gen_random_uuid(), 'companies.delete', 'companies', 'delete', 'empresas', 'Eliminar empresas'),
  
  -- Reports
  (gen_random_uuid(), 'reports.view', 'reports', 'view', 'reportes', 'Ver reportes'),
  (gen_random_uuid(), 'reports.export', 'reports', 'export', 'reportes', 'Exportar reportes')
ON CONFLICT (codigo) DO NOTHING;

-- Asignar todos los permisos al rol super_admin
INSERT INTO "permisos_roles" ("rol_id", "permiso_id")
SELECT 
  r.id,
  p.id
FROM "roles" r
CROSS JOIN "permisos" p
WHERE r.codigo = 'super_admin'
ON CONFLICT DO NOTHING;
```

---

## G. EJEMPLO DE USO EN VISTAS

### Dashboard con Tarjetas Filtradas

**Archivo:** `apps/web/src/app/(dashboard)/dashboard/page.tsx`

```typescript
'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { Can } from '@/components/auth/can';
import { 
  ClipboardList, 
  CheckSquare, 
  ShoppingCart, 
  Package 
} from 'lucide-react';

export default function DashboardPage() {
  const { hasPermission } = usePermissions();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard de Compras</h1>

      {/* KPIs - Solo si tiene permisos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Can permission="requests.view">
          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Solicitudes Pendientes</p>
                <p className="text-3xl font-bold">24</p>
              </div>
              <ClipboardList className="h-12 w-12 text-blue-600" />
            </div>
          </div>
        </Can>

        <Can permission="approvals.view">
          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Aprobación</p>
                <p className="text-3xl font-bold">15</p>
              </div>
              <CheckSquare className="h-12 w-12 text-yellow-600" />
            </div>
          </div>
        </Can>

        <Can permission="purchase_orders.view">
          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Órdenes Generadas</p>
                <p className="text-3xl font-bold">42</p>
              </div>
              <ShoppingCart className="h-12 w-12 text-green-600" />
            </div>
          </div>
        </Can>

        <Can permission="catalog.view">
          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Items en Catálogo</p>
                <p className="text-3xl font-bold">1,234</p>
              </div>
              <Package className="h-12 w-12 text-purple-600" />
            </div>
          </div>
        </Can>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Can permission="requests.create">
          <button className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-500">
            <ClipboardList className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 font-medium">Nueva Solicitud</p>
          </button>
        </Can>

        <Can permission="approvals.approve">
          <button className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-500">
            <CheckSquare className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 font-medium">Aprobar Solicitudes</p>
          </button>
        </Can>

        <Can permission="purchase_orders.create">
          <button className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-500">
            <ShoppingCart className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 font-medium">Nueva Orden de Compra</p>
          </button>
        </Can>
      </div>
    </div>
  );
}
```

### Vista con Botones Condicionales

**Archivo:** `apps/web/src/app/(dashboard)/dashboard/solicitudes/page.tsx`

```typescript
'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { Can } from '@/components/auth/can';
import { Plus, Edit, Trash } from 'lucide-react';

export default function SolicitudesPage() {
  return (
    <PermissionGuard permission="requests.view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Solicitudes de Compra</h1>
          
          <Can permission="requests.create">
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Nueva Solicitud
            </button>
          </Can>
        </div>

        {/* Lista de solicitudes */}
        <div className="space-y-2">
          {/* Ejemplo de item */}
          <div className="flex items-center justify-between rounded-lg border bg-white p-4">
            <div>
              <h3 className="font-medium">SOL-2024-001</h3>
              <p className="text-sm text-gray-600">Material de oficina</p>
            </div>
            
            <div className="flex gap-2">
              <Can permission="requests.update">
                <button className="rounded p-2 text-blue-600 hover:bg-blue-50">
                  <Edit className="h-4 w-4" />
                </button>
              </Can>
              
              <Can permission="requests.delete">
                <button className="rounded p-2 text-red-600 hover:bg-red-50">
                  <Trash className="h-4 w-4" />
                </button>
              </Can>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
```

---

## H. CHECKLIST DE IMPLEMENTACIÓN

### Backend
- [ ] Actualizar schema Prisma con campos codigo, modulo, descripcion
- [ ] Ejecutar migración SQL de permisos granulares
- [ ] Crear PermissionsService
- [ ] Actualizar PermissionsGuard
- [ ] Actualizar endpoint /auth/me con permisos efectivos
- [ ] Agregar PermissionsService a AutenticacionModule
- [ ] Regenerar Prisma Client

### Frontend
- [ ] Actualizar auth-store con permisos
- [ ] Crear hook usePermissions
- [ ] Crear menu-config con permisos
- [ ] Actualizar Sidebar con menú dinámico
- [ ] Crear componente PermissionGuard
- [ ] Crear componente Can
- [ ] Actualizar dashboard con filtrado de tarjetas
- [ ] Proteger rutas con PermissionGuard

### Testing
- [ ] SuperAdmin ve todos los módulos
- [ ] Usuario con permisos limitados ve solo sus módulos
- [ ] Botones se ocultan según permisos
- [ ] Rutas protegidas redirigen correctamente
- [ ] Cambio de empresa actualiza permisos
- [ ] Backend rechaza accesos sin permisos

---

## I. PRÓXIMOS PASOS

1. Ejecutar migración SQL
2. Regenerar Prisma Client
3. Crear archivos backend
4. Crear archivos frontend
5. Probar flujo completo
6. Ajustar permisos por rol según necesidad

---

**FIN DE LA DOCUMENTACIÓN**
