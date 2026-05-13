-- Migration: add_proveedor_tributario_and_related_tables
-- Adds missing Datos Tributarios and Experiencia columns to proveedores,
-- plus the sucursales_proveedores, cuentas_bancarias_proveedores,
-- socios_proveedores, tipos_documentos_requeridos and documentos_proveedores tables.

-- ============================================================
-- 1. Columns missing from "proveedores"
-- ============================================================
ALTER TABLE "proveedores"
ADD COLUMN IF NOT EXISTS "regimen_iva"              TEXT,
ADD COLUMN IF NOT EXISTS "es_autorretenedor_renta"  BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "resolucion_renta_no"      TEXT,
ADD COLUMN IF NOT EXISTS "resolucion_renta_fecha"   TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "resolucion_renta_pct"     DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS "es_gran_contribuyente"    BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "resolucion_gc_no"         TEXT,
ADD COLUMN IF NOT EXISTS "resolucion_gc_fecha"      TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "actividades_ica"          TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "codigo_ica"               TEXT,
ADD COLUMN IF NOT EXISTS "municipio_ica"            TEXT,
ADD COLUMN IF NOT EXISTS "es_autorretenedor_ica"    BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "rango_experiencia"        TEXT,
ADD COLUMN IF NOT EXISTS "descripcion_experiencia"  VARCHAR(500);

-- ============================================================
-- 2. Table: sucursales_proveedores
-- ============================================================
CREATE TABLE IF NOT EXISTS "sucursales_proveedores" (
    "id"          TEXT NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "numero"      INTEGER NOT NULL,
    "direccion"   TEXT NOT NULL,
    "ciudad"      TEXT NOT NULL,
    "pais"        TEXT,
    "contacto"    TEXT NOT NULL,
    "telefono"    TEXT NOT NULL,
    "fax"         TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sucursales_proveedores_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sucursales_proveedores_proveedor_id_idx"
    ON "sucursales_proveedores"("proveedor_id");

ALTER TABLE "sucursales_proveedores"
    DROP CONSTRAINT IF EXISTS "sucursales_proveedores_proveedor_id_fkey";

ALTER TABLE "sucursales_proveedores"
    ADD CONSTRAINT "sucursales_proveedores_proveedor_id_fkey"
    FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 3. Table: cuentas_bancarias_proveedores
-- ============================================================
CREATE TABLE IF NOT EXISTS "cuentas_bancarias_proveedores" (
    "id"              TEXT NOT NULL,
    "proveedor_id"    TEXT NOT NULL,
    "titular_cuenta"  TEXT NOT NULL,
    "numero_cuenta"   TEXT NOT NULL,
    "tipo_cuenta"     TEXT NOT NULL,
    "banco"           TEXT NOT NULL,
    "ciudad"          TEXT NOT NULL,
    "condicion_pago"  TEXT NOT NULL,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_bancarias_proveedores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cuentas_bancarias_proveedores_proveedor_id_numero_cuenta_key"
    ON "cuentas_bancarias_proveedores"("proveedor_id", "numero_cuenta");

CREATE INDEX IF NOT EXISTS "cuentas_bancarias_proveedores_proveedor_id_idx"
    ON "cuentas_bancarias_proveedores"("proveedor_id");

ALTER TABLE "cuentas_bancarias_proveedores"
    DROP CONSTRAINT IF EXISTS "cuentas_bancarias_proveedores_proveedor_id_fkey";

ALTER TABLE "cuentas_bancarias_proveedores"
    ADD CONSTRAINT "cuentas_bancarias_proveedores_proveedor_id_fkey"
    FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 4. Table: socios_proveedores
-- ============================================================
CREATE TABLE IF NOT EXISTS "socios_proveedores" (
    "id"                TEXT NOT NULL,
    "proveedor_id"      TEXT NOT NULL,
    "tipo_doc"          TEXT NOT NULL,
    "numero_doc"        TEXT NOT NULL,
    "nombre_razon"      TEXT NOT NULL,
    "participacion"     DECIMAL(5,2) NOT NULL,
    "tipo_participacion" TEXT NOT NULL DEFAULT 'directa',
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "socios_proveedores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "socios_proveedores_proveedor_id_tipo_doc_numero_doc_key"
    ON "socios_proveedores"("proveedor_id", "tipo_doc", "numero_doc");

CREATE INDEX IF NOT EXISTS "socios_proveedores_proveedor_id_idx"
    ON "socios_proveedores"("proveedor_id");

ALTER TABLE "socios_proveedores"
    DROP CONSTRAINT IF EXISTS "socios_proveedores_proveedor_id_fkey";

ALTER TABLE "socios_proveedores"
    ADD CONSTRAINT "socios_proveedores_proveedor_id_fkey"
    FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 5. Table: tipos_documentos_requeridos
-- ============================================================
CREATE TABLE IF NOT EXISTS "tipos_documentos_requeridos" (
    "id"               TEXT NOT NULL,
    "nombre"           TEXT NOT NULL,
    "descripcion"      TEXT,
    "obligatorio"      BOOLEAN NOT NULL DEFAULT true,
    "aplica_persona"   TEXT NOT NULL DEFAULT 'ambos',
    "aplica_proveedor" TEXT NOT NULL DEFAULT 'todos',
    "requiere_vigencia" BOOLEAN NOT NULL DEFAULT false,
    "activo"           BOOLEAN NOT NULL DEFAULT true,
    "orden"            INTEGER NOT NULL DEFAULT 0,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_documentos_requeridos_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- 6. Table: documentos_proveedores
-- ============================================================
CREATE TABLE IF NOT EXISTS "documentos_proveedores" (
    "id"               TEXT NOT NULL,
    "proveedor_id"     TEXT NOT NULL,
    "tipo_documento_id" TEXT NOT NULL,
    "nombre"           TEXT NOT NULL,
    "url"              TEXT,
    "fecha_expedicion" TIMESTAMP(3),
    "fecha_vencimiento" TIMESTAMP(3),
    "estado"           TEXT NOT NULL DEFAULT 'cargado',
    "observaciones"    TEXT,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_proveedores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "documentos_proveedores_proveedor_id_tipo_documento_id_key"
    ON "documentos_proveedores"("proveedor_id", "tipo_documento_id");

CREATE INDEX IF NOT EXISTS "documentos_proveedores_proveedor_id_idx"
    ON "documentos_proveedores"("proveedor_id");

ALTER TABLE "documentos_proveedores"
    DROP CONSTRAINT IF EXISTS "documentos_proveedores_proveedor_id_fkey";

ALTER TABLE "documentos_proveedores"
    ADD CONSTRAINT "documentos_proveedores_proveedor_id_fkey"
    FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documentos_proveedores"
    DROP CONSTRAINT IF EXISTS "documentos_proveedores_tipo_documento_id_fkey";

ALTER TABLE "documentos_proveedores"
    ADD CONSTRAINT "documentos_proveedores_tipo_documento_id_fkey"
    FOREIGN KEY ("tipo_documento_id") REFERENCES "tipos_documentos_requeridos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
