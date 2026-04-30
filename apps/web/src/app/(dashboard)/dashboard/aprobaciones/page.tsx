'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMisAprobacionesPendientes, aprobarPaso, rechazarPaso, type FlujoAprobacion } from '@/lib/aprobaciones-api';
import { CheckCircle2, XCircle, Clock, AlertCircle, ChevronRight, MessageSquare } from 'lucide-react';

export default function AprobacionesPage() {
  const router = useRouter();
  const [aprobaciones, setAprobaciones] = useState<FlujoAprobacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [modalComentario, setModalComentario] = useState<{ pasoId: string; accion: 'aprobar' | 'rechazar' } | null>(null);
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    loadAprobaciones();
  }, []);

  const loadAprobaciones = async () => {
    try {
      setLoading(true);
      const response = await fetchMisAprobacionesPendientes({ limit: 50 });
      setAprobaciones(response.data);
    } catch (err) {
      console.error('Error al cargar aprobaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (pasoId: string, conComentario = false) => {
    if (conComentario) {
      setModalComentario({ pasoId, accion: 'aprobar' });
      return;
    }

    try {
      setProcesando(pasoId);
      await aprobarPaso(pasoId, {});
      await loadAprobaciones();
    } catch (err: any) {
      alert(err.message || 'Error al aprobar');
    } finally {
      setProcesando(null);
    }
  };

  const handleRechazar = (pasoId: string) => {
    setModalComentario({ pasoId, accion: 'rechazar' });
  };

  const confirmarAccion = async () => {
    if (!modalComentario) return;

    try {
      setProcesando(modalComentario.pasoId);
      
      if (modalComentario.accion === 'aprobar') {
        await aprobarPaso(modalComentario.pasoId, { comentario });
      } else {
        if (!comentario.trim()) {
          alert('Debe proporcionar un motivo para rechazar');
          return;
        }
        await rechazarPaso(modalComentario.pasoId, { comentario });
      }

      setModalComentario(null);
      setComentario('');
      await loadAprobaciones();
    } catch (err: any) {
      alert(err.message || 'Error al procesar');
    } finally {
      setProcesando(null);
    }
  };

  const getPrioridadBadge = (prioridad?: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      baja: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Baja' },
      media: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Media' },
      alta: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Alta' },
      urgente: { bg: 'bg-red-100', text: 'text-red-800', label: 'Urgente' },
    };

    const badge = badges[prioridad || 'media'] || badges.media;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
        <AlertCircle className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Cargando aprobaciones pendientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Aprobaciones Pendientes</h1>
        <p className="text-gray-600">Solicitudes que requieren tu aprobación</p>
      </div>

      {/* Lista de Aprobaciones */}
      {aprobaciones.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">No tienes aprobaciones pendientes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {aprobaciones.map((flujo) => {
            const paso = flujo.pasos[0];
            const solicitud = flujo.solicitud;

            return (
              <div
                key={flujo.id}
                className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Número y Prioridad */}
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        SOL-{solicitud?.id.substring(0, 8).toUpperCase()}
                      </h3>
                      {getPrioridadBadge(solicitud?.prioridad)}
                    </div>

                    {/* Descripción */}
                    <p className="text-gray-700 mb-3">{solicitud?.descripcion}</p>

                    {/* Información */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Solicitante:</span>
                        <p className="font-medium text-gray-900">
                          {solicitud?.solicitante.nombre} {solicitud?.solicitante.apellido}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Monto Total:</span>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(Number(solicitud?.totalEstimado || 0))}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="ml-6 flex flex-col gap-2">
                    <button
                      onClick={() => handleAprobar(paso.id)}
                      disabled={procesando === paso.id}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleRechazar(paso.id)}
                      disabled={procesando === paso.id}
                      className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Rechazar
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/aprobaciones/flujo/${flujo.id}`)}
                      className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      Ver Detalle
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Comentario */}
      {modalComentario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {modalComentario.accion === 'aprobar' ? 'Aprobar con comentario' : 'Rechazar solicitud'}
            </h3>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder={
                modalComentario.accion === 'aprobar'
                  ? 'Comentario opcional...'
                  : 'Motivo del rechazo (requerido)...'
              }
              className="w-full rounded-lg border border-gray-300 p-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              rows={4}
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setModalComentario(null);
                  setComentario('');
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAccion}
                disabled={!!procesando}
                className={`flex-1 rounded-lg px-4 py-2 text-white ${
                  modalComentario.accion === 'aprobar'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {modalComentario.accion === 'aprobar' ? 'Aprobar' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
