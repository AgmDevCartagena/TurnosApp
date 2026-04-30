'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import { fetchProveedor, updateProveedor } from '@/lib/proveedores-api';

// ── Wizard ──────────────────────────────────────
const WIZARD_STEPS = [
  { num: 1, label: 'Básicos' },
  { num: 2, label: 'Representante' },
  { num: 3, label: 'Sucursales' },
  { num: 4, label: 'Socios' },
  { num: 5, label: 'Finanzas' },
  { num: 6, label: 'Bancaria' },
];
const CURRENT_STEP = 5;

// ── Catálogos ────────────────────────────────────
const REGIMENES_IVA = [
  { value: 'responsable_iva', label: 'Responsable de IVA' },
  { value: 'no_responsable', label: 'No Responsable de IVA' },
  { value: 'gran_contribuyente', label: 'Gran Contribuyente' },
  { value: 'regimen_especial', label: 'Régimen Especial' },
  { value: 'entidad_sin_animo', label: 'Entidad Sin Ánimo de Lucro' },
];

const ACTIVIDADES_ICA = [
  { value: 'industrial', label: 'Industrial' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'financiero', label: 'Financiero / Seguros' },
  { value: 'exento', label: 'Exento' },
];

// ── Form state ───────────────────────────────────
interface FormData {
  regimenIva: string;
  esAutorretenedorRenta: boolean;
  resolucionRentaNo: string;
  resolucionRentaFecha: string;
  resolucionRentaPct: string;
  esGranContribuyente: boolean;
  resolucionGcNo: string;
  resolucionGcFecha: string;
  actividadesIca: string[];
  codigoIca: string;
  municipioIca: string;
  esAutorretenedorIca: boolean;
}

const EMPTY: FormData = {
  regimenIva: '',
  esAutorretenedorRenta: false,
  resolucionRentaNo: '',
  resolucionRentaFecha: '',
  resolucionRentaPct: '',
  esGranContribuyente: false,
  resolucionGcNo: '',
  resolucionGcFecha: '',
  actividadesIca: [],
  codigoIca: '',
  municipioIca: '',
  esAutorretenedorIca: false,
};

type FormErrors = Record<string, string>;

