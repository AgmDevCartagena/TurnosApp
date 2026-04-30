'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Check,
  Phone,
} from 'lucide-react';
import {
  fetchSucursales,
  createSucursal,
  updateSucursal,
  deleteSucursal,
  type Sucursal,
  type CreateSucursalPayload,
} from '@/lib/sucursales-api';
import { fetchPaises, fetchCiudades } from '@/lib/ubicaciones-api';
import type { Pais, Ciudad } from '@/lib/ubicaciones-api';
import { updateProveedor } from '@/lib/proveedores-api';

// ── Wizard ────────────────────────────────────────
const WIZARD_STEPS = [
  { num: 1, label: 'Básicos' },
  { num: 2, label: 'Representante' },
  { num: 3, label: 'Sucursales' },
  { num: 4, label: 'Socios' },
  { num: 5, label: 'Finanzas' },
];
const CURRENT_STEP = 3;

// ── Modal form types ───────────────────────────────
interface ModalForm {
  direccion: string;
  paisId: string;
  ciudadNombre: string;
  contacto: string;
  telefono: string;
  fax: string;
}

const EMPTY_FORM: ModalForm = {
  direccion: '',
  paisId: '',
  ciudadNombre: '',
  contacto: '',
  telefono: '',
  fax: '',
};

type ModalErrors = Record<string, string>;

