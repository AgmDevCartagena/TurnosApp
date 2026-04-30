'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { createProveedor, validateNit, validateEmail } from '@/lib/proveedores-api';
import { fetchPaises, fetchDepartamentos, fetchCiudades } from '@/lib/ubicaciones-api';
import type { Pais, Departamento, Ciudad } from '@/lib/ubicaciones-api';

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

interface FormData {
  tipoPersona: 'juridica' | 'natural';
  razonSocial: string;
  nombreCompleto: string;
  tipoIdentificacion: string;
  nit: string;
  emailCorporativo: string;
  telefono: string;
  direccion: string;
  paisId: string;
  departamentoId: string;
  ciudadId: string;
  tipoEmpresa: string;
  fechaConstitucion: string;
  tipoProveedor: string;
}

type ValidationErrors = Record<string, string>;

export default function DatosBasicosPage() {
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    tipoPersona: 'juridica',
    razonSocial: '',
    nombreCompleto: '',
    tipoIdentificacion: 'nit',
    nit: '',
    emailCorporativo: '',
    telefono: '',
    direccion: '',
    paisId: '',
    departamentoId: '',
    ciudadId: '',
    tipoEmpresa: '',
    fechaConstitucion: '',
    tipoProveedor: 'nacional',
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Ubicaciones state
  const [paises, setPaises] = useState<Pais[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);

  // UI state
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [codigoGenerado, setCodigoGenerado] = useState<string>('');
  
  // Validation state
  const [nitValidating, setNitValidating] = useState(false);
  const [nitAvailable, setNitAvailable] = useState<boolean | null>(null);
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    loadPaises();
  }, []);

  useEffect(() => {
    if (formData.paisId) {
      loadDepartamentos(formData.paisId);
      setFormData(prev => ({ ...prev, departamentoId: '', ciudadId: '' }));
    }
  }, [formData.paisId]);

  useEffect(() => {
    if (formData.departamentoId) {
      loadCiudades(formData.departamentoId);
      setFormData(prev => ({ ...prev, ciudadId: '' }));
    }
  }, [formData.departamentoId]);

  const loadPaises = async () => {
    try {
      setLoading(true);
      const data = await fetchPaises();
      setPaises(data);
      
      // Auto-seleccionar Colombia si existe
      const colombia = data.find(p => p.codigo === 'CO');
      if (colombia) {
        setFormData(prev => ({ ...prev, paisId: colombia.id }));
      }
    } catch (error) {
      console.error('Error al cargar países:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartamentos = async (paisId: string) => {
    try {
      const data = await fetchDepartamentos(paisId);
      setDepartamentos(data);
    } catch (error) {
      console.error('Error al cargar departamentos:', error);
    }
  };

  const loadCiudades = async (departamentoId: string) => {
    try {
      const data = await fetchCiudades(departamentoId);
      setCiudades(data);
    } catch (error) {
      console.error('Error al cargar ciudades:', error);
    }
  };

  const handleNitBlur = async () => {
    if (!formData.nit || formData.nit.length < 5) return;
    
    try {
      setNitValidating(true);
      const result = await validateNit(formData.nit);
      setNitAvailable(result.available);
      
      if (!result.available) {
        setErrors(prev => ({ ...prev, nit: 'Este NIT ya está registrado' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.nit;
          return newErrors;
        });
      }
    } catch (error) {
      console.error('Error validando NIT:', error);
    } finally {
      setNitValidating(false);
    }
  };

  const handleEmailBlur = async () => {
    if (!formData.emailCorporativo) return;
    
    try {
      setEmailValidating(true);
      const result = await validateEmail(formData.emailCorporativo);
      setEmailAvailable(result.available);
      
      if (!result.available) {
        setErrors(prev => ({ ...prev, emailCorporativo: 'Este email ya está registrado' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.emailCorporativo;
          return newErrors;
        });
      }
    } catch (error) {
      console.error('Error validando email:', error);
    } finally {
      setEmailValidating(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validar según tipo de persona
    if (formData.tipoPersona === 'juridica') {
      if (!formData.razonSocial.trim()) {
        newErrors.razonSocial = 'Razón social es obligatoria';
      }
    } else {
      if (!formData.nombreCompleto.trim()) {
        newErrors.nombreCompleto = 'Nombre completo es obligatorio';
      }
    }

    if (!formData.nit.trim()) {
      newErrors.nit = 'Número de identificación es obligatorio';
    }

    if (!formData.emailCorporativo.trim()) {
      newErrors.emailCorporativo = 'Correo electrónico es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailCorporativo)) {
      newErrors.emailCorporativo = 'Formato de correo inválido';
    }

    if (!formData.paisId) {
      newErrors.paisId = 'País es obligatorio';
    }

    // Fecha de constitución: obligatoria para jurídica
    if (formData.tipoPersona === 'juridica' && !formData.fechaConstitucion) {
      newErrors.fechaConstitucion = 'Fecha de constitución es obligatoria para Persona Jurídica';
    }
    if (formData.fechaConstitucion) {
      const fecha = new Date(formData.fechaConstitucion);
      if (fecha > new Date()) {
        newErrors.fechaConstitucion = 'La fecha no puede ser futura';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGuardarBorrador = async () => {
    setApiError(null);
    try {
      setSaving(true);
      const dataToSend: any = {
        ...formData,
        telefono: formData.telefono || '000',
        direccion: formData.direccion || 'Pendiente',
        estadoOnboarding: 'borrador',
        estadoOperativo: 'inactivo',
      };
      if (formData.tipoPersona === 'juridica') {
        delete dataToSend.nombreCompleto;
      } else {
        delete dataToSend.razonSocial;
        if (!dataToSend.tipoEmpresa) dataToSend.tipoEmpresa = 'persona_natural';
      }
      if (dataToSend.tipoEmpresa === '') delete dataToSend.tipoEmpresa;
      const proveedor = await createProveedor(dataToSend);
      setCodigoGenerado(proveedor.codigoProveedor || '');
      setSuccessMsg(`Borrador guardado. Código: ${proveedor.codigoProveedor}`);
      setTimeout(() => router.push('/dashboard/proveedores'), 1500);
    } catch (error: any) {
      setApiError(error?.response?.data?.message || 'Error al guardar borrador');
    } finally {
      setSaving(false);
    }
  };

  const handleSiguientePaso = async () => {
    setApiError(null);
    if (!validateForm()) return;
    if (nitAvailable === false) {
      setApiError('El NIT ingresado ya está registrado en el sistema.');
      return;
    }
    if (emailAvailable === false) {
      setApiError('El correo electrónico ya está registrado en el sistema.');
      return;
    }
    try {
      setSaving(true);
      const dataToSend: any = {
        ...formData,
        telefono: formData.telefono || '000',
        direccion: formData.direccion || 'Pendiente',
        estadoOnboarding: 'en_proceso',
        estadoOperativo: 'inactivo',
      };
      if (formData.tipoPersona === 'juridica') {
        delete dataToSend.nombreCompleto;
      } else {
        delete dataToSend.razonSocial;
        if (!dataToSend.tipoEmpresa) dataToSend.tipoEmpresa = 'persona_natural';
      }
      if (dataToSend.tipoEmpresa === '') delete dataToSend.tipoEmpresa;
      const proveedor = await createProveedor(dataToSend);
      setCodigoGenerado(proveedor.codigoProveedor || '');
      setSuccessMsg(`Proveedor creado. Código: ${proveedor.codigoProveedor}`);
      setTimeout(() => router.push(`/dashboard/proveedores/${proveedor.id}/representante-legal`), 1200);
    } catch (error: any) {
      setApiError(error?.response?.data?.message || 'Error al registrar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  // ── helpers ──────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const registroDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const inputBase = 'w-full rounded-lg border px-3 py-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors';
  const inputOk = `${inputBase} border-gray-300 focus:border-teal-500 focus:ring-teal-500/20`;
  const inputErr = `${inputBase} border-red-400 focus:border-red-500 focus:ring-red-500/20`;
  const inp = (field: string) => (errors[field] ? inputErr : inputOk);
  const labelCls = 'mb-1.5 block text-sm font-medium text-gray-700';

  const nameField = formData.tipoPersona === 'juridica' ? 'razonSocial' : 'nombreCompleto';
  const nameValue = formData.tipoPersona === 'juridica' ? formData.razonSocial : formData.nombreCompleto;

  return (
    <div className="min-h-screen space-y-6 px-2 py-4 sm:px-0">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/proveedores')}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Portal de Proveedores</h1>
          <p className="text-xs text-gray-500">Registro y gestión de proveedores</p>
        </div>
      </div>

      {/* Wizard steps */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-start gap-0">
          {WIZARD_STEPS.map((step, idx) => {
            const isActive = step.num === 1;
            const isCompleted = step.num < 1;
            return (
              <div key={step.num} className="flex items-start">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                      isActive
                        ? 'border-teal-500 bg-teal-500 text-white'
                        : isCompleted
                          ? 'border-teal-500 bg-teal-500 text-white'
                          : 'border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : step.num}
                  </div>
                  <span
                    className={`mt-1 max-w-[64px] text-center text-[10px] leading-tight ${
                      isActive ? 'font-semibold text-teal-600' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < WIZARD_STEPS.length - 1 && (
                  <div className="mt-4 h-0.5 w-10 bg-gray-200" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* API error/success banners */}
      {apiError && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {apiError}
          </div>
          <button onClick={() => setApiError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main form card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Paso 1: Datos Básicos del Proveedor
            </h2>
            <p className="text-xs text-gray-500">
              Complete la información general para iniciar el registro.
            </p>
          </div>
          <span className="rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
            En proceso
          </span>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Row 1: Tipo de Persona | Número de Identificación */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Tipo de Persona – button toggle */}
            <div>
              <label className={labelCls}>
                Tipo de Persona <span className="text-red-500">*</span>
              </label>
              <div className="flex overflow-hidden rounded-lg border border-gray-300">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      tipoPersona: 'juridica',
                      tipoIdentificacion: 'nit',
                    }))
                  }
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    formData.tipoPersona === 'juridica'
                      ? 'bg-teal-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Jurídica
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      tipoPersona: 'natural',
                      tipoIdentificacion: 'cc',
                    }))
                  }
                  className={`flex-1 border-l border-gray-300 py-2.5 text-sm font-medium transition-colors ${
                    formData.tipoPersona === 'natural'
                      ? 'bg-teal-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Natural
                </button>
              </div>
            </div>

            {/* Número de Identificación */}
            <div>
              <label className={labelCls}>
                Número de Identificación ({formData.tipoPersona === 'juridica' ? 'NIT' : 'CC'}){' '}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.nit}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, nit: e.target.value }));
                    setNitAvailable(null);
                  }}
                  onBlur={handleNitBlur}
                  placeholder={formData.tipoPersona === 'juridica' ? 'Ej: 900.123.456-1' : 'Ej: 1234567890'}
                  className={inp('nit')}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {nitValidating && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  {!nitValidating && nitAvailable === true && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {!nitValidating && nitAvailable === false && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                El número debe ser único en nuestra base de datos.
              </p>
              {errors.nit && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.nit}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Razón Social | Email Corporativo */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                {formData.tipoPersona === 'juridica' ? 'Razón Social' : 'Nombre Completo'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nameValue}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, [nameField]: e.target.value }))
                }
                placeholder={
                  formData.tipoPersona === 'juridica'
                    ? 'Nombre legal de la empresa'
                    : 'Nombre completo de la persona'
                }
                className={inp(nameField)}
              />
              {errors[nameField] && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors[nameField]}
                </p>
              )}
            </div>

            <div>
              <label className={labelCls}>
                Correo Electrónico Corporativo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.emailCorporativo}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, emailCorporativo: e.target.value }));
                    setEmailAvailable(null);
                  }}
                  onBlur={handleEmailBlur}
                  placeholder="ejemplo@empresa.com"
                  className={inp('emailCorporativo')}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {emailValidating && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  {!emailValidating && emailAvailable === true && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {!emailValidating && emailAvailable === false && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              {errors.emailCorporativo && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.emailCorporativo}
                </p>
              )}
            </div>
          </div>

          {/* Row 3: Fecha de Constitución | País */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                Fecha de Constitución{' '}
                {formData.tipoPersona === 'juridica' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="date"
                value={formData.fechaConstitucion}
                onChange={(e) => setFormData((p) => ({ ...p, fechaConstitucion: e.target.value }))}
                max={today}
                className={inp('fechaConstitucion')}
              />
              <p className="mt-1 text-[11px] text-gray-400">No se permiten fechas futuras.</p>
              {errors.fechaConstitucion && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.fechaConstitucion}
                </p>
              )}
            </div>

            <div>
              <label className={labelCls}>
                País <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.paisId}
                onChange={(e) => setFormData((p) => ({ ...p, paisId: e.target.value }))}
                disabled={loading}
                className={`${inp('paisId')} appearance-none`}
              >
                <option value="">Seleccione un país</option>
                {paises.map((pais) => (
                  <option key={pais.id} value={pais.id}>
                    {pais.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Departamento | Ciudad */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                Departamento / Estado <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.departamentoId}
                onChange={(e) => setFormData((p) => ({ ...p, departamentoId: e.target.value }))}
                disabled={!formData.paisId || departamentos.length === 0}
                className={`${inp('departamentoId')} appearance-none`}
              >
                <option value="">
                  {formData.paisId ? 'Seleccione un departamento' : 'Filtrado por país...'}
                </option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>
                Ciudad <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.ciudadId}
                onChange={(e) => setFormData((p) => ({ ...p, ciudadId: e.target.value }))}
                disabled={!formData.departamentoId || ciudades.length === 0}
                className={`${inp('ciudadId')} appearance-none`}
              >
                <option value="">
                  {formData.departamentoId
                    ? 'Seleccione una ciudad'
                    : 'Filtrado por departamento...'}
                </option>
                {ciudades.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Card footer: registro date + estado */}
          <div className="flex items-center gap-4 border-t border-gray-100 pt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span>📅</span> Registro: {registroDate}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              Estado inicial:{' '}
              <span className="font-medium text-green-600">Activo</span>
            </span>
            {codigoGenerado && (
              <span className="ml-auto font-mono font-semibold text-teal-600">
                {codigoGenerado}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Requerimientos del Paso */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
          <AlertCircle className="h-4 w-4" /> Requerimientos del Paso
        </p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-xs text-amber-700 sm:grid-cols-2">
          <span>• Todos los campos con (*) son obligatorios.</span>
          <span>• El NIT debe ser único y sin puntos si no se requiere.</span>
          <span>• La fecha de constitución es obligatoria para Personas Jurídicas.</span>
          <span>• El correo debe ser institucional.</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push('/dashboard/proveedores')}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <X className="h-4 w-4" /> Cancelar
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleGuardarBorrador}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Borrador'}
          </button>

          <button
            type="button"
            onClick={handleSiguientePaso}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Siguiente Paso'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
