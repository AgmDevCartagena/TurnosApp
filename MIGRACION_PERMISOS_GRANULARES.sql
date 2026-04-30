-- ============================================
-- MIGRACIÓN: Permisos Granulares RBAC
-- ============================================
-- Este script actualiza el sistema de permisos
-- para soportar permisos granulares con códigos
-- ============================================

-- 1. Agregar campos a tabla permisos
ALTER TABLE "permisos" ADD COLUMN IF NOT EXISTS "codigo" TEXT;
ALTER TABLE "permisos" ADD COLUMN IF NOT EXISTS "modulo" TEXT;
ALTER TABLE "permisos" ADD COLUMN IF NOT EXISTS "descripcion" TEXT;

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS "permisos_modulo_idx" ON "permisos"("modulo");
CREATE INDEX IF NOT EXISTS "permisos_codigo_idx" ON "permisos"("codigo");

-- 3. Actualizar permisos existentes con códigos
UPDATE "permisos" SET 
  "codigo" = "recurso" || '.' || "accion",
  "modulo" = "recurso"
WHERE "codigo" IS NULL;

-- 4. Hacer codigo único
CREATE UNIQUE INDEX IF NOT EXISTS "permisos_codigo_key" ON "permisos"("codigo");

-- 5. Insertar permisos granulares nuevos
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
  (gen_random_uuid(), 'reception.update', 'reception', 'update', 'recepcion', 'Actualizar recepción'),
  
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

-- 6. Asignar todos los permisos al rol super_admin
INSERT INTO "permisos_roles" ("rol_id", "permiso_id")
SELECT 
  r.id,
  p.id
FROM "roles" r
CROSS JOIN "permisos" p
WHERE r.codigo = 'super_admin'
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar permisos creados
SELECT 
  COUNT(*) as total_permisos,
  COUNT(DISTINCT modulo) as total_modulos
FROM "permisos";

-- Ver permisos por módulo
SELECT 
  modulo,
  COUNT(*) as cantidad
FROM "permisos"
GROUP BY modulo
ORDER BY modulo;

-- Verificar permisos de super_admin
SELECT 
  r.nombre as rol,
  COUNT(pr.permiso_id) as total_permisos
FROM "roles" r
LEFT JOIN "permisos_roles" pr ON r.id = pr.rol_id
WHERE r.codigo = 'super_admin'
GROUP BY r.nombre;

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
