-- Migration: fix #23 — ajustar longitudes de columnas en programaciones_transporte
-- placaManual: VARCHAR(10) → VARCHAR(20)  (soporta placas internacionales, duplicadas, etc.)
-- titulo:      VARCHAR(200) → VARCHAR(150) (alineado con validación de app layer)

ALTER TABLE "programaciones_transporte"
  ALTER COLUMN "placaManual" TYPE VARCHAR(20),
  ALTER COLUMN "titulo" TYPE VARCHAR(150);
