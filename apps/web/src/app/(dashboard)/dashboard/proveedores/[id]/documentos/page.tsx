'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Check,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Clock,
  ShieldAlert,
  Save,
} from 'lucide-react';
import { fetchProveedor, updateProveedor } from '@/lib/proveedores-api';
import { fetchTiposAplicables, type TipoDocumento } from '@/lib/tipos-documento-api';
import {
  fetchDocumentosProveedor,
  upsertDocumentoProveedor,
  deleteDocumentoProveedor,
  type DocumentoProveedor,
} from '@/lib/documentos-proveedores-api';

// ── Wizard ────────────────────────────────────────
const WIZARD_STEPS = [
  { num: 1, label: 'Básicos' },
  { num: 2, label: 'Representante' },
  { num: 3, label: 'Sucursales' },
  { num: 4, label: 'Socios' },
  { num: 5, label: 'Finanzas' },
  { num: 6, label: 'Bancaria' },
  { num: 7, label: 'Experiencia' },
  { num: 8, label: 'Documentos' },
];
const CURRENT_STEP = 8;

// ── Form ──────────────────────────────────────────
interface ModalForm {
  tipoDocumentoId: string;
  nombre: string;
  url: string;
  fechaExpedicion: string;
  fechaVencimiento: string;
  observaciones: string;
}

const EMPTY_FORM: ModalForm = {
  tipoDocumentoId: '',
  nombre: '',
  url: '',
  fechaExpedicion: '',
  fechaVencimiento: '',
  observaciones: '',
};

