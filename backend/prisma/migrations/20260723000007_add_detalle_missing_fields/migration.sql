-- Migration: add_detalle_missing_fields
-- Agrega columnas faltantes en detalles_program_transporte
-- (areaId FK, estadoAprobacion, campos de aprobación/rechazo)

-- 1. Enum EstadoAprobacionPersona (si no existe)
DO $$ BEGIN
  CREATE TYPE "EstadoAprobacionPersona" AS ENUM ('pendiente', 'aprobado', 'rechazado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Columnas faltantes en detalles_program_transporte
ALTER TABLE "detalles_program_transporte"
  ADD COLUMN IF NOT EXISTS "areaId"           TEXT,
  ADD COLUMN IF NOT EXISTS "estadoAprobacion" "EstadoAprobacionPersona" NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS "motivoRechazo"    VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "aprobadoPorId"    TEXT,
  ADD COLUMN IF NOT EXISTS "aprobadoEn"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rechazadoPorId"   TEXT,
  ADD COLUMN IF NOT EXISTS "rechazadoEn"      TIMESTAMP(3);

-- 3. FK areaId → areas
ALTER TABLE "detalles_program_transporte"
  ADD CONSTRAINT "detalles_program_transporte_areaId_fkey"
  FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Índice por estadoAprobacion (consultas de filtrado)
CREATE INDEX IF NOT EXISTS "detalles_program_transporte_estadoAprobacion_idx"
  ON "detalles_program_transporte"("estadoAprobacion");
