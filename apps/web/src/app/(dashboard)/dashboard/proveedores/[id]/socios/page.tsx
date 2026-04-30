'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Check,
  Save,
  Users,
} from 'lucide-react';
import {
  fetchSocios,
  createSocio,
  updateSocio,
  deleteSocio,
  type Socio,
  type CreateSocioPayload,
} from '@/lib/socios-api';
import { updateProveedor } from '@/lib/proveedores-api';

// ── Wizard ─────────────────────────────────────
const WIZARD_STEPS = [
  { num: 1, label: 'Básicos' },
  { num: 2, label: 'Representante' },
  { num: 3, label: 'Sucursales' },
  { num: 4, label: 'Socios' },
  { num: 5, label: 'Finanzas' },
];
const CURRENT_STEP = 4;

const TIPOS_DOC = [
  { value: 'cc', label: 'C.C.' },
  { value: 'ce', label: 'C.E.' },
  { value: 'nit', label: 'NIT' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'pep', label: 'PEP' },
];

const TIPOS_PARTICIPACION = [
  { value: 'directa', label: 'Directa' },
  { value: 'indirecta', label: 'Indirecta' },
];

// ── Form types ────────────────────────────────
interface ModalForm {
  tipoDoc: string;
  numeroDoc: string;
  nombreRazon: string;
  participacion: string;
  tipoParticipacion: string;
}

const EMPTY_FORM: ModalForm = {
  tipoDoc: 'cc',
  numeroDoc: '',
  nombreRazon: '',
  participacion: '',
  tipoParticipacion: 'directa',
};

type ModalErrors = Record<string, string>;

