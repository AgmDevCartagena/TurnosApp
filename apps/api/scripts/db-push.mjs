/**
 * Workaround for Prisma schema engine bug on Windows + Node.js 22.
 * Creates database tables using pg driver, matching the Prisma schema
 * with @@map table names and @map column names.
 */
import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env file manually
const envPath = resolve(__dirname, '..', '.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
} catch { /* .env not found, rely on existing env vars */ }

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

const SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AUTENTICACIÓN & ADMINISTRACIÓN
-- ============================================

CREATE TABLE IF NOT EXISTS "roles" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "descripcion" TEXT,
  "activo" BOOLEAN DEFAULT true NOT NULL,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "permisos" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "recurso" TEXT NOT NULL,
  "accion" TEXT NOT NULL,
  UNIQUE("recurso", "accion")
);

CREATE TABLE IF NOT EXISTS "permisos_roles" (
  "rolId" UUID NOT NULL,
  "permisoId" UUID NOT NULL,
  PRIMARY KEY ("rolId", "permisoId")
);

CREATE TABLE IF NOT EXISTS "usuarios" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "apellido" TEXT NOT NULL,
  "activo" BOOLEAN DEFAULT true NOT NULL,
  "rolId" UUID NOT NULL,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- CATÁLOGO
-- ============================================

CREATE TABLE IF NOT EXISTS "categorias" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "codigo" TEXT NOT NULL UNIQUE,
  "padre_id" UUID,
  "activo" BOOLEAN DEFAULT true NOT NULL,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "bienes_servicios" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "categoria_id" UUID NOT NULL,
  "especs_tecnicas" JSONB,
  "unidad_medida" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "activo" BOOLEAN DEFAULT true NOT NULL,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- PROVEEDORES
-- ============================================

DROP TABLE IF EXISTS "proveedores" CASCADE;
CREATE TABLE IF NOT EXISTS "proveedores" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "tipo_proveedor" TEXT DEFAULT 'nacional' NOT NULL,
  "tipo_persona" TEXT DEFAULT 'juridica' NOT NULL,
  "razon_social" TEXT NOT NULL,
  "tipo_identificacion" TEXT DEFAULT 'nit' NOT NULL,
  "nit" TEXT NOT NULL UNIQUE,
  "direccion" TEXT NOT NULL,
  "departamento" TEXT,
  "ciudad" TEXT,
  "telefono" TEXT NOT NULL,
  "email_corporativo" TEXT NOT NULL,
  "tipo_empresa" TEXT,
  "fecha_constitucion" TIMESTAMP(3),
  "codigo_ciiu" TEXT,
  "descripcion_actividad" TEXT,
  "certificaciones" TEXT[] DEFAULT '{}',
  "observaciones" TEXT,
  "rep_legal_nombres" TEXT,
  "rep_legal_apellidos" TEXT,
  "rep_legal_tipo_doc" TEXT,
  "rep_legal_num_doc" TEXT,
  "rep_legal_telefono" TEXT,
  "rep_legal_email" TEXT,
  "contacto" TEXT,
  "email" TEXT,
  "estado" TEXT DEFAULT 'activo' NOT NULL,
  "creado_por_id" UUID,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "evaluaciones_proveedores" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "proveedor_id" UUID NOT NULL,
  "periodo" TEXT NOT NULL,
  "calidad" INTEGER NOT NULL,
  "cumplimiento" INTEGER NOT NULL,
  "precio" INTEGER NOT NULL,
  "puntuacion_total" INTEGER NOT NULL,
  "observaciones" TEXT,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- INVENTARIOS (centros_costo needed before solicitudes)
-- ============================================

CREATE TABLE IF NOT EXISTS "centros_costo" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "codigo" TEXT NOT NULL UNIQUE,
  "descripcion" TEXT,
  "activo" BOOLEAN DEFAULT true NOT NULL,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- SOLICITUDES
-- ============================================

DROP TABLE IF EXISTS "lineas_solicitud" CASCADE;
DROP TABLE IF EXISTS "solicitudes_compra" CASCADE;
CREATE TABLE IF NOT EXISTS "solicitudes_compra" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "numero" TEXT NOT NULL UNIQUE,
  "titulo" TEXT DEFAULT '' NOT NULL,
  "solicitante_id" UUID NOT NULL,
  "estado" TEXT DEFAULT 'borrador' NOT NULL,
  "departamento" TEXT,
  "categoria" TEXT,
  "prioridad" TEXT DEFAULT 'media' NOT NULL,
  "centro_costo_id" UUID,
  "fecha_requerida" TIMESTAMP(3),
  "tiempo_entrega" INTEGER,
  "moneda" TEXT DEFAULT 'COP' NOT NULL,
  "descripcion" TEXT,
  "justificacion" TEXT DEFAULT '' NOT NULL,
  "total_estimado" DECIMAL(65,30) DEFAULT 0 NOT NULL,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "lineas_solicitud" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "solicitud_id" UUID NOT NULL,
  "bien_servicio_id" UUID,
  "descripcion" TEXT DEFAULT '' NOT NULL,
  "cantidad" DECIMAL(65,30) DEFAULT 1 NOT NULL,
  "unidad_medida" TEXT DEFAULT 'Unidad' NOT NULL,
  "especificaciones" TEXT,
  "precio_estimado" DECIMAL(65,30) DEFAULT 0 NOT NULL
);

