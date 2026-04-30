'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  User,
  Mail,
  Phone,
  Info,
  Check,
} from 'lucide-react';
import { fetchProveedor, updateProveedor } from '@/lib/proveedores-api';

// ── Wizard ────────────────────────────────────────
const WIZARD_STEPS = [
  { num: 1, label: 'Datos Básicos' },
  { num: 2, label: 'Representante' },
  { num: 3, label: 'Sucursales' },
  { num: 4, label: 'Socios' },
  { num: 5, label: 'Tributario' },
  { num: 6, label: 'Bancario' },
  { num: 7, label: 'Experiencia' },
  { num: 8, label: 'Financiero' },
  { num: 9, label: 'Anexos' },
  { num: 10, label: 'Finalizar' },
];

const CURRENT_STEP = 2;

const TIPOS_DOCUMENTO = [
  { value: 'cc', label: 'Cédula de Ciudadanía (C.C.)' },
  { value: 'ce', label: 'Cédula de Extranjería (C.E.)' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'pep', label: 'Permiso Especial de Permanencia (PEP)' },
  { value: 'nit', label: 'NIT' },
];

// ── Types ─────────────────────────────────────────
interface FormData {
  nombreCompleto: string;
  tipoDoc: string;
  numDoc: string;
  telefono: string;
  email: string;
}

type ValidationErrors = Record<string, string>;