// ── Component ────────────────────────────────────
export default function FinanzasPage() {
  const { id: proveedorId } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Load existing data ───────────────────────
  useEffect(() => {
    fetchProveedor(proveedorId)
      .then(p => {
        setForm({
          regimenIva: p.regimenIva ?? '',
          esAutorretenedorRenta: p.esAutorretenedorRenta ?? false,
          resolucionRentaNo: p.resolucionRentaNo ?? '',
          resolucionRentaFecha: p.resolucionRentaFecha
            ? p.resolucionRentaFecha.slice(0, 10)
            : '',
          resolucionRentaPct: p.resolucionRentaPct ?? '',
          esGranContribuyente: p.esGranContribuyente ?? false,
          resolucionGcNo: p.resolucionGcNo ?? '',
          resolucionGcFecha: p.resolucionGcFecha ? p.resolucionGcFecha.slice(0, 10) : '',
          actividadesIca: p.actividadesIca ?? [],
          codigoIca: p.codigoIca ?? '',
          municipioIca: p.municipioIca ?? '',
          esAutorretenedorIca: p.esAutorretenedorIca ?? false,
        });
      })
      .catch(() => setApiError('Error al cargar los datos tributarios.'))
      .finally(() => setLoading(false));
  }, [proveedorId]);

  // ── Handlers ─────────────────────────────────
  const setField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const toggleActividad = (val: string) => {
    setForm(prev => {
      if (val === 'exento') {
        const isNowExento = !prev.actividadesIca.includes('exento');
        return { ...prev, actividadesIca: isNowExento ? ['exento'] : [] };
      }
      if (prev.actividadesIca.includes('exento')) return prev;
      const next = prev.actividadesIca.includes(val)
        ? prev.actividadesIca.filter(a => a !== val)
        : [...prev.actividadesIca, val];
      return { ...prev, actividadesIca: next };
    });
    if (errors.actividadesIca) setErrors(prev => { const n = { ...prev }; delete n.actividadesIca; return n; });
  };

  // ── Validation ───────────────────────────────
  const validate = (): boolean => {
    const errs: FormErrors = {};

    if (!form.regimenIva) errs.regimenIva = 'El Régimen IVA es obligatorio (RN-01)';

    if (form.esAutorretenedorRenta) {
      if (!form.resolucionRentaNo.trim()) errs.resolucionRentaNo = 'Resolución es obligatoria (RN-02)';
      else if (form.resolucionRentaNo.length > 20) errs.resolucionRentaNo = 'Máximo 20 caracteres';
      if (!form.resolucionRentaFecha) errs.resolucionRentaFecha = 'Fecha de resolución es obligatoria (RN-02)';
      const pct = parseFloat(form.resolucionRentaPct);
      if (!form.resolucionRentaPct.trim()) {
        errs.resolucionRentaPct = 'Porcentaje es obligatorio (RN-02)';
      } else if (isNaN(pct) || pct <= 0) {
        errs.resolucionRentaPct = 'El porcentaje debe ser mayor a 0 (RF-04)';
      } else if (pct > 100) {
        errs.resolucionRentaPct = 'El porcentaje no puede superar el 100% (RN-06)';
      }
    }

    if (form.esGranContribuyente) {
      if (!form.resolucionGcNo.trim()) errs.resolucionGcNo = 'Resolución es obligatoria (RN-03)';
      else if (form.resolucionGcNo.length > 20) errs.resolucionGcNo = 'Máximo 20 caracteres';
      if (!form.resolucionGcFecha) errs.resolucionGcFecha = 'Fecha de resolución es obligatoria (RN-03)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save ─────────────────────────────────────
  const buildPayload = (onboarding: string) => ({
    regimenIva: form.regimenIva || undefined,
    esAutorretenedorRenta: form.esAutorretenedorRenta,
    resolucionRentaNo: form.esAutorretenedorRenta ? form.resolucionRentaNo || undefined : null,
    resolucionRentaFecha: form.esAutorretenedorRenta ? form.resolucionRentaFecha || undefined : null,
    resolucionRentaPct: form.esAutorretenedorRenta ? form.resolucionRentaPct || undefined : null,
    esGranContribuyente: form.esGranContribuyente,
    resolucionGcNo: form.esGranContribuyente ? form.resolucionGcNo || undefined : null,
    resolucionGcFecha: form.esGranContribuyente ? form.resolucionGcFecha || undefined : null,
    actividadesIca: form.actividadesIca,
    codigoIca: form.codigoIca || undefined,
    municipioIca: form.municipioIca || undefined,
    esAutorretenedorIca: form.esAutorretenedorIca,
    estadoOnboarding: onboarding,
  });

  const handleGuardarBorrador = async () => {
    setApiError(null);
    setSaving(true);
    try {
      await updateProveedor(proveedorId, buildPayload('borrador'));
      setSuccessMsg('Borrador guardado correctamente.');
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Error al guardar borrador.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizar = async () => {
    if (!validate()) return;
    setApiError(null);
    setSaving(true);
    try {
      await updateProveedor(proveedorId, buildPayload('en_proceso'));
      setSuccessMsg('Datos tributarios guardados.');
      setTimeout(() => router.push(`/dashboard/proveedores/${proveedorId}/informacion-bancaria`), 1200);
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Error al guardar los datos tributarios.');
    } finally {
      setSaving(false);
    }
  };

  // ── Styles ────────────────────────────────────
  const inputBase =
    'w-full rounded-lg border px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors';
  const inputOk = 'border-gray-300 focus:border-blue-500 focus:ring-blue-100';
  const inputErr = 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50';
  const today = new Date().toISOString().split('T')[0];

  const errMsg = (field: string) =>
    errors[field] ? (
      <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        {errors[field]}
      </p>
    ) : null;

  const Toggle = ({
    value,
    onChange,
    label,
  }: {
    value: boolean;
    onChange: (v: boolean) => void;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
        value
          ? 'border-blue-600 bg-blue-50 text-blue-700'
          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          value ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </span>
      {label}: <strong>{value ? 'Sí' : 'No'}</strong>
    </button>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

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

        {/* ── Form card ── */}
        <div className="space-y-6">

          {/* ── Sección 1: Régimen IVA ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Régimen IVA</h2>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Régimen IVA <span className="text-red-500">*</span>
              </label>
              <select
                value={form.regimenIva}
                onChange={e => setField('regimenIva', e.target.value)}
                className={`${inputBase} appearance-none ${errors.regimenIva ? inputErr : inputOk}`}
              >
                <option value="">Seleccione régimen IVA...</option>
                {REGIMENES_IVA.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {errMsg('regimenIva')}
            </div>
          </div>

          {/* ── Sección 2: Autorretenedor Renta ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Autorretenedor de Renta</h2>
              <Toggle
                value={form.esAutorretenedorRenta}
                onChange={v => {
                  setField('esAutorretenedorRenta', v);
                  if (!v) {
                    setErrors(prev => {
                      const n = { ...prev };
                      delete n.resolucionRentaNo;
                      delete n.resolucionRentaFecha;
                      delete n.resolucionRentaPct;
                      return n;
                    });
                  }
                }}
                label="Autorretenedor de Renta"
              />
            </div>

            {form.esAutorretenedorRenta && (
              <div className="mt-4 space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Resolución No. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.resolucionRentaNo}
                      onChange={e => setField('resolucionRentaNo', e.target.value)}
                      placeholder="Número de resolución"
                      maxLength={20}
                      className={`${inputBase} ${errors.resolucionRentaNo ? inputErr : inputOk}`}
                    />
                    {errMsg('resolucionRentaNo')}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Fecha Resolución <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.resolucionRentaFecha}
                      max={today}
                      onChange={e => setField('resolucionRentaFecha', e.target.value)}
                      className={`${inputBase} ${errors.resolucionRentaFecha ? inputErr : inputOk}`}
                    />
                    {errMsg('resolucionRentaFecha')}
                  </div>
                </div>
                <div className="w-1/2 pr-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Porcentaje de Autorretención (%) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.01"
                      max="100"
                      step="0.01"
                      value={form.resolucionRentaPct}
                      onChange={e => setField('resolucionRentaPct', e.target.value)}
                      placeholder="Ej: 3.50"
                      className={`${inputBase} pr-8 ${errors.resolucionRentaPct ? inputErr : inputOk}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                  </div>
                  {errMsg('resolucionRentaPct')}
                </div>
              </div>
            )}
          </div>

          {/* ── Sección 3: Gran Contribuyente ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Gran Contribuyente</h2>
              <Toggle
                value={form.esGranContribuyente}
                onChange={v => {
                  setField('esGranContribuyente', v);
                  if (!v) {
                    setErrors(prev => {
                      const n = { ...prev };
                      delete n.resolucionGcNo;
                      delete n.resolucionGcFecha;
                      return n;
                    });
                  }
                }}
                label="Gran Contribuyente"
              />
            </div>

            {form.esGranContribuyente && (
              <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Resolución No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.resolucionGcNo}
                    onChange={e => setField('resolucionGcNo', e.target.value)}
                    placeholder="Número de resolución"
                    maxLength={20}
                    className={`${inputBase} ${errors.resolucionGcNo ? inputErr : inputOk}`}
                  />
                  {errMsg('resolucionGcNo')}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Fecha Resolución <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.resolucionGcFecha}
                    max={today}
                    onChange={e => setField('resolucionGcFecha', e.target.value)}
                    className={`${inputBase} ${errors.resolucionGcFecha ? inputErr : inputOk}`}
                  />
                  {errMsg('resolucionGcFecha')}
                </div>
              </div>
            )}
          </div>

          {/* ── Sección 4: ICA ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Información ICA</h2>

            {/* Actividades ICA */}
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Actividades ICA
                <span className="ml-2 text-xs font-normal text-gray-400">
                  — Si selecciona &quot;Exento&quot;, no se pueden agregar otras actividades
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ACTIVIDADES_ICA.map(act => {
                  const isExentoMode = form.actividadesIca.includes('exento');
                  const checked = form.actividadesIca.includes(act.value);
                  const disabled = isExentoMode && act.value !== 'exento';
                  return (
                    <button
                      key={act.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleActividad(act.value)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors
                        ${disabled ? 'cursor-not-allowed opacity-40 border-gray-200 bg-gray-50 text-gray-400' :
                          checked ? 'border-blue-600 bg-blue-600 text-white' :
                          'border-gray-300 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50'}`}
                    >
                      {checked && <Check className="h-3 w-3" />}
                      {act.label}
                    </button>
                  );
                })}
              </div>
              {errMsg('actividadesIca')}
            </div>

            {/* Código ICA + Municipio */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Código ICA
                </label>
                <input
                  type="text"
                  value={form.codigoIca}
                  onChange={e => setField('codigoIca', e.target.value)}
                  placeholder="Código ICA municipal"
                  className={`${inputBase} ${inputOk}`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Municipio
                </label>
                <input
                  type="text"
                  value={form.municipioIca}
                  onChange={e => setField('municipioIca', e.target.value)}
                  placeholder="Municipio ICA"
                  className={`${inputBase} ${inputOk}`}
                />
              </div>
            </div>

            {/* Autorretenedor ICA */}
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Autorretenedor ICA</p>
                {form.esAutorretenedorIca && form.municipioIca && (
                  <p className="text-xs text-blue-600 mt-0.5">
                    Verifique que exista configuración tributaria activa para: {form.municipioIca}
                  </p>
                )}
              </div>
              <Toggle
                value={form.esAutorretenedorIca}
                onChange={v => setField('esAutorretenedorIca', v)}
                label="Autorretenedor ICA"
              />
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => router.push(`/dashboard/proveedores/${proveedorId}/socios`)}
            disabled={saving}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior: Socios
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
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Siguiente: Inf. Bancaria <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
