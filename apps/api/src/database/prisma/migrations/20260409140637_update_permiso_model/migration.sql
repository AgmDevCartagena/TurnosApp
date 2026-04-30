/*
  Warnings:

  - You are about to drop the column `recurso` on the `permisos` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[modulo,accion]` on the table `permisos` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nombre` to the `permisos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `permisos` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add new columns with temporary defaults
ALTER TABLE "permisos" 
ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "nombre" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Step 2: Populate nombre based on recurso and accion for existing records
UPDATE "permisos" 
SET "nombre" = CONCAT(
  UPPER(SUBSTRING(accion, 1, 1)), 
  SUBSTRING(accion, 2), 
  ' ', 
  UPPER(SUBSTRING(recurso, 1, 1)), 
  SUBSTRING(recurso, 2)
)
WHERE "nombre" IS NULL;

-- Step 3: Make nombre and updated_at required (remove nullable)
ALTER TABLE "permisos" 
ALTER COLUMN "nombre" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- Step 4: Drop the old recurso column and unique constraint
DROP INDEX "permisos_recurso_accion_key";
ALTER TABLE "permisos" DROP COLUMN "recurso";

-- Step 5: Create new indexes
CREATE INDEX "permisos_activo_idx" ON "permisos"("activo");
CREATE UNIQUE INDEX "permisos_modulo_accion_key" ON "permisos"("modulo", "accion");