// ── Component ─────────────────────────────────────
export default function DocumentosPage() {
  const { id: proveedorId } = useParams<{ id: string }>();
  const router = useRouter();

  const [tiposRequeridos, setTiposRequeridos] = useState<TipoDocumento[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoProveedor[]>([]);
  const [tipoPersona, setTipoPersona] = useState('juridica');
  const [tipoProveedor, setTipoProveedor] = useState('nacional');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeTipo, setActiveTipo] = useState<TipoDocumento | null>(null);
  const [form, setForm] = useState<ModalForm>(EMPTY_FORM);
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});
  const [modalSaving, setModalSaving] = useState(false);

  // ── Load ─────────────────────────────────────
  const reload = useCallback(
    async (tp: string, tprov: string) => {
      const [tipos, docs] = await Promise.all([
        fetchTiposAplicables(tp, tprov),
        fetchDocumentosProveedor(proveedorId),
      ]);
      setTiposRequeridos(tipos);
      setDocumentos(docs);
    },
    [proveedorId],
  );

  useEffect(() => {
    setLoading(true);
    fetchProveedor(proveedorId)
      .then(p => {
        const tp = p.tipoPersona ?? 'juridica';
        const tprov = p.tipoProveedor ?? 'nacional';
        setTipoPersona(tp);
        setTipoProveedor(tprov);
        return reload(tp, tprov);
      })
      .catch(() => setApiError('Error al cargar los datos. Recargue la página.'))
      .finally(() => setLoading(false));
  }, [proveedorId, reload]);

  // ── Helpers ───────────────────────────────────
  const getDocForTipo = (tipoId: string) =>
    documentos.find(d => d.tipoDocumentoId === tipoId);

  const pendientesObligatorios = tiposRequeridos
    .filter(t => t.obligatorio)
    .filter(t => !getDocForTipo(t.id));

  const estadoBadge = (doc?: DocumentoProveedor) => {
    if (!doc)
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
          <Clock className="h-3 w-3" /> Pendiente
        </span>
      );
    if (doc.estado === 'vencido')
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
          <ShieldAlert className="h-3 w-3" /> Vencido
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <Check className="h-3 w-3" /> Cargado
      </span>
    );
  };

  // ── Modal ─────────────────────────────────────
  const openModal = (tipo: TipoDocumento) => {
    const existing = getDocForTipo(tipo.id);
    setActiveTipo(tipo);
    setForm(
      existing
        ? {
            tipoDocumentoId: tipo.id,
            nombre: existing.nombre,
            url: existing.url ?? '',
            fechaExpedicion: existing.fechaExpedicion?.split('T')[0] ?? '',
            fechaVencimiento: existing.fechaVencimiento?.split('T')[0] ?? '',
            observaciones: existing.observaciones ?? '',
          }
        : { ...EMPTY_FORM, tipoDocumentoId: tipo.id, nombre: tipo.nombre },
    );
    setModalErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveTipo(null);
    setForm(EMPTY_FORM);
    setModalErrors({});
  };

  const handleChange = (field: keyof ModalForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (modalErrors[field]) setModalErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validateModal = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre del documento es obligatorio';
    if (form.fechaVencimiento && form.fechaExpedicion) {
      if (new Date(form.fechaVencimiento) <= new Date(form.fechaExpedicion)) {
        errs.fechaVencimiento = 'La fecha de vencimiento debe ser posterior a la de expedición';
      }
    }
    if (activeTipo?.requiereVigencia && !form.fechaVencimiento) {
      errs.fechaVencimiento = 'Este tipo de documento requiere fecha de vencimiento (RN-05)';
    }
    setModalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGuardarDoc = async () => {
    if (!validateModal()) return;
    setModalSaving(true);
    try {
      const saved = await upsertDocumentoProveedor(proveedorId, {
        tipoDocumentoId: form.tipoDocumentoId,
        nombre: form.nombre.trim(),
        url: form.url.trim() || undefined,
        fechaExpedicion: form.fechaExpedicion || undefined,
        fechaVencimiento: form.fechaVencimiento || undefined,
        observaciones: form.observaciones.trim() || undefined,
      });
      setDocumentos(prev => {
        const idx = prev.findIndex(d => d.tipoDocumentoId === saved.tipoDocumentoId);
        return idx >= 0 ? prev.map((d, i) => (i === idx ? saved : d)) : [...prev, saved];
      });
      setSuccessMsg('Documento guardado correctamente.');
      closeModal();
    } catch (e: any) {
      setModalErrors({ _api: e?.response?.data?.message || 'Error al guardar el documento.' });
    } finally {
      setModalSaving(false);
    }
  };

  const handleDelete = async (doc: DocumentoProveedor) => {
    if (!confirm(`¿Eliminar el documento "${doc.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDocumentoProveedor(proveedorId, doc.id);
      setDocumentos(prev => prev.filter(d => d.id !== doc.id));
      setSuccessMsg('Documento eliminado.');
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Error al eliminar el documento.');
    }
  };

  // ── Navigation ────────────────────────────────
  const handleGuardarBorrador = async () => {
    setApiError(null);
    setSaving(true);
    try {
      await updateProveedor(proveedorId, { estadoOnboarding: 'borrador' });
      setSuccessMsg('Borrador guardado.');
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Error al guardar borrador.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizar = async () => {
    if (pendientesObligatorios.length > 0) {
      setApiError(
        `Documentos obligatorios pendientes (RN-03/RN-04): ${pendientesObligatorios.map(p => p.nombre).join(', ')}`,
      );
      return;
    }
    setApiError(null);
    setSaving(true);
    try {
      await updateProveedor(proveedorId, { estadoOnboarding: 'completado' });
      setSuccessMsg('Registro completado exitosamente.');
      setTimeout(() => router.push(`/dashboard/proveedores/${proveedorId}`), 1200);
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Error al finalizar el registro.');
    } finally {
      setSaving(false);
    }
  };

  // ── Styles ────────────────────────────────────
  const inputBase =
    'w-full rounded-lg border px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors';
  const inputOk = 'border-gray-300 focus:border-blue-500 focus:ring-blue-100';
  const inputErr = 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50';

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const obligatorios = tiposRequeridos.filter(t => t.obligatorio);
  const opcionales = tiposRequeridos.filter(t => !t.obligatorio);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* ── Title ── */}
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Registro de Nuevo Proveedor</h1>

        {/* ── Wizard ── */}
        <div className="mb-8 flex items-start gap-0">
          {WIZARD_STEPS.map((step, idx) => {
            const done = step.num < CURRENT_STEP;
            const active = step.num === CURRENT_STEP;
            const isLast = idx === WIZARD_STEPS.length - 1;
            return (
              <div key={step.num} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors
                      ${done || active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-400'}`}
                  >
                    {done ? <Check className="h-4 w-4" /> : step.num}
                  </div>
                  {!isLast && (
                    <div className={`h-0.5 flex-1 ${done ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                </div>
                <p
                  className={`mt-1 text-center text-[11px] font-semibold uppercase tracking-wide ${active ? 'text-blue-600' : done ? 'text-gray-500' : 'text-gray-400'}`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Banners ── */}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)}><X className="h-4 w-4" /></button>
          </div>
        )}
        {apiError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{apiError}</span>
            <button onClick={() => setApiError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* ── Resumen pendientes ── */}
        {pendientesObligatorios.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2">
              <ShieldAlert className="h-4 w-4" />
              {pendientesObligatorios.length} documento(s) obligatorio(s) pendiente(s)
            </div>
            <ul className="space-y-1 pl-5">
              {pendientesObligatorios.map(p => (
                <li key={p.id} className="text-xs text-amber-700 list-disc">{p.nombre}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Tabla documentos ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Documentos Financieros y Referencias</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Registre los documentos requeridos según el tipo de proveedor.
              Los documentos marcados con <span className="font-semibold text-red-500">*</span> son obligatorios.
            </p>
          </div>

          {/* Obligatorios */}
          {obligatorios.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="px-8 py-3 bg-gray-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Documentos Obligatorios
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {obligatorios.map(tipo => {
                  const doc = getDocForTipo(tipo.id);
                  return (
                    <div key={tipo.id} className="flex items-center gap-4 px-8 py-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                        <FileText className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">
                          {tipo.nombre}
                          <span className="ml-1 text-red-500">*</span>
                          {tipo.requiereVigencia && (
                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              Requiere vigencia
                            </span>
                          )}
                        </p>
                        {tipo.descripcion && (
                          <p className="mt-0.5 text-xs text-gray-400">{tipo.descripcion}</p>
                        )}
                        {doc && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {doc.nombre}
                            {doc.fechaVencimiento && (
                              <span className="ml-2 text-gray-400">
                                Vence: {new Date(doc.fechaVencimiento).toLocaleDateString('es-CO')}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {estadoBadge(doc)}
                        <button
                          onClick={() => openModal(tipo)}
                          className="flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          {doc ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          {doc ? 'Editar' : 'Cargar'}
                        </button>
                        {doc && (
                          <button
                            onClick={() => handleDelete(doc)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Opcionales */}
          {opcionales.length > 0 && (
            <div>
              <div className="px-8 py-3 bg-gray-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Documentos Opcionales
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {opcionales.map(tipo => {
                  const doc = getDocForTipo(tipo.id);
                  return (
                    <div key={tipo.id} className="flex items-center gap-4 px-8 py-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50">
                        <FileText className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">
                          {tipo.nombre}
                          {tipo.requiereVigencia && (
                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              Requiere vigencia
                            </span>
                          )}
                        </p>
                        {tipo.descripcion && (
                          <p className="mt-0.5 text-xs text-gray-400">{tipo.descripcion}</p>
                        )}
                        {doc && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {doc.nombre}
                            {doc.fechaVencimiento && (
                              <span className="ml-2 text-gray-400">
                                Vence: {new Date(doc.fechaVencimiento).toLocaleDateString('es-CO')}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {estadoBadge(doc)}
                        <button
                          onClick={() => openModal(tipo)}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          {doc ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          {doc ? 'Editar' : 'Cargar'}
                        </button>
                        {doc && (
                          <button
                            onClick={() => handleDelete(doc)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tiposRequeridos.length === 0 && (
            <div className="px-8 py-12 text-center text-gray-400">
              <FileText className="mx-auto mb-2 h-8 w-8" />
              <p className="text-sm">No hay tipos de documento configurados. Contacte al administrador.</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => router.push(`/dashboard/proveedores/${proveedorId}/experiencia`)}
            disabled={saving}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior: Experiencia
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGuardarBorrador}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="inline mr-1 h-4 w-4 animate-spin" /> : null}
              Guardar Borrador
            </button>
            <button
              onClick={handleFinalizar}
              disabled={saving || pendientesObligatorios.length > 0}
              title={
                pendientesObligatorios.length > 0
                  ? `Faltan ${pendientesObligatorios.length} documento(s) obligatorio(s)`
                  : undefined
              }
              className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Finalizar Registro
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {modalOpen && activeTipo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {getDocForTipo(activeTipo.id) ? 'Actualizar Documento' : 'Registrar Documento'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{activeTipo.nombre}</p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {modalErrors._api && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {modalErrors._api}
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Nombre del documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => handleChange('nombre', e.target.value)}
                  placeholder="Ej: RUT-2024.pdf"
                  maxLength={200}
                  className={`${inputBase} ${modalErrors.nombre ? inputErr : inputOk}`}
                />
                {modalErrors.nombre && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />{modalErrors.nombre}
                  </p>
                )}
              </div>

              {/* URL */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  URL del documento
                  <span className="ml-1.5 text-xs font-normal text-gray-400">(Opcional)</span>
                </label>
                <input
                  type="url"
                  value={form.url}
                  onChange={e => handleChange('url', e.target.value)}
                  placeholder="https://storage.empresa.com/docs/rut.pdf"
                  className={`${inputBase} ${inputOk}`}
                />
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Fecha de Expedición
                  </label>
                  <input
                    type="date"
                    value={form.fechaExpedicion}
                    onChange={e => handleChange('fechaExpedicion', e.target.value)}
                    className={`${inputBase} ${inputOk}`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Fecha de Vencimiento
                    {activeTipo.requiereVigencia && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    value={form.fechaVencimiento}
                    onChange={e => handleChange('fechaVencimiento', e.target.value)}
                    className={`${inputBase} ${modalErrors.fechaVencimiento ? inputErr : inputOk}`}
                  />
                  {modalErrors.fechaVencimiento && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />{modalErrors.fechaVencimiento}
                    </p>
                  )}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Observaciones
                  <span className="ml-1.5 text-xs font-normal text-gray-400">(Opcional)</span>
                </label>
                <textarea
                  value={form.observaciones}
                  onChange={e => handleChange('observaciones', e.target.value)}
                  placeholder="Notas adicionales sobre el documento..."
                  maxLength={500}
                  rows={3}
                  className={`${inputBase} resize-none ${inputOk}`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={closeModal}
                disabled={modalSaving}
                className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarDoc}
                disabled={modalSaving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {modalSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