// ── Component ─────────────────────────────────────
export default function RepresentanteLegalPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    nombreCompleto: '',
    tipoDoc: '',
    numDoc: '',
    telefono: '',
    email: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [codigoProveedor, setCodigoProveedor] = useState('');

  // ── Cargar datos existentes ───────────────────
  useEffect(() => {
    (async () => {
      try {
        const prov = await fetchProveedor(id);
        setCodigoProveedor(prov.codigoProveedor || '');
        if (prov.repLegalNombres || prov.repLegalNumDoc) {
          const nombre = [prov.repLegalNombres, prov.repLegalApellidos]
            .filter(Boolean)
            .join(' ');
          setFormData({
            nombreCompleto: nombre,
            tipoDoc: prov.repLegalTipoDoc || '',
            numDoc: prov.repLegalNumDoc || '',
            telefono: prov.repLegalTelefono || '',
            email: prov.repLegalEmail || '',
          });
        }
      } catch {
        // Si falla la carga seguimos con el formulario vacío
      } finally {
        setLoadingData(false);
      }
    })();
  }, [id]);

  // ── Helpers ───────────────────────────────────
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.nombreCompleto.trim()) {
      newErrors.nombreCompleto = 'Nombre completo es obligatorio';
    }
    if (!formData.tipoDoc) {
      newErrors.tipoDoc = 'Tipo de documento es obligatorio';
    }
    if (!formData.numDoc.trim()) {
      newErrors.numDoc = 'Número de identificación es obligatorio';
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'Teléfono de contacto es obligatorio';
    } else if (!/^\+?[\d\s\-()]{7,20}$/.test(formData.telefono.trim())) {
      newErrors.telefono = 'Formato de teléfono inválido';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Correo electrónico es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de correo inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = (estadoOnboarding: string) => {
    const parts = formData.nombreCompleto.trim().split(/\s+/);
    const apellidos = parts.length > 1 ? parts.slice(-2).join(' ') : '';
    const nombres = parts.length > 1 ? parts.slice(0, -2).join(' ') || parts[0] : parts[0];
    return {
      repLegalNombres: nombres,
      repLegalApellidos: apellidos,
      repLegalTipoDoc: formData.tipoDoc,
      repLegalNumDoc: formData.numDoc,
      repLegalTelefono: formData.telefono,
      repLegalEmail: formData.email,
      estadoOnboarding,
    };
  };

  const handleGuardarBorrador = async () => {
    setApiError(null);
    try {
      setSaving(true);
      await updateProveedor(id, buildPayload('borrador'));
      setSuccessMsg('Borrador guardado correctamente.');
    } catch (error: any) {
      setApiError(error?.response?.data?.message || 'Error al guardar borrador.');
    } finally {
      setSaving(false);
    }
  };

  const handleContinuar = async () => {
    setApiError(null);
    if (!validateForm()) return;
    try {
      setSaving(true);
      await updateProveedor(id, buildPayload('en_proceso'));
      setSuccessMsg('Representante legal guardado. Continuando...');
      setTimeout(() => router.push(`/dashboard/proveedores/${id}/sucursales`), 1000);
    } catch (error: any) {
      setApiError(error?.response?.data?.message || 'Error al guardar el representante legal.');
    } finally {
      setSaving(false);
    }
  };

  // ── Styles ────────────────────────────────────
  const inputBase =
    'w-full rounded-lg border px-3 py-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors';
  const inputOk = 'border-gray-300 focus:border-blue-500 focus:ring-blue-100';
  const inputErr = 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50';

  const errMsg = (field: string) =>
    errors[field] ? (
      <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        {errors[field]}
      </p>
    ) : null;

  // ── Loading ───────────────────────────────────
  if (loadingData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top bar ── */}
      <header className="border-b bg-white px-6 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-sm font-bold text-white">P</span>
          </div>
          <span className="font-semibold text-gray-900">Portal de Proveedores</span>
          {codigoProveedor && (
            <span className="ml-auto rounded-full bg-blue-50 px-3 py-0.5 text-xs font-medium text-blue-700">
              {codigoProveedor}
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* ── Wizard progress ── */}
        <div className="mb-6 flex items-start gap-0">
          {WIZARD_STEPS.map((step, idx) => {
            const done = step.num < CURRENT_STEP;
            const active = step.num === CURRENT_STEP;
            const isLast = idx === WIZARD_STEPS.length - 1;
            return (
              <div key={step.num} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  {/* Circle */}
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors
                      ${done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'}`}
                  >
                    {done ? <Check className="h-4 w-4" /> : step.num}
                  </div>
                  {/* Connector */}
                  {!isLast && (
                    <div
                      className={`h-0.5 flex-1 transition-colors ${done ? 'bg-blue-600' : 'bg-gray-200'}`}
                    />
                  )}
                </div>
                {/* Label */}
                <p
                  className={`mt-1 max-w-[64px] text-center text-[10px] leading-tight ${active ? 'font-semibold text-blue-600' : done ? 'text-gray-500' : 'text-gray-400'}`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Success / Error banners ── */}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="ml-auto text-green-600 hover:text-green-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {apiError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{apiError}</span>
            <button onClick={() => setApiError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Form card ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="px-8 pt-8 pb-6">
            {/* Header */}
            <h1 className="text-xl font-bold text-gray-900">
              Información del Representante Legal
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Ingrese los datos de la persona física que actúa en nombre de la empresa.
            </p>

            {/* Info box */}
            <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Validación Requerida</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Según la normativa (RN-01), todo proveedor de tipo persona jurídica debe registrar
                  obligatoriamente un representante legal válido y con documento legal vigente.
                </p>
              </div>
            </div>

            {/* ── Fields ── */}
            <div className="mt-7 space-y-5">
              {/* Row 1: Tipo Doc + Num Doc */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Tipo de Documento */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tipo de Documento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipoDoc}
                    onChange={e => handleChange('tipoDoc', e.target.value)}
                    className={`${inputBase} ${errors.tipoDoc ? inputErr : inputOk} appearance-none`}
                  >
                    <option value="">Seleccione un tipo</option>
                    {TIPOS_DOCUMENTO.map(t => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {errMsg('tipoDoc')}
                </div>

                {/* Número de Identificación */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Número de Identificación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.numDoc}
                    onChange={e => handleChange('numDoc', e.target.value)}
                    placeholder="Ej. 1020304050"
                    className={`${inputBase} ${errors.numDoc ? inputErr : inputOk}`}
                  />
                  {errMsg('numDoc')}
                </div>
              </div>

              {/* Row 2: Nombre Completo */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.nombreCompleto}
                    onChange={e => handleChange('nombreCompleto', e.target.value)}
                    placeholder="Ingrese nombre y apellidos"
                    className={`${inputBase} pl-9 ${errors.nombreCompleto ? inputErr : inputOk}`}
                  />
                </div>
                {errMsg('nombreCompleto')}
              </div>

              {/* Row 3: Email + Teléfono */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Correo Electrónico */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => handleChange('email', e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className={`${inputBase} pl-9 ${errors.email ? inputErr : inputOk}`}
                    />
                  </div>
                  {errMsg('email')}
                </div>

                {/* Teléfono de Contacto */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Teléfono de Contacto <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={e =>
                        handleChange(
                          'telefono',
                          e.target.value.replace(/[^\d\s+()-]/g, ''),
                        )
                      }
                      placeholder="+57 300 000 0000"
                      maxLength={20}
                      className={`${inputBase} pl-9 ${errors.telefono ? inputErr : inputOk}`}
                    />
                  </div>
                  {errMsg('telefono')}
                  {!errors.telefono && (
                    <p className="mt-1 text-xs text-gray-400">
                      Incluya indicativo del país si es necesario.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer / Actions ── */}
          <div className="flex items-center justify-between border-t border-gray-100 px-8 py-5">
            <button
              onClick={() => router.push(`/dashboard/proveedores`)}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGuardarBorrador}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Borrador
              </button>

              <button
                onClick={handleContinuar}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Help link ── */}
        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Necesita ayuda con este proceso?{' '}
          <a href="#" className="font-medium text-blue-600 hover:underline">
            Consulte nuestra guía de registro
          </a>
        </p>

        {/* ── Page footer ── */}
        <p className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Sistema de Gestión de Proveedores. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
