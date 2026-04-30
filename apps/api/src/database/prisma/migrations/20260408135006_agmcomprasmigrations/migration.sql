/*
  Warnings:

  - A unique constraint covering the columns `[codigo]` on the table `permisos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[codigo]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `empresa_id` to the `centros_costo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresa_id` to the `ordenes_compra` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codigo` to the `permisos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modulo` to the `permisos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codigo` to the `roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresa_id` to the `solicitudes_compra` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_rolId_fkey";

-- DropIndex
DROP INDEX "auth_audit_logs_created_at_idx";

-- DropIndex
DROP INDEX "auth_audit_logs_evento_idx";

-- DropIndex
DROP INDEX "auth_audit_logs_exitoso_idx";

-- AlterTable
ALTER TABLE "auth_audit_logs" ALTER COLUMN "auth_provider" DROP NOT NULL;

-- CreateTable (empresas must be created first to reference it)
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "razon_social" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "grupo_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- Create a default empresa for existing data
INSERT INTO "empresas" ("id", "nombre", "nit", "razon_social", "created_at", "updated_at")
VALUES ('default-empresa-id', 'Empresa Principal', '000000000-0', 'Empresa Principal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable roles - Add codigo column with temporary default
ALTER TABLE "roles" ADD COLUMN "codigo" TEXT;

-- Update existing roles with codigo based on nombre
UPDATE "roles" SET "codigo" = LOWER(REPLACE("nombre", ' ', '_'));

-- Make codigo NOT NULL after populating
ALTER TABLE "roles" ALTER COLUMN "codigo" SET NOT NULL;

-- AlterTable permisos - Add columns with temporary defaults
ALTER TABLE "permisos" ADD COLUMN "codigo" TEXT;
ALTER TABLE "permisos" ADD COLUMN "descripcion" TEXT;
ALTER TABLE "permisos" ADD COLUMN "modulo" TEXT;

-- Update existing permisos with codigo and modulo based on recurso and accion
UPDATE "permisos" SET 
  "codigo" = "recurso" || '.' || "accion",
  "modulo" = "recurso";

-- Make required columns NOT NULL after populating
ALTER TABLE "permisos" ALTER COLUMN "codigo" SET NOT NULL;
ALTER TABLE "permisos" ALTER COLUMN "modulo" SET NOT NULL;

-- AlterTable centros_costo - Add empresa_id with default
ALTER TABLE "centros_costo" ADD COLUMN "empresa_id" TEXT;
UPDATE "centros_costo" SET "empresa_id" = 'default-empresa-id';
ALTER TABLE "centros_costo" ALTER COLUMN "empresa_id" SET NOT NULL;

-- AlterTable ordenes_compra - Add empresa_id with default
ALTER TABLE "ordenes_compra" ADD COLUMN "empresa_id" TEXT;
UPDATE "ordenes_compra" SET "empresa_id" = 'default-empresa-id';
ALTER TABLE "ordenes_compra" ALTER COLUMN "empresa_id" SET NOT NULL;

-- AlterTable solicitudes_compra - Add empresa_id with default
ALTER TABLE "solicitudes_compra" ADD COLUMN "empresa_id" TEXT;
UPDATE "solicitudes_compra" SET "empresa_id" = 'default-empresa-id';
ALTER TABLE "solicitudes_compra" ALTER COLUMN "empresa_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "rolId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "usuarios_empresas_roles" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "rol_id" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_empresas_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_audit_logs" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "company_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_nit_key" ON "empresas"("nit");

-- CreateIndex
CREATE INDEX "empresas_activo_idx" ON "empresas"("activo");

-- CreateIndex
CREATE INDEX "usuarios_empresas_roles_usuario_id_empresa_id_activo_idx" ON "usuarios_empresas_roles"("usuario_id", "empresa_id", "activo");

-- CreateIndex
CREATE INDEX "usuarios_empresas_roles_empresa_id_activo_idx" ON "usuarios_empresas_roles"("empresa_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_empresas_roles_usuario_id_empresa_id_rol_id_key" ON "usuarios_empresas_roles"("usuario_id", "empresa_id", "rol_id");

-- CreateIndex
CREATE INDEX "company_audit_logs_evento_created_at_idx" ON "company_audit_logs"("evento", "created_at" DESC);

-- CreateIndex
CREATE INDEX "company_audit_logs_usuario_id_empresa_id_idx" ON "company_audit_logs"("usuario_id", "empresa_id");

-- CreateIndex
CREATE INDEX "auth_audit_logs_evento_created_at_idx" ON "auth_audit_logs"("evento", "created_at" DESC);

-- CreateIndex
CREATE INDEX "centros_costo_empresa_id_idx" ON "centros_costo"("empresa_id");

-- CreateIndex
CREATE INDEX "ordenes_compra_empresa_id_idx" ON "ordenes_compra"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_codigo_key" ON "permisos"("codigo");

-- CreateIndex
CREATE INDEX "permisos_modulo_idx" ON "permisos"("modulo");

-- CreateIndex
CREATE INDEX "permisos_codigo_idx" ON "permisos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "roles_codigo_key" ON "roles"("codigo");

-- CreateIndex
CREATE INDEX "solicitudes_compra_empresa_id_idx" ON "solicitudes_compra"("empresa_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_empresas_roles" ADD CONSTRAINT "usuarios_empresas_roles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_empresas_roles" ADD CONSTRAINT "usuarios_empresas_roles_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_empresas_roles" ADD CONSTRAINT "usuarios_empresas_roles_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_costo" ADD CONSTRAINT "centros_costo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_audit_logs" ADD CONSTRAINT "company_audit_logs_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
