-- AlterTable: agregar campo orden a permisos y ajustar descripcion a 500 chars
ALTER TABLE "permisos" ADD COLUMN IF NOT EXISTS "orden" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "permisos" ALTER COLUMN "descripcion" TYPE VARCHAR(500);

-- Índice para ordenar permisos por módulo + orden en la UI
CREATE INDEX IF NOT EXISTS "permisos_modulo_orden_idx" ON "permisos"("modulo", "orden");
-- Eliminar índice antiguo si existe
DROP INDEX IF EXISTS "permisos_modulo_accion_idx";