// ── Component ─────────────────────────────────
export default function SociosPage() {
  const { id: proveedorId } = useParams<{ id: string }>();
  const router = useRouter();

  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModalForm>(EMPTY_FORM);
  const [modalErrors, setModalErrors] = useState<ModalErrors>({});
  const [modalSaving, setModalSaving] = useState(false);

  // ── totales ────────────────────────────────
  const totalParticipacion = useMemo(
    () => socios.reduce((sum, s) => sum + parseFloat(s.participacion), 0),
    [socios],
  );

  const disponible = useMemo(() => {
    if (!editingId) return 100 - totalParticipacion;
    const editingCurrent = socios.find(s => s.id === editingId);
    return 100 - totalParticipacion + parseFloat(editingCurrent?.participacion ?? '0');
  }, [socios, editingId, totalParticipacion]);

  // ── Load ──────────────────────────────────
  useEffect(() => {
    fetchSocios(proveedorId)
      .then(setSocios)
      .catch(() => setApiError('Error al cargar los socios. Recargue la página.'))
      .finally(() => setLoading(false));
  }, [proveedorId]);

  // ── Modal helpers ─────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalErrors({});
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (s: Socio) => {
    setForm({
      tipoDoc: s.tipoDoc,
      numeroDoc: s.numeroDoc,
      nombreRazon: s.nombreRazon,
      participacion: s.participacion,
      tipoParticipacion: s.tipoParticipacion,
    });
    setModalErrors({});
    setEditingId(s.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalErrors({});
  };

  const handleChange = (field: keyof ModalForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (modalErrors[field]) {
      setModalErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validateModal = (): boolean => {
    const errs: ModalErrors = {};

    if (!form.tipoDoc) errs.tipoDoc = 'Tipo de documento es obligatorio';
    if (!form.numeroDoc.trim()) {
      errs.numeroDoc = 'Número de identificación es obligatorio';
    } else if (!/^[\d\-]+$/.test(form.numeroDoc.trim())) {
      errs.numeroDoc = 'Solo se permiten dígitos y guiones';
    }
    if (!form.nombreRazon.trim()) errs.nombreRazon = 'Nombre / Razón Social es obligatorio';

    const pct = parseFloat(form.participacion);
    if (!form.participacion.trim()) {
      errs.participacion = '% de participación es obligatorio';
    } else if (isNaN(pct)) {
      errs.participacion = 'Debe ser un número válido';
    } else if (pct <= 5) {
      errs.participacion = 'La participación debe ser mayor al 5% (RN-01)';
    } else if (pct > 100) {
      errs.participacion = 'La participación no puede superar el 100%';
    } else if (pct > disponible + 0.001) {
      errs.participacion = `Disponible: ${disponible.toFixed(2)}%. La suma total no puede superar el 100% (RN-02)`;
    } else if (!/^\d+(\.\d{1,2})?$/.test(form.participacion.trim())) {
      errs.participacion = 'Máximo 2 decimales';
    }

    if (!form.tipoParticipacion) errs.tipoParticipacion = 'Tipo de participación es obligatorio';

    setModalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGuardarSocio = async () => {
    if (!validateModal()) return;
    setModalSaving(true);
    const payload: CreateSocioPayload = {
      tipoDoc: form.tipoDoc,
      numeroDoc: form.numeroDoc.trim(),
      nombreRazon: form.nombreRazon.trim(),
      participacion: parseFloat(form.participacion).toFixed(2),
      tipoParticipacion: form.tipoParticipacion,
    };
    try {
      if (editingId) {
        const updated = await updateSocio(proveedorId, editingId, payload);
        setSocios(prev => prev.map(s => (s.id === editingId ? updated : s)));
        setSuccessMsg('Socio actualizado correctamente.');
      } else {
        const created = await createSocio(proveedorId, payload);
        setSocios(prev => [...prev, created]);
        setSuccessMsg('Socio registrado correctamente.');
      }
      closeModal();
    } catch (e: any) {
      setModalErrors({ _api: e?.response?.data?.message || 'Error al guardar el socio.' });
    } finally {
      setModalSaving(false);
    }
  };

  const handleDelete = async (s: Socio) => {
    if (!confirm(`¿Eliminar a "${s.nombreRazon}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteSocio(proveedorId, s.id);
      setSocios(prev => prev.filter(x => x.id !== s.id));
      setSuccessMsg('Socio eliminado.');
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Error al eliminar el socio.');
    }
  };

  // ── Navigation ────────────────────────────
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

  const handleSiguiente = async () => {
    setApiError(null);
    setSaving(true);
    try {
      await updateProveedor(proveedorId, { estadoOnboarding: 'en_proceso' });
      router.push(`/dashboard/proveedores/${proveedorId}/finanzas`);
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Error al avanzar al siguiente paso.');
    } finally {
      setSaving(false);
    }
  };

  // ── Styles ────────────────────────────────
  const inputBase =
    'w-full rounded-lg border px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors';
  const inputOk = 'border-gray-300 focus:border-blue-500 focus:ring-blue-100';
  const inputErr = 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50';

  const errMsg = (field: string) =>
    modalErrors[field] ? (
      <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        {modalErrors[field]}
      </p>
    ) : null;

  const tipoDocLabel = (val: string) =>
    TIPOS_DOC.find(t => t.value === val)?.label ?? val.toUpperCase();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* ── Page title ── */}
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

        {/* ── Card ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between px-8 py-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Socios / Accionistas</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Registre los accionistas con participación directa o indirecta superior al 5%.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Indicador participación total */}
              <div className="flex flex-col items-end">
                <span className="text-xs font-medium text-gray-500">Participación total</span>
                <span
                  className={`text-sm font-bold ${
                    totalParticipacion > 100
                      ? 'text-red-600'
                      : totalParticipacion >= 90
                        ? 'text-amber-600'
                        : 'text-green-600'
                  }`}
                >
                  {totalParticipacion.toFixed(2)}%
                </span>
              </div>
              <button
                onClick={openCreate}
                disabled={totalParticipacion >= 100}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Agregar Socio
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Nombre / Razón Social</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo Doc</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">N° Identificación</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">% Participación</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {socios.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Users className="h-8 w-8" />
                        <p className="text-sm">No hay socios registrados. Haga clic en "Agregar Socio" para comenzar.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  socios.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800">{s.nombreRazon}</td>
                      <td className="px-4 py-4 text-gray-600">{tipoDocLabel(s.tipoDoc)}</td>
                      <td className="px-4 py-4 text-gray-600 font-mono text-xs">{s.numeroDoc}</td>
                      <td className="px-4 py-4 text-right font-semibold text-gray-800">
                        {parseFloat(s.participacion).toFixed(2)}%
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            s.tipoParticipacion === 'directa'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {s.tipoParticipacion}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(s)}
                            className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {socios.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={3} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">
                      {totalParticipacion.toFixed(2)}%
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => router.push(`/dashboard/proveedores/${proveedorId}/sucursales`)}
            disabled={saving}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior: Sucursales
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
              onClick={handleSiguiente}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Siguiente: Finanzas <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {editingId ? 'Editar Socio / Accionista' : 'Registrar Nuevo Socio'}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {/* API error */}
              {modalErrors._api && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {modalErrors._api}
                </div>
              )}

              {/* Tipo Doc + Número */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tipo de Documento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.tipoDoc}
                    onChange={e => handleChange('tipoDoc', e.target.value)}
                    className={`${inputBase} appearance-none ${modalErrors.tipoDoc ? inputErr : inputOk}`}
                  >
                    {TIPOS_DOC.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {errMsg('tipoDoc')}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    N° de Identificación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.numeroDoc}
                    onChange={e => handleChange('numeroDoc', e.target.value.replace(/[^\d\-]/g, ''))}
                    placeholder="Solo dígitos y guiones"
                    maxLength={30}
                    className={`${inputBase} font-mono ${modalErrors.numeroDoc ? inputErr : inputOk}`}
                  />
                  {errMsg('numeroDoc')}
                </div>
              </div>

              {/* Nombre / Razón Social */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Nombre / Razón Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombreRazon}
                  onChange={e => handleChange('nombreRazon', e.target.value)}
                  placeholder="Nombre completo o razón social"
                  maxLength={200}
                  className={`${inputBase} ${modalErrors.nombreRazon ? inputErr : inputOk}`}
                />
                {errMsg('nombreRazon')}
              </div>

              {/* % Participación + Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    % Participación <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="5.01"
                      max="100"
                      step="0.01"
                      value={form.participacion}
                      onChange={e => handleChange('participacion', e.target.value)}
                      placeholder="Ej: 25.50"
                      className={`${inputBase} pr-8 ${modalErrors.participacion ? inputErr : inputOk}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Disponible: {disponible.toFixed(2)}% · Mínimo: &gt;5%
                  </p>
                  {errMsg('participacion')}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tipo de Participación <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.tipoParticipacion}
                    onChange={e => handleChange('tipoParticipacion', e.target.value)}
                    className={`${inputBase} appearance-none ${modalErrors.tipoParticipacion ? inputErr : inputOk}`}
                  >
                    {TIPOS_PARTICIPACION.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {errMsg('tipoParticipacion')}
                </div>
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
                onClick={handleGuardarSocio}
                disabled={modalSaving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {modalSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Socio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