// ── Component ─────────────────────────────────────
export default function SucursalesPage() {
  const { id: proveedorId } = useParams<{ id: string }>();
  const router = useRouter();

  // ── List state
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModalForm>(EMPTY_FORM);
  const [modalErrors, setModalErrors] = useState<ModalErrors>({});
  const [modalSaving, setModalSaving] = useState(false);

  // ── Location data
  const [paises, setPaises] = useState<Pais[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [loadingCiudades, setLoadingCiudades] = useState(false);

  // ── Load sucursales and paises ─────────────────
  useEffect(() => {
    Promise.all([fetchSucursales(proveedorId), fetchPaises()])
      .then(([suc, paises]) => {
        setSucursales(suc);
        setPaises(paises);
      })
      .catch(() => setApiError('Error al cargar los datos. Recargue la página.'))
      .finally(() => setLoading(false));
  }, [proveedorId]);

  // ── Cascade: pais → ciudades ───────────────────
  useEffect(() => {
    if (!form.paisId) {
      setCiudades([]);
      setForm(prev => ({ ...prev, ciudadNombre: '' }));
      return;
    }
    setLoadingCiudades(true);
    fetchCiudades(form.paisId)
      .then(setCiudades)
      .catch(() => setCiudades([]))
      .finally(() => setLoadingCiudades(false));
  }, [form.paisId]);

  // ── Modal helpers ─────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalErrors({});
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (s: Sucursal) => {
    const paisMatch = paises.find(p => p.nombre === s.pais);
    setForm({
      direccion: s.direccion,
      paisId: paisMatch?.id ?? '',
      ciudadNombre: s.ciudad,
      contacto: s.contacto,
      telefono: s.telefono,
      fax: s.fax ?? '',
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

  const handleFormChange = (field: keyof ModalForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (modalErrors[field]) {
      setModalErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateModal = (): boolean => {
    const errs: ModalErrors = {};
    if (!form.direccion.trim()) errs.direccion = 'Dirección es obligatoria';
    if (!form.ciudadNombre.trim()) errs.ciudadNombre = 'Ciudad es obligatoria';
    if (!form.contacto.trim()) {
      errs.contacto = 'Nombre del contacto es obligatorio';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(form.contacto)) {
      errs.contacto = 'Solo letras y espacios';
    }
    if (!form.telefono.trim()) {
      errs.telefono = 'Teléfono es obligatorio';
    } else if (!/^\+?[\d\s\-()]{7,20}$/.test(form.telefono.trim())) {
      errs.telefono = 'Formato de teléfono inválido';
    }
    if (form.fax.trim() && !/^\+?[\d\s\-()]{7,20}$/.test(form.fax.trim())) {
      errs.fax = 'Formato de fax inválido';
    }
    setModalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = (): CreateSucursalPayload => {
    const paisNombre = paises.find(p => p.id === form.paisId)?.nombre ?? '';
    return {
      direccion: form.direccion.trim(),
      ciudad: form.ciudadNombre.trim(),
      pais: paisNombre || undefined,
      contacto: form.contacto.trim(),
      telefono: form.telefono.trim(),
      fax: form.fax.trim() || undefined,
    };
  };

  const handleGuardarSucursal = async () => {
    if (!validateModal()) return;
    setModalSaving(true);
    try {
      if (editingId) {
        const updated = await updateSucursal(proveedorId, editingId, buildPayload());
        setSucursales(prev => prev.map(s => (s.id === editingId ? updated : s)));
        setSuccessMsg('Sucursal actualizada correctamente.');
      } else {
        const created = await createSucursal(proveedorId, buildPayload());
        setSucursales(prev => [...prev, created]);
        setSuccessMsg('Sucursal agregada correctamente.');
      }
      closeModal();
    } catch (e: any) {
      setModalErrors({ _api: e?.response?.data?.message || 'Error al guardar la sucursal.' });
    } finally {
      setModalSaving(false);
    }
  };

  const handleDelete = async (s: Sucursal) => {
    if (!confirm(`¿Eliminar ${`Sucursal ${s.numero}`}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteSucursal(proveedorId, s.id);
      setSucursales(prev => prev.filter(x => x.id !== s.id));
      setSuccessMsg('Sucursal eliminada.');
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Error al eliminar la sucursal.');
    }
  };

  // ── Navigation ────────────────────────────────
  const handleGuardarBorrador = async () => {
    setApiError(null);
    try {
      setSaving(true);
      await updateProveedor(proveedorId, { estadoOnboarding: 'borrador' });
      setSuccessMsg('Borrador guardado correctamente.');
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Error al guardar borrador.');
    } finally {
      setSaving(false);
    }
  };

  const handleSiguiente = async () => {
    if (sucursales.length === 0) {
      setApiError('Debe registrar al menos una sucursal antes de continuar (RN-01).');
      return;
    }
    setApiError(null);
    try {
      setSaving(true);
      await updateProveedor(proveedorId, { estadoOnboarding: 'en_proceso' });
      router.push(`/dashboard/proveedores/${proveedorId}/socios`);
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Error al avanzar al siguiente paso.');
    } finally {
      setSaving(false);
    }
  };

  // ── Styles ────────────────────────────────────
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

        {/* ── Wizard header ── */}
        <div className="mb-8 flex items-start gap-0">
          {WIZARD_STEPS.map((step, idx) => {
            const done = step.num < CURRENT_STEP;
            const active = step.num === CURRENT_STEP;
            const isLast = idx === WIZARD_STEPS.length - 1;
            return (
              <div key={step.num} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold border-2 transition-colors
                      ${done ? 'border-blue-600 bg-blue-600 text-white' : active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-400'}`}
                  >
                    {done ? <Check className="h-4 w-4" /> : step.num}
                  </div>
                  {!isLast && (
                    <div
                      className={`h-0.5 flex-1 transition-colors ${done ? 'bg-blue-600' : 'bg-gray-200'}`}
                    />
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
            <button onClick={() => setSuccessMsg(null)}>
              <X className="h-4 w-4 text-green-600" />
            </button>
          </div>
        )}
        {apiError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{apiError}</span>
            <button onClick={() => setApiError(null)}>
              <X className="h-4 w-4 text-red-600" />
            </button>
          </div>
        )}

        {/* ── Main card ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Card header */}
          <div className="flex items-start justify-between px-8 py-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Sucursales y Sedes</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Registre al menos una sucursal o sede principal para el proveedor.
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Agregar Sucursal
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">ID</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Dirección</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Ciudad</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Contacto</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Teléfono</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Fax</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sucursales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                      No hay sucursales registradas. Haga clic en &quot;Agregar Sucursal&quot; para comenzar.
                    </td>
                  </tr>
                ) : (
                  sucursales.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-700">Sucursal {s.numero}</td>
                      <td className="px-4 py-4 text-gray-600 max-w-[200px] truncate" title={s.direccion}>{s.direccion}</td>
                      <td className="px-4 py-4 text-gray-600">{s.ciudad}</td>
                      <td className="px-4 py-4 text-gray-600">{s.contacto}</td>
                      <td className="px-4 py-4 text-gray-600">{s.telefono}</td>
                      <td className="px-4 py-4 text-gray-400 italic">{s.fax || 'No aplica'}</td>
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
            </table>
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => router.push(`/dashboard/proveedores/${proveedorId}/representante-legal`)}
            disabled={saving}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior: Representante Legal
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGuardarBorrador}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> : null}
              Guardar Borrador
            </button>

            <button
              onClick={handleSiguiente}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Siguiente: Socios <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                {editingId ? 'Editar Sucursal' : 'Registrar Nueva Sucursal'}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-4 px-6 py-5">
              {/* API error */}
              {modalErrors._api && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {modalErrors._api}
                </div>
              )}

              {/* Dirección */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Dirección <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={e => handleFormChange('direccion', e.target.value)}
                  placeholder="Ej: Calle 45 # 12-34 Interior 5"
                  className={`${inputBase} ${modalErrors.direccion ? inputErr : inputOk}`}
                />
                {!modalErrors.direccion && (
                  <p className="mt-1 text-xs text-blue-600">
                    Se permiten caracteres alfanuméricos y especiales de direcciones.
                  </p>
                )}
                {errMsg('direccion')}
              </div>

              {/* País + Ciudad */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    País <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.paisId}
                    onChange={e => handleFormChange('paisId', e.target.value)}
                    className={`${inputBase} appearance-none ${inputOk}`}
                  >
                    <option value="">Seleccione...</option>
                    {paises.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Ciudad <span className="text-red-500">*</span>
                  </label>
                  {ciudades.length > 0 ? (
                    <select
                      value={form.ciudadNombre}
                      onChange={e => handleFormChange('ciudadNombre', e.target.value)}
                      className={`${inputBase} appearance-none ${modalErrors.ciudadNombre ? inputErr : inputOk}`}
                      disabled={loadingCiudades}
                    >
                      <option value="">Seleccione...</option>
                      {ciudades.map(c => (
                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form.ciudadNombre}
                      onChange={e => handleFormChange('ciudadNombre', e.target.value)}
                      placeholder={form.paisId ? 'Ingrese la ciudad' : 'Seleccione país primero...'}
                      className={`${inputBase} ${modalErrors.ciudadNombre ? inputErr : inputOk}`}
                    />
                  )}
                  {errMsg('ciudadNombre')}
                </div>
              </div>

              {/* Contacto + Teléfono */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Nombre del Contacto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.contacto}
                    onChange={e => handleFormChange('contacto', e.target.value)}
                    placeholder="Solo letras y espacios"
                    className={`${inputBase} ${modalErrors.contacto ? inputErr : inputOk}`}
                  />
                  {errMsg('contacto')}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Teléfono <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={form.telefono}
                      onChange={e =>
                        handleFormChange('telefono', e.target.value.replace(/[^\d\s+()-]/g, ''))
                      }
                      placeholder="+57 300 000 0000"
                      maxLength={20}
                      className={`${inputBase} pl-9 ${modalErrors.telefono ? inputErr : inputOk}`}
                    />
                  </div>
                  {errMsg('telefono')}
                </div>
              </div>

              {/* Fax */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Fax <span className="text-xs text-gray-400">(Opcional)</span>
                </label>
                <input
                  type="tel"
                  value={form.fax}
                  onChange={e =>
                    handleFormChange('fax', e.target.value.replace(/[^\d\s+()-]/g, ''))
                  }
                  placeholder="Número de fax"
                  maxLength={20}
                  className={`${inputBase} ${modalErrors.fax ? inputErr : inputOk}`}
                />
                {errMsg('fax')}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={closeModal}
                disabled={modalSaving}
                className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarSucursal}
                disabled={modalSaving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {modalSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar Sucursal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
