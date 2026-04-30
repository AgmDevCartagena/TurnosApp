-- ============================================
-- MIGRACIÓN: Sistema Multiempresa
-- ============================================
-- Este script migra el sistema de autenticación monolítica
-- a un sistema multiempresa con contexto de empresa activa
-- ============================================

-- 1. Crear tabla empresas
CREATE TABLE IF NOT EXISTS "empresas" (
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "empresas_activo_idx" ON "empresas"("activo");

-- 2. Crear tabla usuarios_empresas_roles (pivote)
CREATE TABLE IF NOT EXISTS "usuarios_empresas_roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "rol_id" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usuarios_empresas_roles_usuario_id_fkey" 
        FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE,
    CONSTRAINT "usuarios_empresas_roles_empresa_id_fkey" 
        FOREIGN KEY ("empresa_id") REFERENCES "empresas" ("id") ON DELETE CASCADE,
    CONSTRAINT "usuarios_empresas_roles_rol_id_fkey" 
        FOREIGN KEY ("rol_id") REFERENCES "roles" ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_empresas_roles_usuario_id_empresa_id_rol_id_key" 
    ON "usuarios_empresas_roles"("usuario_id", "empresa_id", "rol_id");
CREATE INDEX IF NOT EXISTS "usuarios_empresas_roles_usuario_id_empresa_id_activo_idx" 
    ON "usuarios_empresas_roles"("usuario_id", "empresa_id", "activo");
CREATE INDEX IF NOT EXISTS "usuarios_empresas_roles_empresa_id_activo_idx" 
    ON "usuarios_empresas_roles"("empresa_id", "activo");

-- 3. Agregar campo codigo a roles
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "codigo" TEXT;

-- Actualizar códigos para roles existentes
UPDATE "roles" SET "codigo" = LOWER(REPLACE("nombre", ' ', '_')) WHERE "codigo" IS NULL;

-- Hacer codigo NOT NULL y único
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'roles_codigo_key'
    ) THEN
        ALTER TABLE "roles" ALTER COLUMN "codigo" SET NOT NULL;
        CREATE UNIQUE INDEX "roles_codigo_key" ON "roles"("codigo");
    END IF;
END $$;

-- 4. Hacer rolId nullable en usuarios (compatibilidad temporal)
ALTER TABLE "usuarios" ALTER COLUMN "rol_id" DROP NOT NULL;

-- 5. Crear empresa por defecto
INSERT INTO "empresas" ("id", "nombre", "nit", "razon_social", "activo", "created_at", "updated_at")
SELECT 
    gen_random_uuid(),
    'AGM DESARROLLOS SAS',
    '900.000.000-1',
    'AGM DESARROLLOS SAS',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "empresas" WHERE "nit" = '900.000.000-1'
);

-- 6. Migrar usuarios existentes a la empresa por defecto
INSERT INTO "usuarios_empresas_roles" ("id", "usuario_id", "empresa_id", "rol_id", "activo", "created_at", "updated_at")
SELECT 
    gen_random_uuid(),
    u."id",
    (SELECT "id" FROM "empresas" WHERE "nit" = '900.000.000-1' LIMIT 1),
    u."rol_id",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "usuarios" u
WHERE u."rol_id" IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM "usuarios_empresas_roles" uer 
    WHERE uer."usuario_id" = u."id" 
    AND uer."rol_id" = u."rol_id"
);

-- 7. Agregar empresaId a solicitudes_compra
ALTER TABLE "solicitudes_compra" ADD COLUMN IF NOT EXISTS "empresa_id" TEXT;

-- Asignar empresa por defecto a solicitudes existentes
UPDATE "solicitudes_compra" 
SET "empresa_id" = (SELECT "id" FROM "empresas" WHERE "nit" = '900.000.000-1' LIMIT 1)
WHERE "empresa_id" IS NULL;

-- Hacer empresa_id NOT NULL y agregar foreign key
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'solicitudes_compra_empresa_id_fkey'
    ) THEN
        ALTER TABLE "solicitudes_compra" ALTER COLUMN "empresa_id" SET NOT NULL;
        ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_empresa_id_fkey" 
            FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id");
        CREATE INDEX "solicitudes_compra_empresa_id_idx" ON "solicitudes_compra"("empresa_id");
    END IF;
END $$;

-- 8. Agregar empresaId a ordenes_compra
ALTER TABLE "ordenes_compra" ADD COLUMN IF NOT EXISTS "empresa_id" TEXT;

UPDATE "ordenes_compra" 
SET "empresa_id" = (SELECT "id" FROM "empresas" WHERE "nit" = '900.000.000-1' LIMIT 1)
WHERE "empresa_id" IS NULL;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ordenes_compra_empresa_id_fkey'
    ) THEN
        ALTER TABLE "ordenes_compra" ALTER COLUMN "empresa_id" SET NOT NULL;
        ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_empresa_id_fkey" 
            FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id");
        CREATE INDEX "ordenes_compra_empresa_id_idx" ON "ordenes_compra"("empresa_id");
    END IF;
END $$;

-- 9. Agregar empresaId a centros_costo
ALTER TABLE "centros_costo" ADD COLUMN IF NOT EXISTS "empresa_id" TEXT;

UPDATE "centros_costo" 
SET "empresa_id" = (SELECT "id" FROM "empresas" WHERE "nit" = '900.000.000-1' LIMIT 1)
WHERE "empresa_id" IS NULL;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'centros_costo_empresa_id_fkey'
    ) THEN
        ALTER TABLE "centros_costo" ALTER COLUMN "empresa_id" SET NOT NULL;
        ALTER TABLE "centros_costo" ADD CONSTRAINT "centros_costo_empresa_id_fkey" 
            FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id");
        CREATE INDEX "centros_costo_empresa_id_idx" ON "centros_costo"("empresa_id");
    END IF;
END $$;

-- 10. Crear tabla company_audit_logs
CREATE TABLE IF NOT EXISTS "company_audit_logs" (
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
    CONSTRAINT "company_audit_logs_empresa_id_fkey" 
        FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
);

CREATE INDEX IF NOT EXISTS "company_audit_logs_evento_created_at_idx" 
    ON "company_audit_logs"("evento", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "company_audit_logs_usuario_id_empresa_id_idx" 
    ON "company_audit_logs"("usuario_id", "empresa_id");

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que se crearon las tablas
SELECT 
    'empresas' as tabla,
    COUNT(*) as registros
FROM "empresas"
UNION ALL
SELECT 
    'usuarios_empresas_roles' as tabla,
    COUNT(*) as registros
FROM "usuarios_empresas_roles"
UNION ALL
SELECT 
    'company_audit_logs' as tabla,
    COUNT(*) as registros
FROM "company_audit_logs";

-- Verificar usuarios migrados
SELECT 
    u.username,
    u.email,
    e.nombre as empresa,
    r.nombre as rol
FROM "usuarios" u
JOIN "usuarios_empresas_roles" uer ON u.id = uer.usuario_id
JOIN "empresas" e ON uer.empresa_id = e.id
JOIN "roles" r ON uer.rol_id = r.id
WHERE uer.activo = true
ORDER BY u.username;

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
