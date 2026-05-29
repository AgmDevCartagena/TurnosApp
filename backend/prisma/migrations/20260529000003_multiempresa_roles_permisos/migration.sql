-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: multiempresa_roles_permisos
-- Descripción: Soporte de usuarios en múltiples empresas con roles,
--              permisos granulares y módulos/áreas por empresa.
-- ═══════════════════════════════════════════════════════════════════════════

-- NOTA: ALTER TYPE ADD VALUE no puede ejecutarse dentro de transacciones
--       en PG < 12. En PG 12+ sí es posible. Esta migración usa Prisma
--       que maneja la transacción por nosotros.

-- ─── 1. Nuevos valores en enum TipoModulo ───────────────────────────────────
ALTER TYPE "TipoModulo" ADD VALUE IF NOT EXISTS 'usuarios';
ALTER TYPE "TipoModulo" ADD VALUE IF NOT EXISTS 'parametros';
ALTER TYPE "TipoModulo" ADD VALUE IF NOT EXISTS 'reportes';
ALTER TYPE "TipoModulo" ADD VALUE IF NOT EXISTS 'empresas';
ALTER TYPE "TipoModulo" ADD VALUE IF NOT EXISTS 'areas';

-- ─── 2. Campo correo en usuarios ────────────────────────────────────────────
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "correo" VARCHAR(200);

-- ─── 3. Tabla roles ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "roles" (
    "id"          TEXT NOT NULL,
    "codigo"      VARCHAR(60) NOT NULL,
    "nombre"      VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "tipo"        VARCHAR(30) NOT NULL DEFAULT 'empresa',
    "estado"      "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "roles_codigo_key" ON "roles"("codigo");
CREATE INDEX IF NOT EXISTS "roles_estado_idx" ON "roles"("estado");

-- ─── 4. Tabla permisos ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "permisos" (
    "id"          TEXT NOT NULL,
    "codigo"      VARCHAR(100) NOT NULL,
    "nombre"      VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "modulo"      VARCHAR(60) NOT NULL,
    "recurso"     VARCHAR(60) NOT NULL,
    "accion"      VARCHAR(30) NOT NULL,
    "estado"      "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "permisos_codigo_key" ON "permisos"("codigo");
CREATE INDEX IF NOT EXISTS "permisos_modulo_accion_idx" ON "permisos"("modulo", "accion");
CREATE INDEX IF NOT EXISTS "permisos_estado_idx" ON "permisos"("estado");

-- ─── 5. Tabla rol_permisos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "rol_permisos" (
    "rolId"     TEXT NOT NULL,
    "permisoId" TEXT NOT NULL,
    CONSTRAINT "rol_permisos_pkey" PRIMARY KEY ("rolId", "permisoId"),
    CONSTRAINT "rol_permisos_rolId_fkey"     FOREIGN KEY ("rolId")     REFERENCES "roles"("id")   ON DELETE CASCADE,
    CONSTRAINT "rol_permisos_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "permisos"("id") ON DELETE CASCADE
);

-- ─── 6. Tabla usuario_empresa (N:M usuario ↔ empresa con rol) ───────────────
CREATE TABLE IF NOT EXISTS "usuario_empresa" (
    "id"                   TEXT NOT NULL,
    "usuarioId"            TEXT NOT NULL,
    "empresaId"            TEXT NOT NULL,
    "rolId"                TEXT NOT NULL,
    "empresaActivaDefault" BOOLEAN NOT NULL DEFAULT false,
    "estado"               "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usuario_empresa_pkey"      PRIMARY KEY ("id"),
    CONSTRAINT "usuario_empresa_uq"        UNIQUE ("usuarioId", "empresaId"),
    CONSTRAINT "ue_usuarioId_fkey"         FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE,
    CONSTRAINT "ue_empresaId_fkey"         FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE,
    CONSTRAINT "ue_rolId_fkey"             FOREIGN KEY ("rolId")     REFERENCES "roles"("id")
);
CREATE INDEX IF NOT EXISTS "usuario_empresa_usuarioId_idx" ON "usuario_empresa"("usuarioId");
CREATE INDEX IF NOT EXISTS "usuario_empresa_empresaId_idx" ON "usuario_empresa"("empresaId");

-- ─── 7. Tabla usuario_empresa_areas ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "usuario_empresa_areas" (
    "id"               TEXT NOT NULL,
    "usuarioEmpresaId" TEXT NOT NULL,
    "areaId"           TEXT NOT NULL,
    CONSTRAINT "uea_pkey"              PRIMARY KEY ("id"),
    CONSTRAINT "uea_uq"               UNIQUE ("usuarioEmpresaId", "areaId"),
    CONSTRAINT "uea_usuarioEmpresaId" FOREIGN KEY ("usuarioEmpresaId") REFERENCES "usuario_empresa"("id") ON DELETE CASCADE,
    CONSTRAINT "uea_areaId"           FOREIGN KEY ("areaId")           REFERENCES "areas"("id")           ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "uea_areaId_idx" ON "usuario_empresa_areas"("areaId");

-- ─── 8. Tabla usuario_empresa_modulos ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "usuario_empresa_modulos" (
    "id"               TEXT NOT NULL,
    "usuarioEmpresaId" TEXT NOT NULL,
    "moduloId"         TEXT NOT NULL,
    "activo"           BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "uem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uem_uq"   UNIQUE ("usuarioEmpresaId", "moduloId"),
    CONSTRAINT "uem_usuarioEmpresaId" FOREIGN KEY ("usuarioEmpresaId") REFERENCES "usuario_empresa"("id") ON DELETE CASCADE,
    CONSTRAINT "uem_moduloId"         FOREIGN KEY ("moduloId")         REFERENCES "modulos"("id")         ON DELETE CASCADE
);

-- ─── 9. Tabla usuario_empresa_permisos ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "usuario_empresa_permisos" (
    "id"               TEXT NOT NULL,
    "usuarioEmpresaId" TEXT NOT NULL,
    "permisoId"        TEXT NOT NULL,
    "permitido"        BOOLEAN NOT NULL DEFAULT true,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uep_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uep_uq"   UNIQUE ("usuarioEmpresaId", "permisoId"),
    CONSTRAINT "uep_usuarioEmpresaId" FOREIGN KEY ("usuarioEmpresaId") REFERENCES "usuario_empresa"("id") ON DELETE CASCADE,
    CONSTRAINT "uep_permisoId"        FOREIGN KEY ("permisoId")        REFERENCES "permisos"("id")        ON DELETE CASCADE
);
