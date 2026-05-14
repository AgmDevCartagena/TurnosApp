'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchSolicitudes,
  createSolicitud,
  deleteSolicitud,
  type Solicitud,
  type SolicitudQueryParams,
  type PaginatedResponse,
  type CreateSolicitudBody,
  type LineaSolicitud,
} from '@/lib/solicitudes-api';
import { fetchEmpresas, fetchCentrosCosto, type Empresa, type CentroCosto } from '@/lib/admin-api';
import { parseApiError } from '@/lib/parse-api-error';
import {
  Search,
  Plus,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Trash2,
  Eye,
  AlertCircle,
  Send,
  Calendar,
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
  borrador: 'bg-gray-100 text-gray-700',
  enviada: 'bg-blue-100 text-blue-700',
  en_aprobacion: 'bg-yellow-100 text-yellow-700',
  aprobada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
  cancelada: 'bg-gray-100 text-gray-500',
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

const departamentos = [
  'Tecnología',
  'Administración',
  'Recursos Humanos',
  'Finanzas',
  'Operaciones',
  'Comercial',
  'Legal',
  'Marketing',
];

const categorias = [
  'Equipos y Tecnología',
  'Suministros de Oficina',
  'Servicios Profesionales',
  'Mobiliario',
  'Software y Licencias',
  'Mantenimiento',
  'Transporte',
  'Otro',
];

const unidades = ['Unidad', 'Caja', 'Paquete', 'Kg', 'Litro', 'Metro', 'Servicio', 'Hora', 'Mes'];

// ─── Empty line item ─────────────────────────────────

const emptyLinea: Omit<LineaSolicitud, 'id'> = {
  descripcion: '',
  cantidad: 1,
  unidadMedida: 'Unidad',
  especificaciones: '',
  precioEstimado: 0,
};

// ─── Styles ──────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500';
const selectCls = inputCls + ' appearance-none';
const labelCls = 'mb-1 block text-xs font-medium text-gray-700';

// ─── Format currency ─────────────────────────────────

function formatCurrency(value: number, moneda = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ═════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═════════════════════════════════════════════════════

export default function SolicitudesPage() {
  // List state
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SolicitudQueryParams>({
    page: 1,
    limit: 20,
    search: '',
    estado: '',
    departamento: '',
    categoria: '',
  });

  const router = useRouter();

  // Catalog state
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Form state
  const emptyForm: CreateSolicitudBody = {
    titulo: '',
    empresaId: '',
    departamento: '',
    categoria: '',
    prioridad: 'media',
    centroCostoId: '',
    fechaRequerida: '',
    tiempoEntrega: undefined,
    moneda: 'COP',
    descripcion: '',
    justificacion: '',
    estado: 'borrador',
    lineas: [{ ...emptyLinea }],
  };
  const [form, setForm] = useState<CreateSolicitudBody>(emptyForm);

  // Load catalogs once
  useEffect(() => {
    fetchEmpresas({ page: 1, limit: 100 }).then((r) => setEmpresas(r.data)).catch(() => {});
  }, []);

  // When empresa changes, reload centros de costo
  useEffect(() => {
    if (!form.empresaId) { setCentrosCosto([]); return; }
    fetchCentrosCosto(form.empresaId).then(setCentrosCosto).catch(() => {});
  }, [form.empresaId]);

  // ─── Fetch solicitudes ─────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: SolicitudQueryParams = { ...filters };
      if (!params.search) delete params.search;
      if (!params.estado) delete params.estado;
      if (!params.departamento) delete params.departamento;
      if (!params.categoria) delete params.categoria;
      const res: PaginatedResponse<Solicitud> = await fetchSolicitudes(params);
      setSolicitudes(res.data);
      setMeta(res.meta);
    } catch {
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Filter helpers ────────────────────────────────

  const setFilter = (key: keyof SolicitudQueryParams, value: string | number) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  const goPage = (p: number) => setFilters((prev) => ({ ...prev, page: p }));

  // ─── Modal helpers ─────────────────────────────────

  const resetForm = () => {
    setForm(emptyForm);
    setFormErrors([]);
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  // ─── Line item helpers ─────────────────────────────

  const addLinea = () =>
    setForm((f) => ({ ...f, lineas: [...f.lineas, { ...emptyLinea }] }));

  const removeLinea = (idx: number) =>
    setForm((f) => ({
      ...f,
      lineas: f.lineas.length > 1 ? f.lineas.filter((_, i) => i !== idx) : f.lineas,
    }));

  const updateLinea = (idx: number, field: string, value: string | number) =>
    setForm((f) => ({
      ...f,
      lineas: f.lineas.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    }));

  const totalEstimado = form.lineas.reduce(
    (sum, l) => sum + (l.precioEstimado || 0) * (l.cantidad || 0),
    0,
  );

  // ─── Submit ────────────────────────────────────────

  const handleSubmit = async (estado: 'borrador' | 'enviada') => {
    const clientErrors: string[] = [];
    if (!form.titulo.trim()) clientErrors.push('El título de la solicitud es obligatorio.');
    if (!form.empresaId) clientErrors.push('Debe seleccionar una empresa.');
    if (!form.justificacion.trim()) clientErrors.push('La justificación es obligatoria.');
    if (!form.departamento) clientErrors.push('Debe seleccionar un área.');
    if (form.lineas.some((l) => !l.descripcion.trim())) clientErrors.push('Todos los ítems deben tener descripción.');
    if (clientErrors.length) { setFormErrors(clientErrors); return; }

    setSaving(true);
    setFormErrors([]);
    try {
      const body: CreateSolicitudBody = {
        ...form,
        estado,
        centroCostoId: form.centroCostoId || undefined,
        fechaRequerida: form.fechaRequerida || undefined,
        tiempoEntrega: form.tiempoEntrega || undefined,
      };
      await createSolicitud(body);
      closeModal();
      load();
    } catch (err: unknown) {
      const parsed = parseApiError(err, 'Error al crear la solicitud.');
      setFormErrors(parsed.allMessages.length ? parsed.allMessages : [parsed.summary]);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta solicitud?')) return;
    try {
      await deleteSolicitud(id);
      load();
    } catch {
      // ignore
    }
  };

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Compra</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona las solicitudes de compra de tu organización
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nueva Solicitud
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título o número..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={filters.estado}
            onChange={(e) => setFilter('estado', e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos los estados</option>
            {Object.entries(estadoLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filters.categoria}
            onChange={(e) => setFilter('categoria', e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filters.departamento}
            onChange={(e) => setFilter('departamento', e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos los departamentos</option>
            {departamentos.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={filters.categoria}
            onChange={(e) => setFilter('categoria', e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table / Empty state */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FileText className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-base font-semibold text-gray-900">No hay solicitudes</p>
            <p className="mt-1 text-sm text-gray-500">
              No se encontraron solicitudes de compra con los filtros actuales.
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Solicitante</th>
                  <th className="px-4 py-3">Departamento</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Total Est.</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {solicitudes.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">
                      {s.numero}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-gray-900">
                      {s.titulo || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {s.solicitante?.nombre} {s.solicitante?.apellido}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {s.departamento || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${prioridadColors[s.prioridad] || ''}`}>
                        {prioridadLabels[s.prioridad] || s.prioridad}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${estadoColors[s.estado] || ''}`}>
                        {estadoLabels[s.estado] || s.estado}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(Number(s.totalEstimado), s.moneda)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {new Date(s.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          title="Ver detalle"
                          onClick={() => router.push(`/dashboard/solicitudes/${s.id}`)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {['borrador', 'rechazada'].includes(s.estado) && (
                          <button
                            title="Eliminar"
                            onClick={() => handleDelete(s.id)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-gray-500">
                  Mostrando {(meta.page - 1) * meta.limit + 1}–
                  {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goPage(meta.page - 1)}
                    disabled={meta.page <= 1}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => goPage(p)}
                      className={`h-7 w-7 rounded text-xs font-medium ${
                        p === meta.page
                          ? 'bg-primary text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => goPage(meta.page + 1)}
                    disabled={meta.page >= meta.totalPages}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ NUEVA SOLICITUD MODAL ═══ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nueva Solicitud de Compra</h2>
                <p className="text-sm text-gray-500">
                  Complete la información para crear una nueva solicitud
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              {formErrors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <ul className="space-y-0.5">
                      {formErrors.map((msg, i) => (
                        <li key={i} className="text-sm text-red-700">{msg}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Título */}
              <div>
                <label className={labelCls}>
                  Título de la solicitud <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Compra de equipos de cómputo para oficina"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Empresa */}
              <div>
                <label className={labelCls}>
                  Empresa <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.empresaId}
                  onChange={(e) => setForm((f) => ({ ...f, empresaId: e.target.value, centroCostoId: '' }))}
                  className={selectCls}
                >
                  <option value="">Seleccionar empresa</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Row: Área + Centro de Costo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    Área <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.departamento}
                    onChange={(e) => setForm((f) => ({ ...f, departamento: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">Seleccionar área</option>
                    {departamentos.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>
                    Centro de Costo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.centroCostoId}
                    onChange={(e) => setForm((f) => ({ ...f, centroCostoId: e.target.value }))}
                    className={selectCls}
                    disabled={!form.empresaId}
                  >
                    <option value="">{form.empresaId ? 'Seleccionar centro de costo' : 'Seleccione empresa primero'}</option>
                    {centrosCosto.map((cc) => (
                      <option key={cc.id} value={cc.id}>{cc.nombre} ({cc.codigo})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row: Categoría + Prioridad */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">Seleccionar categoría</option>
                    {categorias.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Prioridad</label>
                  <select
                    value={form.prioridad}
                    onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Row: Fecha requerida + Tiempo entrega */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Fecha requerida</label>
                  <input
                    type="date"
                    value={form.fechaRequerida}
                    onChange={(e) => setForm((f) => ({ ...f, fechaRequerida: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Tiempo de entrega (días)</label>
                  <input
                    type="number"
                    placeholder="Ej: 15"
                    value={form.tiempoEntrega ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        tiempoEntrega: e.target.value ? parseInt(e.target.value) : undefined,
                      }))
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Moneda */}
              <div className="w-1/2">
                <label className={labelCls}>Moneda</label>
                <select
                  value={form.moneda}
                  onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value }))}
                  className={selectCls}
                >
                  <option value="COP">COP - Peso Colombiano</option>
                  <option value="USD">USD - Dólar Estadounidense</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className={labelCls}>Descripción general</label>
                <textarea
                  rows={3}
                  placeholder="Descripción detallada de la solicitud..."
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  className={inputCls + ' resize-none'}
                />
              </div>

              {/* Justificación */}
              <div>
                <label className={labelCls}>
                  Justificación <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="¿Por qué es necesaria esta compra?"
                  value={form.justificacion}
                  onChange={(e) => setForm((f) => ({ ...f, justificacion: e.target.value }))}
                  className={inputCls + ' resize-none'}
                />
              </div>

              {/* ─── Ítems de la solicitud ─── */}
              <div className="rounded-xl border border-gray-200 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Ítems de la solicitud</h3>
                  <button
                    onClick={addLinea}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar ítem
                  </button>
                </div>

                <div className="space-y-4">
                  {form.lineas.map((linea, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-lg border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">
                          Ítem {idx + 1}
                        </span>
                        {form.lineas.length > 1 && (
                          <button
                            onClick={() => removeLinea(idx)}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Row 1: Descripción + Cantidad + Unidad */}
                      <div className="mb-3 grid grid-cols-12 gap-3">
                        <div className="col-span-6">
                          <label className={labelCls}>
                            Descripción <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Descripción del producto/servicio"
                            value={linea.descripcion}
                            onChange={(e) => updateLinea(idx, 'descripcion', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div className="col-span-3">
                          <label className={labelCls}>
                            Cantidad <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={linea.cantidad}
                            onChange={(e) =>
                              updateLinea(idx, 'cantidad', parseInt(e.target.value) || 1)
                            }
                            className={inputCls}
                          />
                        </div>
                        <div className="col-span-3">
                          <label className={labelCls}>Unidad</label>
                          <select
                            value={linea.unidadMedida}
                            onChange={(e) => updateLinea(idx, 'unidadMedida', e.target.value)}
                            className={selectCls}
                          >
                            {unidades.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Precio estimado + Especificaciones */}
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-3">
                          <label className={labelCls}>Precio estimado</label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            value={linea.precioEstimado || ''}
                            onChange={(e) =>
                              updateLinea(idx, 'precioEstimado', parseFloat(e.target.value) || 0)
                            }
                            className={inputCls}
                          />
                        </div>
                        <div className="col-span-9">
                          <label className={labelCls}>Especificaciones</label>
                          <input
                            type="text"
                            placeholder="Marca, modelo, características específicas..."
                            value={linea.especificaciones || ''}
                            onChange={(e) => updateLinea(idx, 'especificaciones', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 text-right">
                  <span className="text-xs text-gray-500">Total estimado</span>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(totalEstimado, form.moneda)}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSubmit('borrador')}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                Guardar borrador
              </button>
              <button
                onClick={() => handleSubmit('enviada')}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
