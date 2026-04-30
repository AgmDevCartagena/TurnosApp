'use client';

import { useState, useEffect } from 'react';
import { fetchOrdenesPendientes, createRecepcion, type OrdenPendiente } from '@/lib/recepciones-api';
import { Package, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function RecepcionPage() {
  const [ordenesPendientes, setOrdenesPendientes] = useState<OrdenPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [modalRecepcion, setModalRecepcion] = useState<OrdenPendiente | null>(null);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    loadOrdenesPendientes();
  }, []);

  const loadOrdenesPendientes = async () => {
    try {
      setLoading(true);
      const data = await fetchOrdenesPendientes();
      setOrdenesPendientes(data);
    } catch (err) {
      console.error('Error al cargar órdenes pendientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarRecepcion = (orden: OrdenPendiente) => {
    setModalRecepcion(orden);
    setObservaciones('');
  };

  const confirmarRecepcion = async () => {
    if (!modalRecepcion) return;

    try {
      setProcesando(modalRecepcion.id);
      await createRecepcion({
        ordenCompraId: modalRecepcion.id,
        observaciones,
      });
      setModalRecepcion(null);
      setObservaciones('');
      await loadOrdenesPendientes();
    } catch (err: any) {
      alert(err.message || 'Error al registrar recepción');
    } finally {
      setProcesando(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      enviada_proveedor: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: Clock,
      },
      parcialmente_recibida: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: AlertCircle,
      },
    };

    const badge = badges[estado] ?? { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle };
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {estado === 'enviada_proveedor' ? 'En Tránsito' : 'Atrasada'}
      </span>
    );
  };

  const isAtrasada = (fechaEstimada?: string) => {
    if (!fechaEstimada) return false;
    return new Date(fechaEstimada) < new Date();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Cargando órdenes pendientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recepción de Bienes</h1>
        <p className="text-gray-600">Registro de recepciones</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-8">
          <button className="border-b-2 border-primary px-1 py-4 text-sm font-medium text-primary">
            Órdenes Pendientes
          </button>
          <button className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">
            Novedades Registradas
          </button>
        </nav>
      </div>

      {/* Órdenes de Compra en Tránsito */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Órdenes de Compra en Tránsito</h2>
        </div>

        {ordenesPendientes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600">No hay órdenes pendientes de recepción</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Orden
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Solicitud
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Fecha Esperada
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Estado Envío
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {ordenesPendientes.map((orden) => {
                  const atrasada = isAtrasada(orden.fechaEntregaEstimada);
                  
                  return (
                    <tr key={orden.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-primary">
                        {orden.numero}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {orden.solicitud.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {orden.proveedor.razonSocial}
                          </p>
                          <p className="text-sm text-gray-500">{orden.proveedor.nit}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm ${atrasada ? 'font-semibold text-red-600' : 'text-gray-900'}`}>
                            {orden.fechaEntregaEstimada
                              ? new Date(orden.fechaEntregaEstimada).toLocaleDateString('es-CO')
                              : 'No especificada'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getEstadoBadge(atrasada ? 'parcialmente_recibida' : orden.estado)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRegistrarRecepcion(orden)}
                          disabled={procesando === orden.id}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                        >
                          Registrar Recepción
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Recepción */}
      {modalRecepcion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Registrar Recepción</h3>
                <p className="text-sm text-gray-600">Orden: {modalRecepcion.numero}</p>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-4">
              <div className="grid gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Proveedor:</span>
                  <p className="font-medium text-gray-900">{modalRecepcion.proveedor.razonSocial}</p>
                </div>
                <div>
                  <span className="text-gray-600">Total:</span>
                  <p className="font-semibold text-gray-900">{formatCurrency(Number(modalRecepcion.total))}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Observaciones (opcional)
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Recibido en buen estado, sin novedades..."
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setModalRecepcion(null);
                  setObservaciones('');
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRecepcion}
                disabled={!!procesando}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                Confirmar Recepción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
