/*
  Warnings:
  - Mejoras al modelo de Proveedores para soportar flujo wizard y ubicaciones geográficas
*/

-- Paso 1: Crear tablas de ubicaciones geográficas
CREATE TABLE "paises" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_oficial" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "paises_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "departamentos" (
    "id" TEXT NOT NULL,
    "pais_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "departamentos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ciudades" (
    "id" TEXT NOT NULL,
    "departamento_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ciudades_pkey" PRIMARY KEY ("id")
);

-- Paso 2: Insertar datos iniciales de Colombia
INSERT INTO "paises" ("id", "codigo", "nombre", "nombre_oficial", "activo", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'CO', 'Colombia', 'República de Colombia', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Paso 3: Agregar nuevos campos a proveedores
ALTER TABLE "proveedores" 
ADD COLUMN "codigo_proveedor" TEXT,
ADD COLUMN "nombre_completo" TEXT,
ADD COLUMN "pais_id" TEXT,
ADD COLUMN "departamento_id" TEXT,
ADD COLUMN "ciudad_id" TEXT,
ADD COLUMN "estado_onboarding" TEXT DEFAULT 'completado',
ADD COLUMN "estado_operativo" TEXT DEFAULT 'activo',
ADD COLUMN "actualizado_por_id" TEXT;

-- Paso 4: Generar códigos de proveedor para registros existentes
UPDATE "proveedores" 
SET "codigo_proveedor" = 'PROV-' || LPAD((ROW_NUMBER() OVER (ORDER BY "created_at"))::TEXT, 6, '0')
WHERE "codigo_proveedor" IS NULL;

-- Paso 5: Migrar datos legacy de estado
UPDATE "proveedores" 
SET "estado_operativo" = "estado"
WHERE "estado" IN ('activo', 'inactivo', 'suspendido', 'en_evaluacion');

UPDATE "proveedores" 
SET "estado_onboarding" = 'completado'
WHERE "estado" NOT IN ('borrador');

UPDATE "proveedores" 
SET "estado_onboarding" = 'borrador'
WHERE "estado" = 'borrador';

-- Paso 6: Asignar país Colombia por defecto a proveedores existentes
UPDATE "proveedores" p
SET "pais_id" = (SELECT "id" FROM "paises" WHERE "codigo" = 'CO' LIMIT 1)
WHERE p."pais_id" IS NULL;

-- Paso 7: Aplicar restricciones NOT NULL
ALTER TABLE "proveedores" 
ALTER COLUMN "codigo_proveedor" SET NOT NULL,
ALTER COLUMN "estado_onboarding" SET NOT NULL,
ALTER COLUMN "estado_operativo" SET NOT NULL;

-- Paso 8: Renombrar columnas legacy (mantener por compatibilidad)
ALTER TABLE "proveedores" 
RENAME COLUMN "ciudad" TO "ciudad_legacy";

ALTER TABLE "proveedores" 
RENAME COLUMN "departamento" TO "departamento_legacy";

-- Crear índices
CREATE UNIQUE INDEX "paises_codigo_key" ON "paises"("codigo");
CREATE INDEX "paises_codigo_idx" ON "paises"("codigo");
CREATE INDEX "departamentos_pais_id_idx" ON "departamentos"("pais_id");
CREATE UNIQUE INDEX "departamentos_pais_id_codigo_key" ON "departamentos"("pais_id", "codigo");
CREATE INDEX "ciudades_departamento_id_idx" ON "ciudades"("departamento_id");
CREATE UNIQUE INDEX "ciudades_departamento_id_codigo_key" ON "ciudades"("departamento_id", "codigo");
CREATE UNIQUE INDEX "proveedores_codigo_proveedor_key" ON "proveedores"("codigo_proveedor");
CREATE UNIQUE INDEX "proveedores_email_corporativo_key" ON "proveedores"("email_corporativo");
CREATE INDEX "proveedores_pais_id_idx" ON "proveedores"("pais_id");
CREATE INDEX "proveedores_departamento_id_idx" ON "proveedores"("departamento_id");
CREATE INDEX "proveedores_ciudad_id_idx" ON "proveedores"("ciudad_id");
CREATE INDEX "proveedores_estado_onboarding_idx" ON "proveedores"("estado_onboarding");
CREATE INDEX "proveedores_estado_operativo_idx" ON "proveedores"("estado_operativo");

-- Agregar Foreign Keys
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_pais_id_fkey" 
FOREIGN KEY ("pais_id") REFERENCES "paises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_departamento_id_fkey" 
FOREIGN KEY ("departamento_id") REFERENCES "departamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_ciudad_id_fkey" 
FOREIGN KEY ("ciudad_id") REFERENCES "ciudades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_actualizado_por_id_fkey" 
FOREIGN KEY ("actualizado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "departamentos" ADD CONSTRAINT "departamentos_pais_id_fkey" 
FOREIGN KEY ("pais_id") REFERENCES "paises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ciudades" ADD CONSTRAINT "ciudades_departamento_id_fkey" 
FOREIGN KEY ("departamento_id") REFERENCES "departamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
