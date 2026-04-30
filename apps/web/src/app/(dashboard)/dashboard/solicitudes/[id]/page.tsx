'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchSolicitud, type Solicitud } from '@/lib/solicitudes-api';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Calendar,
  Clock,
  User,
  Tag,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
  Pencil,
  Package,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────

const estadoLabels: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  en_aprobacion: 'En Aprobación',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
};

const estadoColors: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700 border-gray-200',
  enviada: 'bg-blue-100 text-blue-700 border-blue-200',
  en_aprobacion: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  aprobada: 'bg-green-100 text-green-700 border-green-200',
  rechazada: 'bg-red-100 text-red-700 border-red-200',
  cancelada: 'bg-gray-100 text-gray-500 border-gray-200',
};

const estadoIcons: Record<string, React.ElementType> = {
  borrador: Pencil,
  enviada: Send,
  en_aprobacion: Clock,
  aprobada: CheckCircle2,
  rechazada: XCircle,
  cancelada: XCircle,
};

const prioridadLabels: Record<string, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

const prioridadColors: Record<string, string> = {
  baja: 'bg-gray-100 text-gray-600',
  media: 'bg-blue-100 text-blue-600',
  alta: 'bg-orange-100 text-orange-600',
  urgente: 'bg-red-100 text-red-600',
};

function formatCurrency(value: number, moneda = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ═════════════════════════════════════════════════════
// DETAIL PAGE
// ═════════════════════════════════════════════════════

export default function SolicitudDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchSolicitud(params.id as string);
        setSolicitud(data);
      } catch {
        setError('No se pudo cargar la solicitud');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !solicitud) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <AlertTriangle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-base font-semibold text-gray-900">{error || 'Solicitud no encontrada'}</p>
        <button
          onClick={() => router.push('/dashboard/solicitudes')}
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          Volver al listado
        </button>
      </div>
    );
  }

  const EstadoIcon = estadoIcons[solicitud.estado] || FileText;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/solicitudes')}
            className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{solicitud.titulo}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${estadoColors[solicitud.estado] || ''}`}>
                <EstadoIcon className="h-3 w-3" />
                {estadoLabels[solicitud.estado] || solicitud.estado}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{solicitud.numero}</p>
          </div>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${prioridadColors[solicitud.prioridad] || ''}`}>
          Prioridad: {prioridadLabels[solicitud.prioridad] || solicitud.prioridad}
        </span>
      </div>

      {/* Main grid: content + sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left content (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Información General */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <FileText className="h-5 w-5 text-primary" />
              Información General
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Departamento</p>
                <p className="mt-0.5 text-sm font-medium text-gray-900">{solicitud.departamento || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Categoría</p>
                <p className="mt-0.5 text-sm font-medium text-gray-900">{solicitud.categoria || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Centro de Costo</p>
                <p className="mt-0.5 text-sm font-medium text-gray-900">
                  {solicitud.centroCosto ? `${solicitud.centroCosto.nombre} (${solicitud.centroCosto.codigo})` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Moneda</p>
                <p className="mt-0.5 text-sm font-medium text-gray-900">{solicitud.moneda}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Fecha Requerida</p>
                <p className="mt-0.5 text-sm font-medium text-gray-900">
                  {solicitud.fechaRequerida
                    ? new Date(solicitud.fechaRequerida).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Tiempo de Entrega</p>
                <p className="mt-0.5 text-sm font-medium text-gray-900">
                  {solicitud.tiempoEntrega ? `${solicitud.tiempoEntrega} días` : '—'}
                </p>
              </div>
            </div>

            {solicitud.descripcion && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-medium text-gray-500">Descripción</p>
                <p className="mt-1 text-sm text-gray-700">{solicitud.descripcion}</p>
              </div>
            )}

            <div className="mt-4 border-t pt-4">
              <p className="text-xs font-medium text-gray-500">Justificación</p>
              <p className="mt-1 text-sm text-gray-700">{solicitud.justificacion || '—'}</p>
            </div>
          </section>

          {/* Ítems de la solicitud */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Package className="h-5 w-5 text-orange-500" />
              Ítems de la Solicitud
              <span className="ml-auto text-xs font-normal text-gray-400">
                {solicitud.lineas?.length || 0} ítem(s)
              </span>
            </h2>

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5">#</th>
                    <th className="px-4 py-2.5">Descripción</th>
                    <th className="px-4 py-2.5 text-center">Cantidad</th>
                    <th className="px-4 py-2.5">Unidad</th>
                    <th className="px-4 py-2.5 text-right">Precio Unit.</th>
                    <th className="px-4 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {solicitud.lineas?.map((linea, idx) => {
                    const subtotal = Number(linea.precioEstimado) * Number(linea.cantidad);
                    return (
                      <tr key={linea.id || idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{linea.descripcion}</p>
                          {linea.especificaciones && (
                            <p className="mt-0.5 text-xs text-gray-400">{linea.especificaciones}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{Number(linea.cantidad)}</td>
                        <td className="px-4 py-3 text-gray-600">{linea.unidadMedida}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatCurrency(Number(linea.precioEstimado), solicitud.moneda)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(subtotal, solicitud.moneda)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-gray-50">
                    <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Total Estimado
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold text-gray-900">
                      {formatCurrency(Number(solicitud.totalEstimado), solicitud.moneda)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Estado card */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Estado de la Solicitud</h3>
            <div className={`flex items-center gap-2 rounded-lg border p-3 ${estadoColors[solicitud.estado] || ''}`}>
              <EstadoIcon className="h-5 w-5" />
              <span className="text-sm font-semibold">
                {estadoLabels[solicitud.estado] || solicitud.estado}
              </span>
            </div>
          </div>

          {/* Solicitante */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <User className="h-4 w-4 text-gray-400" />
              Solicitante
            </h3>
            <p className="text-sm font-medium text-gray-900">
              {solicitud.solicitante?.nombre} {solicitud.solicitante?.apellido}
            </p>
            <p className="text-xs text-gray-500">{solicitud.solicitante?.email}</p>
          </div>

          {/* Resumen */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Resumen</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <DollarSign className="h-3.5 w-3.5" />
                  Total Estimado
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(Number(solicitud.totalEstimado), solicitud.moneda)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Package className="h-3.5 w-3.5" />
                  Ítems
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {solicitud.lineas?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Tag className="h-3.5 w-3.5" />
                  Prioridad
                </span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${prioridadColors[solicitud.prioridad] || ''}`}>
                  {prioridadLabels[solicitud.prioridad] || solicitud.prioridad}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="h-3.5 w-3.5" />
                  Creada
                </span>
                <span className="text-xs text-gray-700">
                  {new Date(solicitud.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              {solicitud.fechaRequerida && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    Requerida
                  </span>
                  <span className="text-xs text-gray-700">
                    {new Date(solicitud.fechaRequerida).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
