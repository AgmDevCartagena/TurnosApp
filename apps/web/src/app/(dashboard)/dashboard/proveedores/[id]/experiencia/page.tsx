'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Check,
  Award,
} from 'lucide-react';
import { fetchProveedor, updateProveedor } from '@/lib/proveedores-api';

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
const CURRENT_STEP = 7;

// ── Catálogos parametrizables ─────────────────────
const RANGOS_EXPERIENCIA = [
  {
    value: 'menos_1_anio',
    label: 'Menos de 1 año',
    desc: 'El proveedor tiene menos de 1 año de operaciones en el mercado.',
  },
  {
    value: 'de_1_5_anios',
    label: 'De 1 a 5 años',
    desc: 'El proveedor cuenta con entre 1 y 5 años de trayectoria.',
  },
  {
    value: 'mas_5_anios',
    label: 'Más de 5 años',
    desc: 'El proveedor tiene más de 5 años de experiencia comprobada.',
  },
];

const CERTIFICACIONES_CATALOGO = [
  { value: 'ISO 9001', label: 'ISO 9001', desc: 'Sistemas de Gestión de Calidad' },
  { value: 'ISO 45001', label: 'ISO 45001', desc: 'Seguridad y Salud en el Trabajo' },
  { value: 'ISO 14001', label: 'ISO 14001', desc: 'Sistemas de Gestión Ambiental' },
];

// ── Component ─────────────────────────────────────
export default function ExperienciaPage() {
  const { id: proveedorId } = useParams<{ id: string }>();
  const router = useRouter();

  const [rangoExperiencia, setRangoExperiencia] = useState('');
  const [descripcionExperiencia, setDescripcionExperiencia] = useState('');
  const [certificaciones, setCertificaciones] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Load ─────────────────────────────────────
  useEffect(() => {
    fetchProveedor(proveedorId)
      .then(p => {
        if (p.rangoExperiencia) setRangoExperiencia(p.rangoExperiencia);
        if (p.descripcionExperiencia) setDescripcionExperiencia(p.descripcionExperiencia);
        if (p.certificaciones?.length) setCertificaciones(p.certificaciones);
      })
      .catch(() => setApiError('Error al cargar los datos. Recargue la página.'))
      .finally(() => setLoading(false));
  }, [proveedorId]);

  // ── Certificaciones toggle ────────────────────
  const toggleCert = (val: string) => {
    setCertificaciones(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val],
    );
    if (errors.certificaciones) setErrors(prev => { const n = { ...prev }; delete n.certificaciones; return n; });
  };

  // ── Validation ───────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!rangoExperiencia) {
      errs.rangoExperiencia = 'Debe seleccionar un rango de experiencia (RN-01)';
    }
    if (descripcionExperiencia && descripcionExperiencia.length < 20) {
      errs.descripcionExperiencia = 'Si diligencia la descripción, debe tener mínimo 20 caracteres (RN-03)';
    }
    if (descripcionExperiencia && descripcionExperiencia.length > 500) {
      errs.descripcionExperiencia = 'Máximo 500 caracteres';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Payload ───────────────────────────────────
  const buildPayload = (onboarding: string) => ({
    rangoExperiencia: rangoExperiencia || undefined,
    descripcionExperiencia: descripcionExperiencia.trim() || undefined,
    certificaciones,
    estadoOnboarding: onboarding,
  });

  // ── Handlers ──────────────────────────────────
  const handleGuardarBorrador = async () => {
    setApiError(null);
    setSaving(true);
    try {
      await updateProveedor(proveedorId, buildPayload('borrador'));
      setSuccessMsg('Borrador guardado.');
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
      router.push(`/dashboard/proveedores/${proveedorId}/documentos`);
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Error al guardar.');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
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

        {/* ── Card ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Información de Experiencia</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Registre la trayectoria del proveedor en el mercado y sus certificaciones.
            </p>
          </div>

          <div className="space-y-8 px-8 py-6">
            {/* ── Rango de Experiencia ── */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-gray-800">
                Rango de Experiencia en el Mercado <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {RANGOS_EXPERIENCIA.map(r => (
                  <label
                    key={r.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-5 py-4 transition-colors ${
                      rangoExperiencia === r.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rangoExperiencia"
                      value={r.value}
                      checked={rangoExperiencia === r.value}
                      onChange={() => {
                        setRangoExperiencia(r.value);
                        if (errors.rangoExperiencia) setErrors(prev => { const n = { ...prev }; delete n.rangoExperiencia; return n; });
                      }}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <p className={`text-sm font-semibold ${rangoExperiencia === r.value ? 'text-blue-700' : 'text-gray-800'}`}>
                        {r.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.rangoExperiencia && (
                <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  {errors.rangoExperiencia}
                </p>
              )}
            </div>

            {/* ── Descripción de Experiencia ── */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-800">
                Descripción de Experiencia
                <span className="ml-1.5 text-xs font-normal text-gray-400">(Opcional — mín. 20 caracteres si se diligencia)</span>
              </label>
              <textarea
                value={descripcionExperiencia}
                onChange={e => {
                  setDescripcionExperiencia(e.target.value);
                  if (errors.descripcionExperiencia) setErrors(prev => { const n = { ...prev }; delete n.descripcionExperiencia; return n; });
                }}
                placeholder="Describa la trayectoria del proveedor, sectores atendidos, logros relevantes..."
                maxLength={500}
                rows={4}
                className={`${inputBase} resize-none ${errors.descripcionExperiencia ? inputErr : inputOk}`}
              />
              <div className="mt-1 flex items-start justify-between">
                <div>
                  {errors.descripcionExperiencia && (
                    <p className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      {errors.descripcionExperiencia}
                    </p>
                  )}
                </div>
                <p className={`text-xs ${descripcionExperiencia.length > 450 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {descripcionExperiencia.length}/500
                </p>
              </div>
            </div>

            {/* ── Certificaciones ── */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-500" />
                <label className="text-sm font-semibold text-gray-800">
                  Certificaciones
                  <span className="ml-1.5 text-xs font-normal text-gray-400">(Opcional — selección múltiple)</span>
                </label>
              </div>
              <div className="space-y-2">
                {CERTIFICACIONES_CATALOGO.map(cert => {
                  const checked = certificaciones.includes(cert.value);
                  return (
                    <label
                      key={cert.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-5 py-4 transition-colors ${
                        checked
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCert(cert.value)}
                        className="mt-0.5 h-4 w-4 rounded accent-blue-600"
                      />
                      <div>
                        <p className={`text-sm font-semibold ${checked ? 'text-blue-700' : 'text-gray-800'}`}>
                          {cert.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{cert.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {certificaciones.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {certificaciones.map(c => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                    >
                      <Check className="h-3 w-3" />
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => router.push(`/dashboard/proveedores/${proveedorId}/informacion-bancaria`)}
            disabled={saving}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior: Bancaria
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
                  Siguiente: Documentos →
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
