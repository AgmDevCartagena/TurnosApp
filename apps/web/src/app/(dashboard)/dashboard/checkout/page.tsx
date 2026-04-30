'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import {
  fetchCart,
  validateCheckout,
  checkout,
  type Carrito,
  type CheckoutData,
} from '@/lib/catalog-api';
import { fetchCentrosCosto, type CentroCosto } from '@/lib/admin-api';

export default function CheckoutPage() {
  const router = useRouter();
  const [carrito, setCarrito] = useState<Carrito | null>(null);
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<CheckoutData>({
    centroCostoId: '',
    prioridad: 'media',
    justificacion: '',
    titulo: '',
    observaciones: '',
    fechaRequerida: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      const [carritoData, validationData, centros] = await Promise.all([
        fetchCart(),
        validateCheckout(),
        fetchCentrosCosto(),
      ]);

      setCarrito(carritoData);
      setValidation(validationData);
      setCentrosCosto(centros);

      if (carritoData.items.length === 0) {
        alert('Tu carrito está vacío');
        router.push('/dashboard/carrito');
      }

      if (!validationData.valid) {
        alert('Hay problemas con tu carrito. Por favor revísalo.');
      }
    } catch (error) {
      console.error('Error al cargar datos de checkout:', error);
      alert('Error al cargar datos. Intenta nuevamente.');
      router.push('/dashboard/carrito');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.centroCostoId) {
      newErrors.centroCostoId = 'Debes seleccionar un centro de costo';
    }

    if (!formData.justificacion || formData.justificacion.trim().length < 10) {
      newErrors.justificacion = 'La justificación debe tener al menos 10 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!validation?.valid) {
      alert('Hay problemas con tu carrito. Por favor revísalo.');
      return;
    }

    if (!confirm('¿Estás seguro de generar esta solicitud de compra?')) {
      return;
    }

    try {
      setSubmitting(true);
      const result = await checkout(formData);
      alert(result.message || 'Solicitud creada exitosamente');
      router.push(`/dashboard/solicitudes`);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al generar solicitud');
    } finally {
      setSubmitting(false);
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

  if (!carrito || carrito.items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al carrito
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generar Solicitud de Compra</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Completa la información para crear tu requisición formal
        </p>
      </div>

      {validation && !validation.valid && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-300">
                Problemas detectados en el carrito
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-400">
                {validation.errors.map((error: string, idx: number) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Información de la solicitud
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Título de la solicitud <span className="text-gray-400">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Ej: Equipos de oficina Q1 2026"
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Centro de costo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.centroCostoId}
                    onChange={(e) => setFormData({ ...formData, centroCostoId: e.target.value })}
                    className={`w-full rounded-lg border ${
                      errors.centroCostoId
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-gray-300 dark:border-slate-600 focus:border-teal-500 focus:ring-teal-500/20'
                    } bg-white dark:bg-slate-700 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                  >
                    <option value="">Selecciona un centro de costo</option>
                    {centrosCosto.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.codigo} - {cc.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.centroCostoId && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.centroCostoId}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prioridad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) =>
                      setFormData({ ...formData, prioridad: e.target.value as any })
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fecha requerida <span className="text-gray-400">(opcional)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fechaRequerida}
                    onChange={(e) => setFormData({ ...formData, fechaRequerida: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Justificación <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.justificacion}
                    onChange={(e) => setFormData({ ...formData, justificacion: e.target.value })}
                    placeholder="Describe por qué necesitas estos productos..."
                    rows={4}
                    className={`w-full rounded-lg border ${
                      errors.justificacion
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-gray-300 dark:border-slate-600 focus:border-teal-500 focus:ring-teal-500/20'
                    } bg-white dark:bg-slate-700 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                  />
                  {errors.justificacion && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.justificacion}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Mínimo 10 caracteres
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Observaciones adicionales <span className="text-gray-400">(opcional)</span>
                  </label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    placeholder="Información adicional relevante..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300">
                    ¿Qué sucede al generar la solicitud?
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-400">
                    <li>• Se creará una requisición formal con número único</li>
                    <li>• Entrará al flujo de aprobación de tu empresa</li>
                    <li>• Los aprobadores recibirán notificaciones</li>
                    <li>• Podrás hacer seguimiento desde el módulo de solicitudes</li>
                    <li>• Tu carrito se vaciará automáticamente</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard/carrito')}
                className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 px-6 py-3 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Volver al carrito
              </button>
              <button
                type="submit"
                disabled={submitting || (validation && !validation.valid)}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-6 py-3 font-semibold text-white hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCircle className="h-5 w-5" />
                {submitting ? 'Generando...' : 'Generar solicitud'}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Resumen del pedido
              </h2>

              <div className="space-y-3">
                {carrito.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-gray-200 dark:border-slate-700 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                        {item.producto.nombreCorto}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.cantidad} × {formatPrice(item.precioUnitario)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatPrice(Number(item.precioUnitario) * item.cantidad)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Productos</span>
                  <span className="text-sm text-gray-900 dark:text-white">{carrito.items.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">Total estimado</span>
                  <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {formatPrice(carrito.subtotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Importante:</strong> Los precios son estimados. El precio final será
                    confirmado durante el proceso de cotización y aprobación.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
