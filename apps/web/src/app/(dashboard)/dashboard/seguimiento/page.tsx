'use client';

import { useState, useEffect } from 'react';
import { consultarSolicitudes, type SolicitudSeguimiento, type QuerySeguimientoParams } from '@/lib/seguimiento-api';
import { Search, Calendar, X } from 'lucide-react';

export default function SeguimientoPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudSeguimiento[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [numeroSolicitud, setNumeroSolicitud] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [centroCosto, setCentroCosto] = useState('');
  const [estado, setEstado] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    handleBuscar();
  }, [currentPage]);

  const handleBuscar = async () => {
    try {
      setLoading(true);
      const params: QuerySeguimientoParams = {
        page: currentPage,
        limit,
        ...(numeroSolicitud && { numeroSolicitud }),
        ...(fechaDesde && { fechaDesde }),
        ...(fechaHasta && { fechaHasta }),
        ...(solicitante && { solicitante }),
        ...(centroCosto && { centroCosto }),
        ...(estado && { estado }),
      };

      const response = await consultarSolicitudes(params);
      setSolicitudes(response.data);
      setTotalPages(response.meta.totalPages);
    } catch (err) {
      console.error('Error al consultar solicitudes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiar = () => {
    setNumeroSolicitud('');
    setFechaDesde('');
    setFechaHasta('');
    setSolicitante('');
    setCentroCosto('');
    setEstado('');
    setCurrentPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      borrador: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Borrador' },
      enviada: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Enviada' },
      en_aprobacion: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En Aprobación' },
      aprobada: { bg: 'bg-green-100', text: 'text-green-800', label: 'Aprobada' },
      rechazada: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rechazada' },
      cancelada: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelada' },
    };

    const badge = badges[estado] || { bg: 'bg-gray-100', text: 'text-gray-800', label: estado };
    return (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Seguimiento de Solicitudes</h1>
        <p className="text-gray-600">Consultar y seguimiento</p>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {/* N° Solicitud */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              N° Solicitud
            </label>
            <input
              type="text"
              value={numeroSolicitud}
              onChange={(e) => setNumeroSolicitud(e.target.value)}
              placeholder="SOL-2024-..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Fecha Desde */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Fecha Desde
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Fecha Hasta
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Solicitante */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Solicitante
            </label>
            <input
              type="text"
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              placeholder="Nombre..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Centro Costo */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Centro Costo
            </label>
            <select
              value={centroCosto}
              onChange={(e) => setCentroCosto(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Todos</option>
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Todos</option>
              <option value="borrador">Borrador</option>
              <option value="enviada">Enviada</option>
              <option value="en_aprobacion">En Aprobación</option>
              <option value="aprobada">Aprobada</option>
              <option value="rechazada">Rechazada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        {/* Botones */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleBuscar}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            Buscar
          </button>
          <button
            onClick={handleLimpiar}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                N° Solicitud
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Solicitante
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Área
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Fecha
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Etapa
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                </td>
              </tr>
            ) : solicitudes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No se encontraron solicitudes
                </td>
              </tr>
            ) : (
              solicitudes.map((solicitud) => (
                <tr key={solicitud.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-primary">
                    SOL-{solicitud.id.substring(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {solicitud.solicitante.nombre} {solicitud.solicitante.apellido}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {solicitud.departamento || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(solicitud.createdAt).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getEstadoBadge(solicitud.estado)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {solicitud.etapa}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(Number(solicitud.totalEstimado))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="text-sm text-gray-700">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
