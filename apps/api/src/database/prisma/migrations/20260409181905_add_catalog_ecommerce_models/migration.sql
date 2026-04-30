-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "bien_servicio_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre_corto" TEXT NOT NULL,
    "descripcion_corta" TEXT,
    "descripcion_larga" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "imagen_principal" TEXT,
    "imagenes_adicionales" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ficha_tecnica_url" TEXT,
    "stock_disponible" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "tiempo_entrega_dias" INTEGER,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "nuevo" BOOLEAN NOT NULL DEFAULT false,
    "en_oferta" BOOLEAN NOT NULL DEFAULT false,
    "precio_referencial" DECIMAL(65,30),
    "visible_catalogo" BOOLEAN NOT NULL DEFAULT true,
    "orden_visualizacion" INTEGER NOT NULL DEFAULT 0,
    "metadatos" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_proveedores" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "precio_negociado" DECIMAL(65,30) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'COP',
    "tiempo_entrega_dias" INTEGER,
    "cantidad_minima" INTEGER NOT NULL DEFAULT 1,
    "cantidad_maxima" INTEGER,
    "vigencia_desde" TIMESTAMP(3) NOT NULL,
    "vigencia_hasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "preferido" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_empresas" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT true,
    "cantidad_maxima" INTEGER,
    "requiere_aprobacion" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carritos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_carrito" (
    "id" TEXT NOT NULL,
    "carrito_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "proveedor_id" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precio_unitario" DECIMAL(65,30) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'COP',
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_carrito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "productos_bien_servicio_id_key" ON "productos"("bien_servicio_id");

-- CreateIndex
CREATE UNIQUE INDEX "productos_sku_key" ON "productos"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "productos_slug_key" ON "productos"("slug");

-- CreateIndex
CREATE INDEX "productos_slug_idx" ON "productos"("slug");

-- CreateIndex
CREATE INDEX "productos_sku_idx" ON "productos"("sku");

-- CreateIndex
CREATE INDEX "productos_visible_catalogo_destacado_idx" ON "productos"("visible_catalogo", "destacado");

-- CreateIndex
CREATE INDEX "productos_proveedores_proveedor_id_activo_idx" ON "productos_proveedores"("proveedor_id", "activo");

-- CreateIndex
CREATE INDEX "productos_proveedores_producto_id_activo_preferido_idx" ON "productos_proveedores"("producto_id", "activo", "preferido");

-- CreateIndex
CREATE UNIQUE INDEX "productos_proveedores_producto_id_proveedor_id_key" ON "productos_proveedores"("producto_id", "proveedor_id");

-- CreateIndex
CREATE INDEX "productos_empresas_empresa_id_habilitado_idx" ON "productos_empresas"("empresa_id", "habilitado");

-- CreateIndex
CREATE UNIQUE INDEX "productos_empresas_producto_id_empresa_id_key" ON "productos_empresas"("producto_id", "empresa_id");

-- CreateIndex
CREATE INDEX "carritos_usuario_id_empresa_id_idx" ON "carritos"("usuario_id", "empresa_id");

-- CreateIndex
CREATE INDEX "carritos_estado_idx" ON "carritos"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "carritos_usuario_id_empresa_id_estado_key" ON "carritos"("usuario_id", "empresa_id", "estado");

-- CreateIndex
CREATE INDEX "items_carrito_carrito_id_idx" ON "items_carrito"("carrito_id");

-- CreateIndex
CREATE INDEX "items_carrito_producto_id_idx" ON "items_carrito"("producto_id");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_bien_servicio_id_fkey" FOREIGN KEY ("bien_servicio_id") REFERENCES "bienes_servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_proveedores" ADD CONSTRAINT "productos_proveedores_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_proveedores" ADD CONSTRAINT "productos_proveedores_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_empresas" ADD CONSTRAINT "productos_empresas_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_empresas" ADD CONSTRAINT "productos_empresas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carritos" ADD CONSTRAINT "carritos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carritos" ADD CONSTRAINT "carritos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_carrito" ADD CONSTRAINT "items_carrito_carrito_id_fkey" FOREIGN KEY ("carrito_id") REFERENCES "carritos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_carrito" ADD CONSTRAINT "items_carrito_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_carrito" ADD CONSTRAINT "items_carrito_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
