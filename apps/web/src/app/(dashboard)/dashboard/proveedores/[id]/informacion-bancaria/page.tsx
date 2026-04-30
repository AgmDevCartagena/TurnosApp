'use client';

import { useState, useEffect } from 'react';
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
  CreditCard,
  Building2,
} from 'lucide-react';
import {
  fetchCuentasBancarias,
  createCuentaBancaria,
  updateCuentaBancaria,
  deleteCuentaBancaria,
  type CuentaBancaria,
  type CreateCuentaBancariaPayload,
} from '@/lib/cuentas-bancarias-api';
import { updateProveedor } from '@/lib/proveedores-api';

// ── Wizard ────────────────────────────────────────
const WIZARD_STEPS = [
  { num: 1, label: 'Básicos' },
  { num: 2, label: 'Representante' },
  { num: 3, label: 'Sucursales' },
  { num: 4, label: 'Socios' },
  { num: 5, label: 'Finanzas' },
  { num: 6, label: 'Bancaria' },
  { num: 7, label: 'Experiencia' },
];
const CURRENT_STEP = 6;

// ── Catálogos ─────────────────────────────────────
const TIPOS_CUENTA = [
  { value: 'ahorros', label: 'Cuenta de Ahorros' },
  { value: 'corriente', label: 'Cuenta Corriente' },
];

const BANCOS_CO = [
  'Bancolombia',
  'Banco de Bogotá',
  'Davivienda',
  'BBVA Colombia',
  'Banco Popular',
  'Banco de Occidente',
  'Banco Agrario',
  'Banco Caja Social',
  'Colpatria',
  'Banco Itaú Colombia',
  'Banco GNB Sudameris',
  'Banco Finandina',
  'Bancamía',
  'Otro',
];

const CONDICIONES_PAGO = [
  { value: 'contado', label: 'Contado' },
  { value: 'credito_15', label: 'Crédito 15 días' },
  { value: 'credito_mas_15', label: 'Crédito +15 días' },
];

// ── Form ──────────────────────────────────────────
interface ModalForm {
  titularCuenta: string;
  numeroCuenta: string;
  tipoCuenta: string;
  banco: string;
  ciudad: string;
  condicionPago: string;
}

const EMPTY_FORM: ModalForm = {
  titularCuenta: '',
  numeroCuenta: '',
  tipoCuenta: 'ahorros',
  banco: '',
  ciudad: '',
  condicionPago: 'contado',
};

type ModalErrors = Record<string, string>;

