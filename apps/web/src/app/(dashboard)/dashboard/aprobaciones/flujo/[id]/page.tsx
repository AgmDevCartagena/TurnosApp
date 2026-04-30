'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchFlujo, aprobarPaso, rechazarPaso, type FlujoAprobacion } from '@/lib/aprobaciones-api';
import { ArrowLeft, CheckCircle2, XCircle, Clock, User, MessageSquare, Calendar } from 'lucide-react';

export default function FlujoAprobacionPage() {
  const params = useParams();
  const router = useRouter();
  const flujoId = params.id as string;

  const [flujo, setFlujo] = useState<FlujoAprobacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [modalComentario, setModalComentario] = useState<{ pasoId: string; accion: 'aprobar' | 'rechazar' } | null>(null);
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    loadFlujo();
  }, [flujoId]);

  const loadFlujo = async () => {
    try {
      setLoading(true);
      const data = await fetchFlujo(flujoId);
      setFlujo(data);
    } catch (err) {
      console.error('Error al cargar flujo:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = (pasoId: string) => {
    setModalComentario({ pasoId, accion: 'aprobar' });
  };

  const handleRechazar = (pasoId: string) => {
    setModalComentario({ pasoId, accion: 'rechazar' });
  };

  const confirmarAccion = async () => {
    if (!modalComentario) return;

    try {
      setProcesando(true);
      
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
      await loadFlujo();
    } catch (err: any) {
      alert(err.message || 'Error al procesar');
    } finally {
      setProcesando(false);
    }
  };

  const getEstadoPasoIcon = (estado: string) => {
    switch (estado) {
      case 'aprobada':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case 'rechazada':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'pendiente':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      default:
        return <Clock className="h-6 w-6 text-gray-400" />;
    }
  };

  const getEstadoPasoBadge = (estado: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pendiente: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
      aprobada: { bg: 'bg-green-100', text: 'text-green-800', label: 'Aprobada' },
      rechazada: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rechazada' },
      escalada: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Escalada' },
    };

    const badge = badges[estado] || badges.pendiente;
    return (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
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
          <p className="mt-4 text-gray-600">Cargando flujo de aprobación...</p>
        </div>
      </div>
    );
  }

  if (!flujo) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        <p>Flujo de aprobación no encontrado</p>
      </div>
    );
  }

  const solicitud = flujo.solicitud;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Flujo de Aprobación — SOL-{solicitud?.id.substring(0, 8).toUpperCase()}
          </h1>
          <p className="text-gray-600">{solicitud?.descripcion}</p>
        </div>
      </div>

      {/* Información de la Solicitud */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Solicitud Creada</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <span className="text-sm text-gray-600">Solicitante</span>
            <p className="font-medium text-gray-900">
              {solicitud?.solicitante.nombre} {solicitud?.solicitante.apellido}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Monto Total</span>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(Number(solicitud?.totalEstimado || 0))}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Fecha de Creación</span>
            <p className="font-medium text-gray-900">
              {new Date(flujo.createdAt).toLocaleDateString('es-CO')}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline de Aprobaciones */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">Pasos de Aprobación</h2>
        
        <div className="space-y-6">
          {flujo.pasos.map((paso, index) => {
            const esPendiente = paso.estado === 'pendiente';
            const puedeAprobar = esPendiente && index === flujo.pasos.findIndex(p => p.estado === 'pendiente');

            return (
              <div key={paso.id} className="relative flex gap-4">
                {/* Línea vertical */}
                {index < flujo.pasos.length - 1 && (
                  <div className="absolute left-3 top-10 h-full w-0.5 bg-gray-200"></div>
                )}

                {/* Icono de estado */}
                <div className="relative z-10 flex-shrink-0">
                  {getEstadoPasoIcon(paso.estado)}
                </div>

                {/* Contenido del paso */}
                <div className="flex-1 pb-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {paso.aprobador.nombre} {paso.aprobador.apellido}
                        </h3>
                        {getEstadoPasoBadge(paso.estado)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{paso.aprobador.email}</p>
                      
                      {paso.comentario && (
                        <div className="mt-3 rounded-lg bg-gray-50 p-3">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                            <p className="text-sm text-gray-700">{paso.comentario}</p>
                          </div>
                        </div>
                      )}

                      {paso.fechaDecision && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          {new Date(paso.fechaDecision).toLocaleString('es-CO')}
                        </div>
                      )}
                    </div>

                    {/* Botones de acción */}
                    {puedeAprobar && (
                      <div className="ml-4 flex gap-2">
                        <button
                          onClick={() => handleAprobar(paso.id)}
                          disabled={procesando}
                          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleRechazar(paso.id)}
                          disabled={procesando}
                          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Estado Final */}
      {flujo.estadoActual !== 'pendiente' && (
        <div className={`rounded-lg p-6 ${
          flujo.estadoActual === 'aprobada' ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className="flex items-center gap-3">
            {flujo.estadoActual === 'aprobada' ? (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
            <div>
              <h3 className={`text-lg font-semibold ${
                flujo.estadoActual === 'aprobada' ? 'text-green-900' : 'text-red-900'
              }`}>
                Solicitud {flujo.estadoActual === 'aprobada' ? 'Aprobada' : 'Rechazada'}
              </h3>
              <p className={flujo.estadoActual === 'aprobada' ? 'text-green-700' : 'text-red-700'}>
                {flujo.estadoActual === 'aprobada'
                  ? 'Todos los aprobadores han aprobado esta solicitud'
                  : 'La solicitud fue rechazada en el proceso de aprobación'}
              </p>
            </div>
          </div>
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
                disabled={procesando}
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
