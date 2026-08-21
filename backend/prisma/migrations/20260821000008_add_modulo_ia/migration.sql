-- Migration: add_modulo_ia
-- Agrega módulo IA: enums, tablas de configuración, propuestas, ejecuciones y conversaciones

-- ─── 1. Nuevos valores en enums existentes ────────────────────────────────────

-- TipoModulo: agregar 'ia'
DO $$ BEGIN
  ALTER TYPE "TipoModulo" ADD VALUE IF NOT EXISTS 'ia';
EXCEPTION
  WHEN others THEN null;
END $$;

-- ─── 2. Nuevos enums ──────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "EstadoPropuestaIA" AS ENUM (
    'borrador', 'validada', 'aprobada', 'aplicada', 'rechazada', 'expirada'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoOperacionIA" AS ENUM (
    'validacion', 'generacion_propuesta', 'simulacion',
    'consulta_asistente', 'explicacion', 'aprobacion', 'aplicacion'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ResultadoOperacionIA" AS ENUM (
    'exitoso', 'fallido', 'rechazado', 'bloqueado'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 3. Tabla configuracion_ia ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "configuracion_ia" (
  "id"                      TEXT NOT NULL,
  "empresaId"               TEXT NOT NULL,
  "habilitada"              BOOLEAN NOT NULL DEFAULT false,
  "proveedor"               VARCHAR(50) NOT NULL DEFAULT 'openai',
  "modelo"                  VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
  "temperatura"             DECIMAL(3,2) NOT NULL DEFAULT 0.2,
  "limiteTokensRespuesta"   INTEGER NOT NULL DEFAULT 2000,
  "limiteMensualTokens"     INTEGER,
  "permitirDatosNomina"     BOOLEAN NOT NULL DEFAULT false,
  "permitirNombres"         BOOLEAN NOT NULL DEFAULT false,
  "retencionAuditoriaDias"  INTEGER NOT NULL DEFAULT 90,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL,

  CONSTRAINT "configuracion_ia_pkey" PRIMARY KEY ("id")
);

-- FK: configuracion_ia → empresas
ALTER TABLE "configuracion_ia"
  ADD CONSTRAINT "configuracion_ia_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "configuracion_ia_empresaId_key" ON "configuracion_ia"("empresaId");

-- ─── 4. Tabla propuestas_programacion_ia ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS "propuestas_programacion_ia" (
  "id"                   TEXT NOT NULL,
  "empresaId"            TEXT NOT NULL,
  "areaId"               TEXT,
  "periodoInicio"        DATE NOT NULL,
  "periodoFin"           DATE NOT NULL,
  "nombre"               VARCHAR(200) NOT NULL,
  "objetivo"             VARCHAR(60) NOT NULL,
  "estado"               "EstadoPropuestaIA" NOT NULL DEFAULT 'borrador',
  "restricciones"        JSONB NOT NULL,
  "propuesta"            JSONB NOT NULL,
  "indicadoresBase"      JSONB,
  "indicadoresPropuesta" JSONB,
  "hallazgos"            JSONB,
  "explicacion"          TEXT,
  "dataHash"             VARCHAR(64),
  "creadoPorId"          TEXT NOT NULL,
  "aprobadoPorId"        TEXT,
  "fechaAprobacion"      TIMESTAMP(3),
  "version"              INTEGER NOT NULL DEFAULT 1,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,

  CONSTRAINT "propuestas_programacion_ia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "propuestas_ia_empresa_periodo_idx"
  ON "propuestas_programacion_ia"("empresaId", "periodoInicio", "periodoFin");
CREATE INDEX IF NOT EXISTS "propuestas_ia_empresa_estado_idx"
  ON "propuestas_programacion_ia"("empresaId", "estado");

-- ─── 5. Tabla ejecuciones_ia ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ejecuciones_ia" (
  "id"            TEXT NOT NULL,
  "empresaId"     TEXT NOT NULL,
  "usuarioId"     TEXT NOT NULL,
  "propuestaId"   TEXT,
  "tipoOperacion" "TipoOperacionIA" NOT NULL,
  "proveedor"     VARCHAR(50),
  "modelo"        VARCHAR(100),
  "promptHash"    VARCHAR(64),
  "tokensEntrada" INTEGER,
  "tokensSalida"  INTEGER,
  "costoEstimado" DECIMAL(14,6),
  "duracionMs"    INTEGER,
  "resultado"     "ResultadoOperacionIA" NOT NULL,
  "codigoError"   VARCHAR(80),
  "metadata"      JSONB,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ejecuciones_ia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ejecuciones_ia_empresa_fecha_idx"
  ON "ejecuciones_ia"("empresaId", "createdAt");
CREATE INDEX IF NOT EXISTS "ejecuciones_ia_empresa_tipo_idx"
  ON "ejecuciones_ia"("empresaId", "tipoOperacion");

-- ─── 6. Tabla conversaciones_ia ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "conversaciones_ia" (
  "id"        TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "titulo"    VARCHAR(200),
  "estado"    VARCHAR(20) NOT NULL DEFAULT 'activa',
  "contexto"  JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "conversaciones_ia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "conversaciones_ia_empresa_usuario_idx"
  ON "conversaciones_ia"("empresaId", "usuarioId", "updatedAt");

-- ─── 7. Tabla mensajes_ia ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "mensajes_ia" (
  "id"             TEXT NOT NULL,
  "conversacionId" TEXT NOT NULL,
  "rol"            VARCHAR(20) NOT NULL,
  "contenido"      TEXT NOT NULL,
  "metadata"       JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mensajes_ia_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "mensajes_ia"
  ADD CONSTRAINT "mensajes_ia_conversacionId_fkey"
  FOREIGN KEY ("conversacionId") REFERENCES "conversaciones_ia"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "mensajes_ia_conversacion_fecha_idx"
  ON "mensajes_ia"("conversacionId", "createdAt");