-- ============================================
-- APROBACIONES
-- ============================================

CREATE TABLE IF NOT EXISTS "flujos_aprobacion" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "solicitud_id" UUID NOT NULL UNIQUE,
  "estado_actual" TEXT DEFAULT 'pendiente' NOT NULL,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "pasos_aprobacion" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "flujo_id" UUID NOT NULL,
  "orden" INTEGER NOT NULL,
  "aprobador_id" UUID NOT NULL,
  "estado" TEXT DEFAULT 'pendiente' NOT NULL,
  "comentario" TEXT,
  "fecha_decision" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- COMPRAS
-- ============================================

CREATE TABLE IF NOT EXISTS "ordenes_compra" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "numero" TEXT NOT NULL UNIQUE,
  "solicitud_id" UUID NOT NULL,
  "proveedor_id" UUID NOT NULL,
  "creador_id" UUID NOT NULL,
  "estado" TEXT DEFAULT 'borrador' NOT NULL,
  "condiciones_pago" TEXT NOT NULL,
  "fecha_emision" TIMESTAMP(3),
  "fecha_entrega_estimada" TIMESTAMP(3),
  "observaciones" TEXT,
  "subtotal" DECIMAL(65,30) DEFAULT 0 NOT NULL,
  "impuestos" DECIMAL(65,30) DEFAULT 0 NOT NULL,
  "total" DECIMAL(65,30) DEFAULT 0 NOT NULL,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "lineas_orden" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "orden_id" UUID NOT NULL,
  "bien_servicio_id" UUID NOT NULL,
  "cantidad" DECIMAL(65,30) NOT NULL,
  "unidad_medida" TEXT NOT NULL,
  "precio_unitario" DECIMAL(65,30) NOT NULL,
  "descuento" DECIMAL(65,30) DEFAULT 0 NOT NULL,
  "subtotal" DECIMAL(65,30) DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "recepciones" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "orden_compra_id" UUID NOT NULL,
  "fecha_recepcion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "recibido_por_id" UUID NOT NULL,
  "observaciones" TEXT,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- INVENTARIOS (rest)
-- ============================================

CREATE TABLE IF NOT EXISTS "items_inventario" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "bien_servicio_id" UUID NOT NULL,
  "centro_costo_id" UUID NOT NULL,
  "cantidad" DECIMAL(65,30) DEFAULT 0 NOT NULL,
  "ultima_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE("bien_servicio_id", "centro_costo_id")
);

CREATE TABLE IF NOT EXISTS "movimientos_inventario" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "item_inventario_id" UUID NOT NULL,
  "tipo" TEXT NOT NULL,
  "cantidad" DECIMAL(65,30) NOT NULL,
  "referencia" TEXT,
  "observaciones" TEXT,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- DOCUMENTOS
-- ============================================

CREATE TABLE IF NOT EXISTS "documentos" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "entidad_ref" TEXT NOT NULL,
  "entidad_id" TEXT NOT NULL,
  "proveedor_id" UUID,
  "vencimiento" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "versiones_documentos" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "documento_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "subido_por_id" UUID NOT NULL,
  "fecha_subida" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- NOTIFICACIONES
-- ============================================

CREATE TABLE IF NOT EXISTS "notificaciones" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "tipo" TEXT NOT NULL,
  "destinatario_id" UUID NOT NULL,
  "titulo" TEXT NOT NULL,
  "mensaje" TEXT NOT NULL,
  "leida" BOOLEAN DEFAULT false NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- AUDITORÍA
-- ============================================

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "accion" TEXT NOT NULL,
  "entidad" TEXT NOT NULL,
  "entidad_id" TEXT NOT NULL,
  "usuario_id" UUID NOT NULL,
  "datos_antes" JSONB,
  "datos_despues" JSONB,
  "ip" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- FOREIGN KEYS
