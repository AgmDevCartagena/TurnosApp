-- Migration: add_ia_apikey_byok
-- Agrega columnas BYOK (Bring Your Own Key) a configuracion_ia
-- para almacenar la clave de acceso IA cifrada por empresa.
-- Idempotente: usa ADD COLUMN IF NOT EXISTS.

ALTER TABLE "configuracion_ia"
  ADD COLUMN IF NOT EXISTS "apiKeyEncriptada"      TEXT,
  ADD COLUMN IF NOT EXISTS "apiKeyMascara"         VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "apiKeyEstado"          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "apiKeyFechaValidacion" TIMESTAMP(3);
