'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package } from 'lucide-react';
import {
  fetchCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  type Carrito,
  type ItemCarrito,
} from '@/lib/catalog-api';

export default function CarritoPage() {
  const router = useRouter();
  const [carrito, setCarrito] = useState<Carrito | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const data = await fetchCart();
      setCarrito(data);
    } catch (error) {
      console.error('Error al cargar carrito:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newCantidad: number) => {
    if (newCantidad < 1) return;

    try {
      setUpdating(itemId);
      const updatedCart = await updateCartItem(itemId, { cantidad: newCantidad });
      setCarrito(updatedCart);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al actualizar cantidad');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto del carrito?')) return;

    try {
      setUpdating(itemId);
      const updatedCart = await removeCartItem(itemId);
      setCarrito(updatedCart);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al eliminar producto');
    } finally {
      setUpdating(null);
    }
  };

  const handleClearCart = async () => {
    if (!confirm('¿Estás seguro de vaciar todo el carrito?')) return;

    try {
      setLoading(true);
      const emptyCart = await clearCart();
      setCarrito(emptyCart);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al vaciar carrito');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(Number(price));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  const isEmpty = !carrito || carrito.items.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Carrito de Compras</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isEmpty ? 'Tu carrito está vacío' : `${carrito.items.length} productos en tu carrito`}
          </p>
        </div>
        {!isEmpty && (
          <button
            onClick={handleClearCart}
            className="flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Vaciar carrito
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-12">
          <ShoppingCart className="h-24 w-24 text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Tu carrito está vacío
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Agrega productos desde el catálogo para comenzar tu solicitud
          </p>
          <button
            onClick={() => router.push('/dashboard/catalogo')}
            className="rounded-lg bg-teal-500 px-6 py-3 font-semibold text-white hover:bg-teal-600 transition-colors"
          >
            Ir al catálogo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {carrito.items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6 shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-700">
                    {item.producto.imagenPrincipal ? (
                      <img
                        src={item.producto.imagenPrincipal}
                        alt={item.producto.nombreCorto}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3
                            className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-teal-600 dark:hover:text-teal-400"
                            onClick={() => router.push(`/dashboard/catalogo/${item.producto.slug}`)}
                          >
                            {item.producto.nombreCorto}
                          </h3>
                          {item.producto.marca && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.producto.marca}
                            </p>
                          )}
                          {item.proveedor && (
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              Proveedor: {item.proveedor.razonSocial}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={updating === item.id}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      {item.observaciones && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Nota: {item.observaciones}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-gray-300 dark:border-slate-600">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.cantidad - 1)}
                          disabled={updating === item.id || item.cantidad <= 1}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-12 text-center text-gray-900 dark:text-white font-medium">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.cantidad + 1)}
                          disabled={updating === item.id}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatPrice(item.precioUnitario)} × {item.cantidad}
                        </p>
                        <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                          {formatPrice(Number(item.precioUnitario) * item.cantidad)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Resumen del pedido
              </h2>

              <div className="space-y-3 border-b border-gray-200 dark:border-slate-700 pb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Productos</span>
                  <span className="text-gray-900 dark:text-white">{carrito.items.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatPrice(carrito.subtotal)}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">Total estimado</span>
                <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {formatPrice(carrito.subtotal)}
                </span>
              </div>

              <button
                onClick={() => router.push('/dashboard/checkout')}
                className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-6 py-3 font-semibold text-white hover:bg-teal-600 transition-colors"
              >
                Generar solicitud
                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                onClick={() => router.push('/dashboard/catalogo')}
                className="mt-3 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-6 py-3 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Continuar comprando
              </button>

              <div className="mt-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Nota:</strong> Al generar la solicitud, se creará una requisición formal que
                  entrará al flujo de aprobación de tu empresa.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