-- ============================================

ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "usuarios_rolId_fkey";
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "permisos_roles" DROP CONSTRAINT IF EXISTS "permisos_roles_rolId_fkey";
ALTER TABLE "permisos_roles" ADD CONSTRAINT "permisos_roles_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "permisos_roles" DROP CONSTRAINT IF EXISTS "permisos_roles_permisoId_fkey";
ALTER TABLE "permisos_roles" ADD CONSTRAINT "permisos_roles_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "permisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "categorias" DROP CONSTRAINT IF EXISTS "categorias_padre_id_fkey";
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_padre_id_fkey" FOREIGN KEY ("padre_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bienes_servicios" DROP CONSTRAINT IF EXISTS "bienes_servicios_categoria_id_fkey";
ALTER TABLE "bienes_servicios" ADD CONSTRAINT "bienes_servicios_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluaciones_proveedores" DROP CONSTRAINT IF EXISTS "evaluaciones_proveedores_proveedor_id_fkey";
ALTER TABLE "evaluaciones_proveedores" ADD CONSTRAINT "evaluaciones_proveedores_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "solicitudes_compra" DROP CONSTRAINT IF EXISTS "solicitudes_compra_solicitante_id_fkey";
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "solicitudes_compra" DROP CONSTRAINT IF EXISTS "solicitudes_compra_centro_costo_id_fkey";
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_centro_costo_id_fkey" FOREIGN KEY ("centro_costo_id") REFERENCES "centros_costo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lineas_solicitud" DROP CONSTRAINT IF EXISTS "lineas_solicitud_solicitud_id_fkey";
ALTER TABLE "lineas_solicitud" ADD CONSTRAINT "lineas_solicitud_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lineas_solicitud" DROP CONSTRAINT IF EXISTS "lineas_solicitud_bien_servicio_id_fkey";
ALTER TABLE "lineas_solicitud" ADD CONSTRAINT "lineas_solicitud_bien_servicio_id_fkey" FOREIGN KEY ("bien_servicio_id") REFERENCES "bienes_servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "flujos_aprobacion" DROP CONSTRAINT IF EXISTS "flujos_aprobacion_solicitud_id_fkey";
ALTER TABLE "flujos_aprobacion" ADD CONSTRAINT "flujos_aprobacion_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pasos_aprobacion" DROP CONSTRAINT IF EXISTS "pasos_aprobacion_flujo_id_fkey";
ALTER TABLE "pasos_aprobacion" ADD CONSTRAINT "pasos_aprobacion_flujo_id_fkey" FOREIGN KEY ("flujo_id") REFERENCES "flujos_aprobacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pasos_aprobacion" DROP CONSTRAINT IF EXISTS "pasos_aprobacion_aprobador_id_fkey";
ALTER TABLE "pasos_aprobacion" ADD CONSTRAINT "pasos_aprobacion_aprobador_id_fkey" FOREIGN KEY ("aprobador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ordenes_compra" DROP CONSTRAINT IF EXISTS "ordenes_compra_solicitud_id_fkey";
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ordenes_compra" DROP CONSTRAINT IF EXISTS "ordenes_compra_proveedor_id_fkey";
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ordenes_compra" DROP CONSTRAINT IF EXISTS "ordenes_compra_creador_id_fkey";
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_creador_id_fkey" FOREIGN KEY ("creador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lineas_orden" DROP CONSTRAINT IF EXISTS "lineas_orden_orden_id_fkey";
ALTER TABLE "lineas_orden" ADD CONSTRAINT "lineas_orden_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lineas_orden" DROP CONSTRAINT IF EXISTS "lineas_orden_bien_servicio_id_fkey";
ALTER TABLE "lineas_orden" ADD CONSTRAINT "lineas_orden_bien_servicio_id_fkey" FOREIGN KEY ("bien_servicio_id") REFERENCES "bienes_servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recepciones" DROP CONSTRAINT IF EXISTS "recepciones_orden_compra_id_fkey";
ALTER TABLE "recepciones" ADD CONSTRAINT "recepciones_orden_compra_id_fkey" FOREIGN KEY ("orden_compra_id") REFERENCES "ordenes_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recepciones" DROP CONSTRAINT IF EXISTS "recepciones_recibido_por_id_fkey";
ALTER TABLE "recepciones" ADD CONSTRAINT "recepciones_recibido_por_id_fkey" FOREIGN KEY ("recibido_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "items_inventario" DROP CONSTRAINT IF EXISTS "items_inventario_bien_servicio_id_fkey";
ALTER TABLE "items_inventario" ADD CONSTRAINT "items_inventario_bien_servicio_id_fkey" FOREIGN KEY ("bien_servicio_id") REFERENCES "bienes_servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "items_inventario" DROP CONSTRAINT IF EXISTS "items_inventario_centro_costo_id_fkey";
ALTER TABLE "items_inventario" ADD CONSTRAINT "items_inventario_centro_costo_id_fkey" FOREIGN KEY ("centro_costo_id") REFERENCES "centros_costo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "movimientos_inventario" DROP CONSTRAINT IF EXISTS "movimientos_inventario_item_inventario_id_fkey";
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_item_inventario_id_fkey" FOREIGN KEY ("item_inventario_id") REFERENCES "items_inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "documentos_proveedor_id_fkey";
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "versiones_documentos" DROP CONSTRAINT IF EXISTS "versiones_documentos_documento_id_fkey";
ALTER TABLE "versiones_documentos" ADD CONSTRAINT "versiones_documentos_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "versiones_documentos" DROP CONSTRAINT IF EXISTS "versiones_documentos_subido_por_id_fkey";
ALTER TABLE "versiones_documentos" ADD CONSTRAINT "versiones_documentos_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notificaciones" DROP CONSTRAINT IF EXISTS "notificaciones_destinatario_id_fkey";
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_usuario_id_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS "usuarios_rolId_idx" ON "usuarios"("rolId");
CREATE INDEX IF NOT EXISTS "solicitudes_compra_estado_idx" ON "solicitudes_compra"("estado");
CREATE INDEX IF NOT EXISTS "solicitudes_compra_solicitante_id_idx" ON "solicitudes_compra"("solicitante_id");
CREATE INDEX IF NOT EXISTS "solicitudes_compra_created_at_idx" ON "solicitudes_compra"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "pasos_aprobacion_aprobador_estado_idx" ON "pasos_aprobacion"("aprobador_id", "estado");
CREATE INDEX IF NOT EXISTS "ordenes_compra_estado_idx" ON "ordenes_compra"("estado");
CREATE INDEX IF NOT EXISTS "ordenes_compra_proveedor_id_idx" ON "ordenes_compra"("proveedor_id");
CREATE INDEX IF NOT EXISTS "ordenes_compra_fecha_emision_idx" ON "ordenes_compra"("fecha_emision" DESC);
CREATE INDEX IF NOT EXISTS "items_inventario_bien_servicio_id_idx" ON "items_inventario"("bien_servicio_id");
CREATE INDEX IF NOT EXISTS "items_inventario_centro_costo_id_idx" ON "items_inventario"("centro_costo_id");
CREATE INDEX IF NOT EXISTS "documentos_entidad_ref_entidad_id_idx" ON "documentos"("entidad_ref", "entidad_id");
CREATE INDEX IF NOT EXISTS "notificaciones_destinatario_leida_idx" ON "notificaciones"("destinatario_id", "leida");
CREATE INDEX IF NOT EXISTS "audit_logs_entidad_entidad_id_idx" ON "audit_logs"("entidad", "entidad_id");
CREATE INDEX IF NOT EXISTS "audit_logs_usuario_id_idx" ON "audit_logs"("usuario_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);
`;

async function main() {
  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected!');

  // Drop old wrong tables if they exist (from previous bad run)
  console.log('Dropping old incorrect tables if any...');
  await client.query(`
    DROP TABLE IF EXISTS "DetalleRecepcion" CASCADE;
    DROP TABLE IF EXISTS "Recepcion" CASCADE;
    DROP TABLE IF EXISTS "DetalleOrdenCompra" CASCADE;
    DROP TABLE IF EXISTS "OrdenCompra" CASCADE;
    DROP TABLE IF EXISTS "Aprobacion" CASCADE;
    DROP TABLE IF EXISTS "DetalleSolicitud" CASCADE;
    DROP TABLE IF EXISTS "SolicitudCompra" CASCADE;
    DROP TABLE IF EXISTS "Producto" CASCADE;
    DROP TABLE IF EXISTS "UnidadMedida" CASCADE;
    DROP TABLE IF EXISTS "CategoriaProducto" CASCADE;
    DROP TABLE IF EXISTS "Proveedor" CASCADE;
    DROP TABLE IF EXISTS "CentroCosto" CASCADE;
    DROP TABLE IF EXISTS "Notificacion" CASCADE;
    DROP TABLE IF EXISTS "Documento" CASCADE;
    DROP TABLE IF EXISTS "RolPermiso" CASCADE;
    DROP TABLE IF EXISTS "Permiso" CASCADE;
    DROP TABLE IF EXISTS "Usuario" CASCADE;
    DROP TABLE IF EXISTS "Rol" CASCADE;
    DROP TYPE IF EXISTS "EstadoSolicitud" CASCADE;
    DROP TYPE IF EXISTS "EstadoOrdenCompra" CASCADE;
    DROP TYPE IF EXISTS "EstadoAprobacion" CASCADE;
  `);

  console.log('Creating tables...');
  await client.query(SQL);
  
  console.log('✅ All tables created successfully!');
  await client.end();
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