// ── Component ─────────────────────────────────────
export default function InformacionBancariaPage() {
  const { id: proveedorId } = useParams<{ id: string }>();
  const router = useRouter();

  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModalForm>(EMPTY_FORM);
  const [modalErrors, setModalErrors] = useState<ModalErrors>({});
  const [modalSaving, setModalSaving] = useState(false);

  // ── Load ─────────────────────────────────────
  useEffect(() => {
    fetchCuentasBancarias(proveedorId)
      .then(setCuentas)
      .catch(() => setApiError('Error al cargar las cuentas bancarias. Recargue la página.'))
      .finally(() => setLoading(false));
  }, [proveedorId]);

  // ── Modal helpers ─────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalErrors({});
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (c: CuentaBancaria) => {
    setForm({
      titularCuenta: c.titularCuenta,
      numeroCuenta: c.numeroCuenta,
      tipoCuenta: c.tipoCuenta,
      banco: c.banco,
      ciudad: c.ciudad,
      condicionPago: c.condicionPago,
    });
    setModalErrors({});
    setEditingId(c.id);
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

  // ── Validation ───────────────────────────────
  const validateModal = (): boolean => {
    const errs: ModalErrors = {};

    if (!form.titularCuenta.trim()) {
      errs.titularCuenta = 'Titular de cuenta es obligatorio (RF-02)';
    } else if (form.titularCuenta.length > 150) {
      errs.titularCuenta = 'Máximo 150 caracteres';
    }

    if (!form.numeroCuenta.trim()) {
      errs.numeroCuenta = 'Número de cuenta es obligatorio (RF-03)';
    } else if (!/^\d+$/.test(form.numeroCuenta)) {
      errs.numeroCuenta = 'Solo se permiten dígitos, sin espacios (RN-02)';
    } else if (form.numeroCuenta.length > 20) {
      errs.numeroCuenta = 'Máximo 20 dígitos';
    }

    if (!form.tipoCuenta) errs.tipoCuenta = 'Tipo de cuenta es obligatorio';
    if (!form.banco) errs.banco = 'Banco es obligatorio (RF-05)';
    if (!form.ciudad.trim()) errs.ciudad = 'Ciudad es obligatoria (RF-06)';
    if (!form.condicionPago) errs.condicionPago = 'Condición de pago es obligatoria (RF-07)';

    setModalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGuardarCuenta = async () => {
    if (!validateModal()) return;
    setModalSaving(true);
    const payload: CreateCuentaBancariaPayload = {
      titularCuenta: form.titularCuenta.trim(),
      numeroCuenta: form.numeroCuenta.trim(),
      tipoCuenta: form.tipoCuenta,
      banco: form.banco,
      ciudad: form.ciudad.trim(),
      condicionPago: form.condicionPago,
    };
    try {
      if (editingId) {
        const updated = await updateCuentaBancaria(proveedorId, editingId, payload);
        setCuentas(prev => prev.map(c => (c.id === editingId ? updated : c)));
        setSuccessMsg('Cuenta actualizada correctamente.');
      } else {
        const created = await createCuentaBancaria(proveedorId, payload);
        setCuentas(prev => [...prev, created]);
        setSuccessMsg('Cuenta bancaria registrada correctamente.');
      }
      closeModal();
    } catch (e: any) {
      setModalErrors({ _api: e?.response?.data?.message || 'Error al guardar la cuenta.' });
    } finally {
      setModalSaving(false);
    }
  };

  const handleDelete = async (c: CuentaBancaria) => {
    if (
      !confirm(
        `¿Eliminar la cuenta ${c.tipoCuenta === 'ahorros' ? 'de ahorros' : 'corriente'} N° ${c.numeroCuenta} (${c.banco})? Esta acción no se puede deshacer.`,
      )
    )
      return;
    try {
      await deleteCuentaBancaria(proveedorId, c.id);
      setCuentas(prev => prev.filter(x => x.id !== c.id));
      setSuccessMsg('Cuenta eliminada.');
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Error al eliminar la cuenta.');
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

  const handleSiguiente = async () => {
    if (cuentas.length === 0) {
      setApiError('Debe registrar al menos una cuenta bancaria antes de continuar (RN-01).');
      return;
    }
    setApiError(null);
    setSaving(true);
    try {
      await updateProveedor(proveedorId, { estadoOnboarding: 'en_proceso' });
      router.push(`/dashboard/proveedores/${proveedorId}/experiencia`);
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ───────────────────────────────────
  const tipoCuentaLabel = (val: string) =>
    TIPOS_CUENTA.find(t => t.value === val)?.label ?? val;

  const condicionLabel = (val: string) =>
    CONDICIONES_PAGO.find(c => c.value === val)?.label ?? val;

  const condicionColor = (val: string) => {
    if (val === 'contado') return 'bg-green-50 text-green-700';
    if (val === 'credito_15') return 'bg-amber-50 text-amber-700';
    return 'bg-blue-50 text-blue-700';
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
          <div className="flex items-start justify-between px-8 py-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Información Bancaria</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Registre al menos una cuenta bancaria para completar el registro del proveedor.
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Agregar Cuenta
            </button>
          </div>

          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Titular</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">N° Cuenta</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Banco</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Ciudad</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Condición Pago</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <CreditCard className="h-8 w-8" />
                        <p className="text-sm">No hay cuentas registradas. Haga clic en "Agregar Cuenta" para comenzar.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cuentas.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800 max-w-[160px] truncate" title={c.titularCuenta}>
                        {c.titularCuenta}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-gray-600">
                        {'•'.repeat(Math.max(0, c.numeroCuenta.length - 4))}{c.numeroCuenta.slice(-4)}
                      </td>
                      <td className="px-4 py-4 text-gray-600">{tipoCuentaLabel(c.tipoCuenta)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          {c.banco}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{c.ciudad}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${condicionColor(c.condicionPago)}`}>
                          {condicionLabel(c.condicionPago)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(c)}
                            className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
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

        {/* ── Footer ── */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => router.push(`/dashboard/proveedores/${proveedorId}/finanzas`)}
            disabled={saving}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior: Finanzas
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
                <>
                  Siguiente: Experiencia <ArrowRight className="h-4 w-4" />
                </>
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
                {editingId ? 'Editar Cuenta Bancaria' : 'Registrar Cuenta Bancaria'}
              </h3>
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

              {/* Titular */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Titular de Cuenta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.titularCuenta}
                  onChange={e => handleChange('titularCuenta', e.target.value)}
                  placeholder="Nombre del titular"
                  maxLength={150}
                  className={`${inputBase} ${modalErrors.titularCuenta ? inputErr : inputOk}`}
                />
                {errMsg('titularCuenta')}
              </div>

              {/* Número + Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Número de Cuenta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.numeroCuenta}
                    onChange={e => handleChange('numeroCuenta', e.target.value.replace(/\D/g, ''))}
                    placeholder="Solo dígitos"
                    maxLength={20}
                    className={`${inputBase} font-mono ${modalErrors.numeroCuenta ? inputErr : inputOk}`}
                  />
                  {errMsg('numeroCuenta')}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tipo de Cuenta <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.tipoCuenta}
                    onChange={e => handleChange('tipoCuenta', e.target.value)}
                    className={`${inputBase} appearance-none ${modalErrors.tipoCuenta ? inputErr : inputOk}`}
                  >
                    {TIPOS_CUENTA.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {errMsg('tipoCuenta')}
                </div>
              </div>

              {/* Banco + Ciudad */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Banco <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.banco}
                    onChange={e => handleChange('banco', e.target.value)}
                    className={`${inputBase} appearance-none ${modalErrors.banco ? inputErr : inputOk}`}
                  >
                    <option value="">Seleccione banco...</option>
                    {BANCOS_CO.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {errMsg('banco')}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Ciudad <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.ciudad}
                    onChange={e => handleChange('ciudad', e.target.value)}
                    placeholder="Ciudad de la cuenta"
                    maxLength={100}
                    className={`${inputBase} ${modalErrors.ciudad ? inputErr : inputOk}`}
                  />
                  {errMsg('ciudad')}
                </div>
              </div>

              {/* Condición de Pago — radio buttons */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Condición de Pago <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  {CONDICIONES_PAGO.map(cp => (
                    <label
                      key={cp.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                        form.condicionPago === cp.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="condicionPago"
                        value={cp.value}
                        checked={form.condicionPago === cp.value}
                        onChange={() => handleChange('condicionPago', cp.value)}
                        className="accent-blue-600"
                      />
                      <div>
                        <p className={`text-sm font-medium ${form.condicionPago === cp.value ? 'text-blue-700' : 'text-gray-700'}`}>
                          {cp.label}
                        </p>
                        {cp.value === 'contado' && (
                          <p className="text-xs text-gray-400">Sin plazo de vencimiento</p>
                        )}
                        {cp.value === 'credito_15' && (
                          <p className="text-xs text-gray-400">Vencimiento: fecha documento + 15 días</p>
                        )}
                        {cp.value === 'credito_mas_15' && (
                          <p className="text-xs text-gray-400">Plazo configurado por parametrización</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                {errMsg('condicionPago')}
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
                onClick={handleGuardarCuenta}
                disabled={modalSaving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {modalSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar Cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
