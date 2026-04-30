'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ShoppingCart, Package, Truck, FileText, Plus, Minus } from 'lucide-react';
import { fetchProductBySlug, addToCart, type Producto } from '@/lib/catalog-api';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [cantidad, setCantidad] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (slug) {
      loadProduct();
    }
  }, [slug]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await fetchProductBySlug(slug);
      setProducto(data);
    } catch (error: any) {
      console.error('Error al cargar producto:', error);
      alert(error?.response?.data?.message || 'Producto no encontrado');
      router.push('/dashboard/catalogo');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!producto) return;

    try {
      setAdding(true);
      const proveedorId = producto.proveedores?.[0]?.proveedorId;
      await addToCart({
        productoId: producto.id,
        cantidad,
        proveedorId,
      });
      alert('Producto agregado al carrito exitosamente');
      router.push('/dashboard/carrito');
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al agregar al carrito');
    } finally {
      setAdding(false);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Precio a consultar';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(Number(price));
  };

  const images = producto?.imagenPrincipal
    ? [producto.imagenPrincipal, ...(producto.imagenesAdicionales || [])]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!producto) {
    return null;
  }

  const precioMostrar = producto.proveedores?.[0]?.precioNegociado || producto.precioReferencial;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            {images.length > 0 ? (
              <img
                src={images[selectedImage]}
                alt={producto.nombreCorto}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                <Package className="h-24 w-24" />
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`aspect-square overflow-hidden rounded-lg border-2 ${
                    selectedImage === idx
                      ? 'border-teal-500'
                      : 'border-gray-200 dark:border-slate-700'
                  }`}
                >
                  <img src={img} alt={`${producto.nombreCorto} ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              {producto.nuevo && (
                <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">
                  NUEVO
                </span>
              )}
              {producto.enOferta && (
                <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                  OFERTA
                </span>
              )}
              {producto.destacado && (
                <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold text-white">
                  DESTACADO
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{producto.nombreCorto}</h1>
            {producto.marca && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Marca: {producto.marca}</p>
            )}
            {producto.sku && (
              <p className="text-sm text-gray-500 dark:text-gray-500">SKU: {producto.sku}</p>
            )}
          </div>

          <div className="rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 p-6">
            <p className="text-4xl font-bold text-teal-600 dark:text-teal-400">
              {formatPrice(precioMostrar)}
            </p>
            {producto.proveedores && producto.proveedores.length > 0 && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Proveedor: {producto.proveedores[0].proveedor?.razonSocial}
              </p>
            )}
          </div>

          {producto.descripcionCorta && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Descripción</h2>
              <p className="text-gray-700 dark:text-gray-300">{producto.descripcionCorta}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {producto.bienServicio?.unidadMedida && (
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Package className="h-5 w-5" />
                  <span className="text-sm">Unidad</span>
                </div>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {producto.bienServicio.unidadMedida}
                </p>
              </div>
            )}

            {producto.tiempoEntregaDias && (
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Truck className="h-5 w-5" />
                  <span className="text-sm">Entrega</span>
                </div>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {producto.tiempoEntregaDias} días
                </p>
              </div>
            )}

            {producto.stockDisponible > 0 && (
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Package className="h-5 w-5" />
                  <span className="text-sm">Stock</span>
                </div>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {producto.stockDisponible} disponibles
                </p>
              </div>
            )}

            {producto.bienServicio?.categoria && (
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm">Categoría</span>
                </div>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {producto.bienServicio.categoria.nombre}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6">
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cantidad
            </label>
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-lg border border-gray-300 dark:border-slate-600">
                <button
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  className="p-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 border-x border-gray-300 dark:border-slate-600 bg-transparent px-4 py-3 text-center text-gray-900 dark:text-white focus:outline-none"
                  min="1"
                />
                <button
                  onClick={() => setCantidad(cantidad + 1)}
                  className="p-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={adding}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-6 py-3 font-semibold text-white hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingCart className="h-5 w-5" />
                {adding ? 'Agregando...' : 'Agregar al carrito'}
              </button>
            </div>
          </div>

          {producto.descripcionLarga && (
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                Descripción detallada
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {producto.descripcionLarga}
              </p>
            </div>
          )}

          {producto.proveedores && producto.proveedores.length > 0 && (
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                Proveedores disponibles
              </h2>
              <div className="space-y-3">
                {producto.proveedores.map((pp) => (
                  <div
                    key={pp.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-700 p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {pp.proveedor?.razonSocial}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        NIT: {pp.proveedor?.nit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-teal-600 dark:text-teal-400">
                        {formatPrice(pp.precioNegociado)}
                      </p>
                      {pp.tiempoEntregaDias && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {pp.tiempoEntregaDias} días
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
