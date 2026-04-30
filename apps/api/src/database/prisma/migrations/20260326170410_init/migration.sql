-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "rolId" TEXT NOT NULL,
    "auth_provider" TEXT NOT NULL DEFAULT 'local',
    "microsoft_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "accion" TEXT NOT NULL,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos_roles" (
    "rolId" TEXT NOT NULL,
    "permisoId" TEXT NOT NULL,

    CONSTRAINT "permisos_roles_pkey" PRIMARY KEY ("rolId","permisoId")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "codigo" TEXT NOT NULL,
    "padre_id" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bienes_servicios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria_id" TEXT NOT NULL,
    "especs_tecnicas" JSONB,
    "unidad_medida" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bienes_servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "tipo_proveedor" TEXT NOT NULL DEFAULT 'nacional',
    "tipo_persona" TEXT NOT NULL DEFAULT 'juridica',
    "razon_social" TEXT NOT NULL,
    "tipo_identificacion" TEXT NOT NULL DEFAULT 'nit',
    "nit" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "departamento" TEXT,
    "ciudad" TEXT,
    "telefono" TEXT NOT NULL,
    "email_corporativo" TEXT NOT NULL,
    "tipo_empresa" TEXT,
    "fecha_constitucion" TIMESTAMP(3),
    "codigo_ciiu" TEXT,
    "descripcion_actividad" TEXT,
    "certificaciones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observaciones" TEXT,
    "rep_legal_nombres" TEXT,
    "rep_legal_apellidos" TEXT,
    "rep_legal_tipo_doc" TEXT,
    "rep_legal_num_doc" TEXT,
    "rep_legal_telefono" TEXT,
    "rep_legal_email" TEXT,
    "contacto" TEXT,
    "email" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "creado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluaciones_proveedores" (
    "id" TEXT NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "calidad" INTEGER NOT NULL,
    "cumplimiento" INTEGER NOT NULL,
    "precio" INTEGER NOT NULL,
    "puntuacion_total" INTEGER NOT NULL,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluaciones_proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_compra" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT '',
    "solicitante_id" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "departamento" TEXT,
    "categoria" TEXT,
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "centro_costo_id" TEXT,
    "fecha_requerida" TIMESTAMP(3),
    "tiempo_entrega" INTEGER,
    "moneda" TEXT NOT NULL DEFAULT 'COP',
    "descripcion" TEXT,
    "justificacion" TEXT NOT NULL DEFAULT '',
    "total_estimado" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_solicitud" (
    "id" TEXT NOT NULL,
    "solicitud_id" TEXT NOT NULL,
    "bien_servicio_id" TEXT,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "cantidad" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "unidad_medida" TEXT NOT NULL DEFAULT 'Unidad',
    "especificaciones" TEXT,
    "precio_estimado" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "lineas_solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flujos_aprobacion" (
    "id" TEXT NOT NULL,
    "solicitud_id" TEXT NOT NULL,
    "estado_actual" TEXT NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flujos_aprobacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pasos_aprobacion" (
    "id" TEXT NOT NULL,
    "flujo_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "aprobador_id" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "comentario" TEXT,
    "fecha_decision" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pasos_aprobacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_compra" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "solicitud_id" TEXT NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "creador_id" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "condiciones_pago" TEXT NOT NULL,
    "fecha_emision" TIMESTAMP(3),
    "fecha_entrega_estimada" TIMESTAMP(3),
    "observaciones" TEXT,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "impuestos" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_orden" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "bien_servicio_id" TEXT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "unidad_medida" TEXT NOT NULL,
    "precio_unitario" DECIMAL(65,30) NOT NULL,
    "descuento" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "lineas_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recepciones" (
    "id" TEXT NOT NULL,
    "orden_compra_id" TEXT NOT NULL,
    "fecha_recepcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recibido_por_id" TEXT NOT NULL,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recepciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centros_costo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "centros_costo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_inventario" (
    "id" TEXT NOT NULL,
    "bien_servicio_id" TEXT NOT NULL,
    "centro_costo_id" TEXT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ultima_actualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" TEXT NOT NULL,
    "item_inventario_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "referencia" TEXT,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "entidad_ref" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "proveedor_id" TEXT,
    "vencimiento" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versiones_documentos" (
    "id" TEXT NOT NULL,
    "documento_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "subido_por_id" TEXT NOT NULL,
    "fecha_subida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versiones_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "destinatario_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "datos_antes" JSONB,
    "datos_despues" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_audit_logs" (
    "id" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "usuario_id" TEXT,
    "email" TEXT,
    "auth_provider" TEXT NOT NULL,
    "exitoso" BOOLEAN NOT NULL,
    "razon" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_microsoft_id_key" ON "usuarios"("microsoft_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_recurso_accion_key" ON "permisos"("recurso", "accion");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_codigo_key" ON "categorias"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_nit_key" ON "proveedores"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_compra_numero_key" ON "solicitudes_compra"("numero");

-- CreateIndex
CREATE INDEX "solicitudes_compra_estado_idx" ON "solicitudes_compra"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_compra_solicitante_id_idx" ON "solicitudes_compra"("solicitante_id");

-- CreateIndex
CREATE INDEX "solicitudes_compra_created_at_idx" ON "solicitudes_compra"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "flujos_aprobacion_solicitud_id_key" ON "flujos_aprobacion"("solicitud_id");

-- CreateIndex
CREATE INDEX "pasos_aprobacion_aprobador_id_estado_idx" ON "pasos_aprobacion"("aprobador_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_compra_numero_key" ON "ordenes_compra"("numero");

-- CreateIndex
CREATE INDEX "ordenes_compra_estado_idx" ON "ordenes_compra"("estado");

-- CreateIndex
CREATE INDEX "ordenes_compra_proveedor_id_idx" ON "ordenes_compra"("proveedor_id");

-- CreateIndex
CREATE INDEX "ordenes_compra_fecha_emision_idx" ON "ordenes_compra"("fecha_emision" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "centros_costo_codigo_key" ON "centros_costo"("codigo");

-- CreateIndex
CREATE INDEX "items_inventario_bien_servicio_id_idx" ON "items_inventario"("bien_servicio_id");

-- CreateIndex
CREATE INDEX "items_inventario_centro_costo_id_idx" ON "items_inventario"("centro_costo_id");

-- CreateIndex
CREATE UNIQUE INDEX "items_inventario_bien_servicio_id_centro_costo_id_key" ON "items_inventario"("bien_servicio_id", "centro_costo_id");

-- CreateIndex
CREATE INDEX "documentos_entidad_ref_entidad_id_idx" ON "documentos"("entidad_ref", "entidad_id");

-- CreateIndex
CREATE INDEX "notificaciones_destinatario_id_leida_idx" ON "notificaciones"("destinatario_id", "leida");

-- CreateIndex
CREATE INDEX "audit_logs_entidad_entidad_id_idx" ON "audit_logs"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "audit_logs_usuario_id_idx" ON "audit_logs"("usuario_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "auth_audit_logs_evento_idx" ON "auth_audit_logs"("evento");

-- CreateIndex
CREATE INDEX "auth_audit_logs_usuario_id_idx" ON "auth_audit_logs"("usuario_id");

-- CreateIndex
CREATE INDEX "auth_audit_logs_exitoso_idx" ON "auth_audit_logs"("exitoso");

-- CreateIndex
CREATE INDEX "auth_audit_logs_created_at_idx" ON "auth_audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos_roles" ADD CONSTRAINT "permisos_roles_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos_roles" ADD CONSTRAINT "permisos_roles_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "permisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_padre_id_fkey" FOREIGN KEY ("padre_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bienes_servicios" ADD CONSTRAINT "bienes_servicios_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones_proveedores" ADD CONSTRAINT "evaluaciones_proveedores_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_centro_costo_id_fkey" FOREIGN KEY ("centro_costo_id") REFERENCES "centros_costo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_solicitud" ADD CONSTRAINT "lineas_solicitud_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_solicitud" ADD CONSTRAINT "lineas_solicitud_bien_servicio_id_fkey" FOREIGN KEY ("bien_servicio_id") REFERENCES "bienes_servicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flujos_aprobacion" ADD CONSTRAINT "flujos_aprobacion_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasos_aprobacion" ADD CONSTRAINT "pasos_aprobacion_flujo_id_fkey" FOREIGN KEY ("flujo_id") REFERENCES "flujos_aprobacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasos_aprobacion" ADD CONSTRAINT "pasos_aprobacion_aprobador_id_fkey" FOREIGN KEY ("aprobador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_creador_id_fkey" FOREIGN KEY ("creador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_orden" ADD CONSTRAINT "lineas_orden_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_orden" ADD CONSTRAINT "lineas_orden_bien_servicio_id_fkey" FOREIGN KEY ("bien_servicio_id") REFERENCES "bienes_servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones" ADD CONSTRAINT "recepciones_orden_compra_id_fkey" FOREIGN KEY ("orden_compra_id") REFERENCES "ordenes_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones" ADD CONSTRAINT "recepciones_recibido_por_id_fkey" FOREIGN KEY ("recibido_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_inventario" ADD CONSTRAINT "items_inventario_bien_servicio_id_fkey" FOREIGN KEY ("bien_servicio_id") REFERENCES "bienes_servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_inventario" ADD CONSTRAINT "items_inventario_centro_costo_id_fkey" FOREIGN KEY ("centro_costo_id") REFERENCES "centros_costo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_item_inventario_id_fkey" FOREIGN KEY ("item_inventario_id") REFERENCES "items_inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versiones_documentos" ADD CONSTRAINT "versiones_documentos_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versiones_documentos" ADD CONSTRAINT "versiones_documentos_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_audit_logs" ADD CONSTRAINT "auth_audit_logs_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
