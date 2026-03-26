'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Proveedor } from '@/lib/proveedores-api';
import {
  Building2,
  Briefcase,
  UserCircle,
  Zap,
  FileText,
  Clock,
  Star,
  Package,
  Loader2,
  X,
  Save,
  ArrowLeft,
  Check,
  Plus,
  BarChart3,
  Pencil,
  Send,
  ShoppingBag,
  Trash2,
  Phone,
  Receipt,
  FolderOpen,
  Upload,
  CheckCircle2,
  Info,
  Shield,
  Landmark,
  CreditCard,
  Award,
  Download,
  FileSpreadsheet,
  Users2,
  TrendingUp,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────
interface ProveedorFormData {
  tipoProveedor: string;
  tipoPersona: string;
  razonSocial: string;
  tipoIdentificacion: string;
  nit: string;
  direccion: string;
  departamento: string;
  ciudad: string;
  telefono: string;
  emailCorporativo: string;
  tipoEmpresa: string;
  fechaConstitucion: string;
  codigoCiiu: string;
  descripcionActividad: string;
  certificaciones: string[];
  observaciones: string;
  repLegalNombres: string;
  repLegalApellidos: string;
  repLegalTipoDoc: string;
  repLegalNumDoc: string;
  repLegalTelefono: string;
  repLegalEmail: string;
}

const emptyForm: ProveedorFormData = {
  tipoProveedor: 'nacional',
  tipoPersona: 'juridica',
  razonSocial: '',
  tipoIdentificacion: 'nit',
  nit: '',
  direccion: '',
  departamento: '',
  ciudad: '',
  telefono: '',
  emailCorporativo: '',
  tipoEmpresa: '',
  fechaConstitucion: '',
  codigoCiiu: '',
  descripcionActividad: '',
  certificaciones: [],
  observaciones: '',
  repLegalNombres: '',
  repLegalApellidos: '',
  repLegalTipoDoc: 'cc',
  repLegalNumDoc: '',
  repLegalTelefono: '',
  repLegalEmail: '',
};

function proveedorToForm(p: Proveedor): ProveedorFormData {
  return {
    tipoProveedor: p.tipoProveedor || 'nacional',
    tipoPersona: p.tipoPersona || 'juridica',
    razonSocial: p.razonSocial || '',
    tipoIdentificacion: p.tipoIdentificacion || 'nit',
    nit: p.nit || '',
    direccion: p.direccion || '',
    departamento: p.departamento || '',
    ciudad: p.ciudad || '',
    telefono: p.telefono || '',
    emailCorporativo: p.emailCorporativo || '',
    tipoEmpresa: p.tipoEmpresa || '',
    fechaConstitucion: p.fechaConstitucion
      ? p.fechaConstitucion.slice(0, 10)
      : '',
    codigoCiiu: p.codigoCiiu || '',
    descripcionActividad: p.descripcionActividad || '',
    certificaciones: p.certificaciones || [],
    observaciones: p.observaciones || '',
    repLegalNombres: p.repLegalNombres || '',
    repLegalApellidos: p.repLegalApellidos || '',
    repLegalTipoDoc: p.repLegalTipoDoc || 'cc',
    repLegalNumDoc: p.repLegalNumDoc || '',
    repLegalTelefono: p.repLegalTelefono || '',
    repLegalEmail: p.repLegalEmail || '',
  };
}

// ─── Tab definitions ─────────────────────────────────
const tabs = [
  { id: 'datos', label: 'Datos Básicos', icon: Building2 },
  { id: 'productos', label: 'Productos', icon: ShoppingBag },
  { id: 'actividad', label: 'Act. Económica', icon: Briefcase },
  { id: 'representante', label: 'Rep. Legal', icon: UserCircle },
  { id: 'contactos', label: 'Contactos', icon: Phone },
  { id: 'documentacion', label: 'Documentación', icon: FolderOpen },
  { id: 'calificacion', label: 'Calificación', icon: Star },
  { id: 'reportes', label: 'Reportes', icon: BarChart3 },
] as const;

type TabId = (typeof tabs)[number]['id'];

// ─── Product types ───────────────────────────────────
interface ProductoItem {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  activo: boolean;
}

const categoriasProducto = [
  'Servicios Profesionales',
  'Materiales',
  'Tecnología',
  'Construcción',
  'Alimentos',
  'Transporte',
  'Otro',
];

const initialProductos: ProductoItem[] = [
  { id: '1', nombre: 'Servicios de Consultoría', categoria: 'Servicios Profesionales', descripcion: 'Consultoría empresarial y técnica', activo: true },
  { id: '2', nombre: 'Suministros de Oficina', categoria: 'Materiales', descripcion: 'Papelería y artículos de oficina', activo: true },
  { id: '3', nombre: 'Equipos de Cómputo', categoria: 'Tecnología', descripcion: 'Computadores, servidores y periféricos', activo: true },
];

const emptyProducto: Omit<ProductoItem, 'id'> = { nombre: '', categoria: '', descripcion: '', activo: true };

// ─── Contact types ──────────────────────────────────
interface ContactoData {
  nombre: string;
  cargo: string;
  telefono: string;
  email: string;
}

const emptyContacto: ContactoData = { nombre: '', cargo: '', telefono: '', email: '' };

// ─── Document types ─────────────────────────────────
interface DocumentoRequerido {
  nombre: string;
  descripcion: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  estado: 'pendiente' | 'cargado' | 'opcional';
  archivo?: string;
  archivosCount?: number;
  nota?: string;
}

const documentosRequeridos: DocumentoRequerido[] = [
  {
    nombre: 'Cámara de Comercio',
    descripcion: 'Certificado de existencia y representación legal',
    icon: FileText,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-50',
    estado: 'pendiente',
    nota: 'Máx. 30 días de expedición',
  },
  {
    nombre: 'Registro Único Tributario (RUT)',
    descripcion: 'Documento actualizado de la DIAN',
    icon: CheckCircle2,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-50',
    estado: 'cargado',
    archivo: 'rut_empresa.pdf',
  },
  {
    nombre: 'Identificación Representante Legal',
    descripcion: 'Copia de cédula de ciudadanía',
    icon: Shield,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-50',
    estado: 'pendiente',
  },
  {
    nombre: 'Declaración de Renta',
    descripcion: 'Último año fiscal disponible',
    icon: FileText,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-50',
    estado: 'pendiente',
  },
  {
    nombre: 'Estados Financieros',
    descripcion: 'Últimos 2 años, firmados por RL, Contador y Revisor Fiscal',
    icon: Landmark,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-50',
    estado: 'cargado',
    archivosCount: 2,
  },
  {
    nombre: 'Certificado Bancario',
    descripcion: 'Certificación de cuenta bancaria vigente',
    icon: CreditCard,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    estado: 'pendiente',
    nota: 'Máx. 30 días de expedición',
  },
  {
    nombre: 'Comprobantes de Certificaciones',
    descripcion: 'ISO, calidad, ambientales u otras certificaciones de la empresa',
    icon: Award,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50',
    estado: 'opcional',
    nota: 'Puede subir múltiples archivos',
  },
];

// ─── Mock data for Calificación tab ─────────────────

const mockCalificaciones = [
  { label: 'Calidad del Producto/Servicio', valor: 4.5, color: 'bg-green-500' },
  { label: 'Cumplimiento de Entregas', valor: 4.2, color: 'bg-blue-500' },
  { label: 'Competitividad de Precios', valor: 3.8, color: 'bg-purple-500' },
  { label: 'Atención y Servicio', valor: 4.7, color: 'bg-cyan-500' },
];

const mockKPIs = [
  { valor: '98%', label: 'Órdenes Completadas' },
  { valor: '2.3', label: 'Días Promedio Entrega' },
  { valor: '1.2%', label: 'Tasa de Devoluciones' },
  { valor: '156', label: 'Total Transacciones' },
];

function StarRating({ rating, max = 5, size = 'sm' }: { rating: number; max?: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-5 w-5' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : i < rating ? 'fill-yellow-400/50 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

function InteractiveStarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`h-6 w-6 ${i < value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────
interface Props {
  proveedor?: Proveedor;
  onSave: (data: ProveedorFormData, estado: string) => Promise<void>;
  saving: boolean;
  error: string | null;
  onClearError: () => void;
  readOnly?: boolean;
}

// ─── Component ───────────────────────────────────────
export function ProveedorForm({
  proveedor,
  onSave,
  saving,
  error,
  onClearError,
  readOnly = false,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('datos');
  const [form, setForm] = useState<ProveedorFormData>(
    proveedor ? proveedorToForm(proveedor) : emptyForm,
  );
  const [certInput, setCertInput] = useState('');
  const [evalRating, setEvalRating] = useState(0);
  const [evalComment, setEvalComment] = useState('');

  // Contactos state
  const [contactoComercial, setContactoComercial] = useState<ContactoData>(emptyContacto);
  const [contactoFacturacion, setContactoFacturacion] = useState<ContactoData>(emptyContacto);

  // Productos state
  const [productos, setProductos] = useState<ProductoItem[]>(initialProductos);
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [prodForm, setProdForm] = useState<Omit<ProductoItem, 'id'>>(emptyProducto);

  const openAddProduct = () => {
    setEditingProdId(null);
    setProdForm(emptyProducto);
    setProdModalOpen(true);
  };

  const openEditProduct = (p: ProductoItem) => {
    setEditingProdId(p.id);
    setProdForm({ nombre: p.nombre, categoria: p.categoria, descripcion: p.descripcion, activo: p.activo });
    setProdModalOpen(true);
  };

  const saveProduct = () => {
    if (!prodForm.nombre.trim() || !prodForm.categoria) return;
    if (editingProdId) {
      setProductos((prev) => prev.map((p) => (p.id === editingProdId ? { ...p, ...prodForm } : p)));
    } else {
      setProductos((prev) => [...prev, { ...prodForm, id: Date.now().toString() }]);
    }
    setProdModalOpen(false);
  };

  const deleteProduct = (id: string) => {
    setProductos((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleProductStatus = (id: string) => {
    setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, activo: !p.activo } : p)));
  };

  const isEditing = !!proveedor;

  const set = (field: keyof ProveedorFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addCert = () => {
    const val = certInput.trim().toUpperCase();
    if (val && !form.certificaciones.includes(val)) {
      setForm((prev) => ({
        ...prev,
        certificaciones: [...prev.certificaciones, val],
      }));
    }
    setCertInput('');
  };

  const removeCert = (cert: string) =>
    setForm((prev) => ({
      ...prev,
      certificaciones: prev.certificaciones.filter((c) => c !== cert),
    }));

  const handleSubmit = (estado: string) => onSave(form, estado);

  // ─── Shared input classes ──────────────────────────
  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-gray-500';
  const selectCls = inputCls + ' appearance-none';
  const labelCls = 'mb-1.5 block text-sm font-medium text-gray-700';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard/proveedores')}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {readOnly
              ? proveedor?.razonSocial
              : isEditing
                ? 'Editar Proveedor'
                : 'Nuevo Proveedor'}
          </h1>
          <p className="text-sm text-gray-500">
            {readOnly
              ? `NIT: ${proveedor?.nit}`
              : isEditing
                ? `Editando: ${proveedor?.razonSocial}`
                : 'Complete la información del proveedor'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={onClearError}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Content: form + sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main form area */}
        <div className="space-y-6 lg:col-span-2">
          {/* ═══ TAB: Datos Básicos ═══ */}
          {activeTab === 'datos' && (
            <>
              {/* Información de la Empresa */}
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold text-gray-900">
                    Información de la Empresa
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>
                      Tipo de Proveedor <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.tipoProveedor}
                      onChange={(e) => set('tipoProveedor', e.target.value)}
                      disabled={readOnly}
                      className={selectCls}
                    >
                      <option value="nacional">Nacional</option>
                      <option value="internacional">Internacional</option>
                      <option value="mixto">Mixto</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>
                      Tipo de Persona <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.tipoPersona}
                      onChange={(e) => set('tipoPersona', e.target.value)}
                      disabled={readOnly}
                      className={selectCls}
                    >
                      <option value="juridica">Jurídica</option>
                      <option value="natural">Natural</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label className={labelCls}>
                      Razón Social Completa <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ingrese razón social"
                      value={form.razonSocial}
                      onChange={(e) => set('razonSocial', e.target.value)}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Tipo de Identificación <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.tipoIdentificacion}
                      onChange={(e) => set('tipoIdentificacion', e.target.value)}
                      disabled={readOnly}
                      className={selectCls}
                    >
                      <option value="nit">NIT</option>
                      <option value="cc">Cédula de Ciudadanía</option>
                      <option value="ce">Cédula de Extranjería</option>
                      <option value="pasaporte">Pasaporte</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>
                      Número de Identificación <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 900.123.456-7"
                      value={form.nit}
                      onChange={(e) => set('nit', e.target.value)}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>
                      Dirección Principal <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ingrese dirección completa"
                      value={form.direccion}
                      onChange={(e) => set('direccion', e.target.value)}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Departamento</label>
                    <input
                      type="text"
                      placeholder="Seleccionar..."
                      value={form.departamento}
                      onChange={(e) => set('departamento', e.target.value)}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Ciudad</label>
                    <input
                      type="text"
                      placeholder="Seleccionar..."
                      value={form.ciudad}
                      onChange={(e) => set('ciudad', e.target.value)}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Teléfono <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: (601) 123 4567"
                      value={form.telefono}
                      onChange={(e) => set('telefono', e.target.value)}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Email Corporativo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="empresa@dominio.com"
                      value={form.emailCorporativo}
                      onChange={(e) => set('emailCorporativo', e.target.value)}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Tipo de Empresa</label>
                    <select
                      value={form.tipoEmpresa}
                      onChange={(e) => set('tipoEmpresa', e.target.value)}
                      disabled={readOnly}
                      className={selectCls}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="sas">S.A.S.</option>
                      <option value="sa">S.A.</option>
                      <option value="ltda">Ltda.</option>
                      <option value="eu">E.U.</option>
                      <option value="persona_natural">Persona Natural</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Fecha de Constitución</label>
                    <input
                      type="date"
                      value={form.fechaConstitucion}
                      onChange={(e) => set('fechaConstitucion', e.target.value)}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ═══ TAB: Productos ═══ */}
          {activeTab === 'productos' && (
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-orange-500" />
                  <h2 className="text-base font-semibold text-gray-900">
                    Listado de Productos/Servicios Ofrecidos
                  </h2>
                </div>
                {!readOnly && (
                  <button
                    onClick={openAddProduct}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar Producto
                  </button>
                )}
              </div>

              {productos.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-12">
                  <ShoppingBag className="mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-sm text-gray-400">No hay productos registrados</p>
                  {!readOnly && (
                    <button
                      onClick={openAddProduct}
                      className="mt-3 text-sm font-medium text-primary hover:underline"
                    >
                      Agregar el primer producto
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {productos.map((prod) => (
                    <div
                      key={prod.id}
                      className="group relative flex items-start justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-shadow hover:shadow-md"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {prod.nombre}
                        </p>
                        <p className="text-xs text-gray-500">
                          Categoría: {prod.categoria}
                        </p>
                        {prod.descripcion && (
                          <p className="mt-1 truncate text-xs text-gray-400">
                            {prod.descripcion}
                          </p>
                        )}
                        <button
                          onClick={() => toggleProductStatus(prod.id)}
                          className={`mt-1.5 inline-block text-xs font-medium ${
                            prod.activo ? 'text-green-600' : 'text-red-500'
                          }`}
                        >
                          {prod.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </div>
                      {!readOnly && (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => openEditProduct(prod)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteProduct(prod.id)}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add / Edit Product Modal */}
              {prodModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">
                        {editingProdId ? 'Editar Producto' : 'Agregar Producto'}
                      </h3>
                      <button
                        onClick={() => setProdModalOpen(false)}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>
                          Nombre del Producto/Servicio <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Servicios de Consultoría"
                          value={prodForm.nombre}
                          onChange={(e) => setProdForm((f) => ({ ...f, nombre: e.target.value }))}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          Categoría <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={prodForm.categoria}
                          onChange={(e) => setProdForm((f) => ({ ...f, categoria: e.target.value }))}
                          className={selectCls}
                        >
                          <option value="">Seleccionar...</option>
                          {categoriasProducto.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Descripción</label>
                        <textarea
                          rows={3}
                          placeholder="Descripción del producto o servicio..."
                          value={prodForm.descripcion}
                          onChange={(e) => setProdForm((f) => ({ ...f, descripcion: e.target.value }))}
                          className={inputCls + ' resize-none'}
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        onClick={() => setProdModalOpen(false)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={saveProduct}
                        disabled={!prodForm.nombre.trim() || !prodForm.categoria}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        {editingProdId ? 'Guardar Cambios' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ═══ TAB: Actividad Económica ═══ */}
          {activeTab === 'actividad' && (
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-gray-900">
                  Actividad Económica
                </h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Código CIIU Principal</label>
                    <input
                      type="text"
                      placeholder="Ej: 4651"
                      value={form.codigoCiiu}
                      onChange={(e) => set('codigoCiiu', e.target.value)}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Descripción Actividad</label>
                    <input
                      type="text"
                      placeholder="Descripción automática según código"
                      value={form.descripcionActividad}
                      onChange={(e) =>
                        set('descripcionActividad', e.target.value)
                      }
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Certificaciones */}
                <div>
                  <label className={labelCls}>
                    Certificaciones de la Empresa
                  </label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {form.certificaciones.map((cert) => (
                      <span
                        key={cert}
                        className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                      >
                        {cert}
                        {!readOnly && (
                          <button
                            onClick={() => removeCert(cert)}
                            className="ml-0.5 text-green-500 hover:text-green-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {!readOnly && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Agregar certificación..."
                        value={certInput}
                        onChange={(e) => setCertInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCert();
                          }
                        }}
                        className={inputCls}
                      />
                      <button
                        type="button"
                        onClick={addCert}
                        className="shrink-0 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Agregar
                      </button>
                    </div>
                  )}
                </div>

                {/* Observaciones */}
                <div>
                  <label className={labelCls}>Observaciones</label>
                  <textarea
                    rows={4}
                    placeholder="Ingrese observaciones adicionales..."
                    value={form.observaciones}
                    onChange={(e) => set('observaciones', e.target.value)}
                    disabled={readOnly}
                    className={inputCls + ' resize-none'}
                  />
                </div>
              </div>
            </section>
          )}

          {/* ═══ TAB: Representante Legal ═══ */}
          {activeTab === 'representante' && (
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-gray-900">
                  Datos del Representante Legal
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Nombres Completos</label>
                  <input
                    type="text"
                    placeholder="Nombres del representante"
                    value={form.repLegalNombres}
                    onChange={(e) => set('repLegalNombres', e.target.value)}
                    disabled={readOnly}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Apellidos Completos</label>
                  <input
                    type="text"
                    placeholder="Apellidos del representante"
                    value={form.repLegalApellidos}
                    onChange={(e) => set('repLegalApellidos', e.target.value)}
                    disabled={readOnly}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Tipo de Documento</label>
                  <select
                    value={form.repLegalTipoDoc}
                    onChange={(e) => set('repLegalTipoDoc', e.target.value)}
                    disabled={readOnly}
                    className={selectCls}
                  >
                    <option value="cc">Cédula de Ciudadanía</option>
                    <option value="ce">Cédula de Extranjería</option>
                    <option value="pasaporte">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Número de Documento</label>
                  <input
                    type="text"
                    placeholder="Número de identificación"
                    value={form.repLegalNumDoc}
                    onChange={(e) => set('repLegalNumDoc', e.target.value)}
                    disabled={readOnly}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Teléfono de Contacto</label>
                  <input
                    type="text"
                    placeholder="Teléfono del representante"
                    value={form.repLegalTelefono}
                    onChange={(e) => set('repLegalTelefono', e.target.value)}
                    disabled={readOnly}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    placeholder="email@dominio.com"
                    value={form.repLegalEmail}
                    onChange={(e) => set('repLegalEmail', e.target.value)}
                    disabled={readOnly}
                    className={inputCls}
                  />
                </div>
              </div>
            </section>
          )}

          {/* ═══ TAB: Contactos ═══ */}
          {activeTab === 'contactos' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Contacto Comercial */}
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <Phone className="h-5 w-5 text-pink-500" />
                  <h2 className="text-base font-semibold text-gray-900">
                    Contacto Comercial
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>
                      Nombre Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre del contacto comercial"
                      value={contactoComercial.nombre}
                      onChange={(e) => setContactoComercial((c) => ({ ...c, nombre: e.target.value }))}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Cargo</label>
                    <input
                      type="text"
                      placeholder="Cargo en la empresa"
                      value={contactoComercial.cargo}
                      onChange={(e) => setContactoComercial((c) => ({ ...c, cargo: e.target.value }))}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Teléfono <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Teléfono de contacto"
                      value={contactoComercial.telefono}
                      onChange={(e) => setContactoComercial((c) => ({ ...c, telefono: e.target.value }))}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="email@empresa.com"
                      value={contactoComercial.email}
                      onChange={(e) => setContactoComercial((c) => ({ ...c, email: e.target.value }))}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                </div>
              </section>

              {/* Contacto de Facturación */}
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-500" />
                  <h2 className="text-base font-semibold text-gray-900">
                    Contacto de Facturación
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>
                      Nombre Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre del contacto de facturación"
                      value={contactoFacturacion.nombre}
                      onChange={(e) => setContactoFacturacion((c) => ({ ...c, nombre: e.target.value }))}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Cargo</label>
                    <input
                      type="text"
                      placeholder="Cargo en la empresa"
                      value={contactoFacturacion.cargo}
                      onChange={(e) => setContactoFacturacion((c) => ({ ...c, cargo: e.target.value }))}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Teléfono <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Teléfono de contacto"
                      value={contactoFacturacion.telefono}
                      onChange={(e) => setContactoFacturacion((c) => ({ ...c, telefono: e.target.value }))}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Email de Facturación <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="facturacion@empresa.com"
                      value={contactoFacturacion.email}
                      onChange={(e) => setContactoFacturacion((c) => ({ ...c, email: e.target.value }))}
                      disabled={readOnly}
                      className={inputCls}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ═══ TAB: Documentación ═══ */}
          {activeTab === 'documentacion' && (
            <>
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-yellow-500" />
                  <h2 className="text-base font-semibold text-gray-900">
                    Documentación Requerida
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {documentosRequeridos.map((doc) => {
                    const DocIcon = doc.icon;
                    return (
                      <div
                        key={doc.nombre}
                        className="flex items-start gap-4 rounded-xl border border-gray-200 bg-gray-50 p-5 transition-shadow hover:shadow-md"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${doc.iconBg}`}>
                          <DocIcon className={`h-5 w-5 ${doc.iconColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {doc.nombre}
                          </p>
                          <p className="text-xs text-gray-500">
                            {doc.descripcion}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {doc.estado === 'cargado' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                                <Check className="h-3 w-3" />
                                Cargado
                              </span>
                            )}
                            {doc.estado === 'pendiente' && (
                              <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
                                Pendiente
                              </span>
                            )}
                            {doc.estado === 'opcional' && (
                              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold italic text-gray-500">
                                Opcional
                              </span>
                            )}
                            {doc.archivo && (
                              <span className="text-xs text-gray-400">
                                {doc.archivo}
                              </span>
                            )}
                            {doc.archivosCount && (
                              <span className="text-xs text-gray-400">
                                {doc.archivosCount} archivos
                              </span>
                            )}
                            {doc.nota && (
                              <span className="text-xs text-gray-400">
                                {doc.nota}
                              </span>
                            )}
                          </div>
                          {!readOnly && doc.estado !== 'cargado' && (
                            <button className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                              <Upload className="h-3.5 w-3.5" />
                              Subir archivo
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Formatos aceptados notice */}
              <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">
                    Formatos aceptados
                  </p>
                  <p className="text-xs text-blue-600">
                    PDF, JPG, PNG. Tamaño máximo: 10MB por archivo. Los documentos serán validados antes de la aprobación del proveedor.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ═══ TAB: Calificación ═══ */}
          {activeTab === 'calificacion' && (
            <>
              {/* Calificación del Proveedor */}
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <h2 className="text-base font-semibold text-gray-900">
                    Calificación del Proveedor
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {mockCalificaciones.map((cal) => (
                    <div
                      key={cal.label}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">
                          {cal.label}
                        </p>
                        <span className="text-lg font-bold text-gray-900">
                          {cal.valor}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full ${cal.color}`}
                          style={{ width: `${(cal.valor / 5) * 100}%` }}
                        />
                      </div>
                      <StarRating rating={cal.valor} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Indicadores de Desempeño */}
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold text-gray-900">
                    Indicadores de Desempeño
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {mockKPIs.map((kpi) => (
                    <div
                      key={kpi.label}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center"
                    >
                      <p className="text-2xl font-bold text-gray-900">
                        {kpi.valor}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {kpi.label}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ═══ TAB: Reportes ═══ */}
          {activeTab === 'reportes' && (
            <>
              {/* Report cards */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Reporte de Proveedores */}
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                      <Users2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        Reporte de Proveedores
                      </h2>
                      <p className="text-xs text-gray-500">
                        Listado completo de proveedores registrados
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Estado</label>
                      <select className={selectCls}>
                        <option value="">Todos</option>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                        <option value="en_evaluacion">En Evaluación</option>
                        <option value="borrador">Borrador</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Calificación Mínima</label>
                      <select className={selectCls}>
                        <option value="">Sin filtro</option>
                        <option value="3">3 estrellas o más</option>
                        <option value="4">4 estrellas o más</option>
                        <option value="4.5">4.5 estrellas o más</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Formato de Exportación</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                          <FileSpreadsheet className="h-4 w-4 text-green-600" />
                          Excel
                        </button>
                        <button className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                          <FileText className="h-4 w-4 text-red-500" />
                          PDF
                        </button>
                      </div>
                    </div>
                    <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90">
                      <Download className="h-4 w-4" />
                      Generar Reporte
                    </button>
                  </div>
                </section>

                {/* Reporte de Productos */}
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100">
                      <ShoppingBag className="h-5 w-5 text-pink-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        Reporte de Productos
                      </h2>
                      <p className="text-xs text-gray-500">
                        Productos/servicios por proveedor
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Proveedor</label>
                      <select className={selectCls}>
                        <option value="">Todos los proveedores</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Categoría</label>
                      <select className={selectCls}>
                        <option value="">Todas las categorías</option>
                        <option value="Servicios Profesionales">Servicios Profesionales</option>
                        <option value="Materiales">Materiales</option>
                        <option value="Tecnología">Tecnología</option>
                        <option value="Construcción">Construcción</option>
                        <option value="Alimentos">Alimentos</option>
                        <option value="Transporte">Transporte</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Formato de Exportación</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                          <FileSpreadsheet className="h-4 w-4 text-green-600" />
                          Excel
                        </button>
                        <button className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                          <FileText className="h-4 w-4 text-red-500" />
                          PDF
                        </button>
                      </div>
                    </div>
                    <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90">
                      <Download className="h-4 w-4" />
                      Generar Reporte
                    </button>
                  </div>
                </section>
              </div>

              {/* Estadísticas Generales */}
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold text-gray-900">
                    Estadísticas Generales
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white">
                    <p className="text-xs font-medium text-blue-100">Total Proveedores</p>
                    <p className="mt-1 text-3xl font-bold">248</p>
                    <p className="mt-1 text-xs text-blue-200">+12% vs mes anterior</p>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-4 text-white">
                    <p className="text-xs font-medium text-green-100">Proveedores Activos</p>
                    <p className="mt-1 text-3xl font-bold">231</p>
                    <p className="mt-1 text-xs text-green-200">93% del total</p>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-white">
                    <p className="text-xs font-medium text-orange-100">Productos Registrados</p>
                    <p className="mt-1 text-3xl font-bold">1,847</p>
                    <p className="mt-1 text-xs text-orange-200">+8% vs mes anterior</p>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 text-white">
                    <p className="text-xs font-medium text-purple-100">Calificación Promedio</p>
                    <p className="mt-1 flex items-baseline gap-1 text-3xl font-bold">
                      4.3
                      <Star className="h-5 w-5 fill-yellow-300 text-yellow-300" />
                    </p>
                    <p className="mt-1 text-xs text-purple-200">Basado en 892 evaluaciones</p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {/* ═══ Sidebar ═══ */}
        <div className="space-y-6">
          {/* Estado del Proveedor */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <h3 className="text-sm font-semibold text-gray-900">
                Estado del Proveedor
              </h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Estado Actual
                </p>
                <p className="text-xs text-gray-500">
                  {proveedor
                    ? 'Proveedor activo en el sistema'
                    : 'Nuevo proveedor'}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  proveedor?.estado === 'activo'
                    ? 'bg-green-100 text-green-700'
                    : proveedor?.estado === 'borrador'
                      ? 'bg-gray-100 text-gray-600'
                      : !proveedor
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {proveedor
                  ? proveedor.estado.charAt(0).toUpperCase() +
                    proveedor.estado.slice(1).replace('_', ' ')
                  : 'Nuevo'}
              </span>
            </div>
          </div>

          {/* Información de Registro */}
          {proveedor && (
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Información de Registro
                </h3>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Fecha de Creación</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(proveedor.createdAt).toLocaleDateString('es-CO')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Creado por</dt>
                  <dd className="font-medium text-gray-900">
                    {proveedor.creadoPor
                      ? `${proveedor.creadoPor.nombre} ${proveedor.creadoPor.apellido}`
                      : 'Sistema'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Última Modificación</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(proveedor.updatedAt).toLocaleDateString('es-CO')}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Resumen Rápido */}
          {proveedor?._count && activeTab !== 'calificacion' && (
            <div className="rounded-xl bg-gradient-to-br from-primary/80 to-primary p-5 text-white shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h3 className="text-sm font-semibold">Resumen Rápido</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-white/70">Documentos</p>
                    <p className="text-sm font-semibold">
                      {proveedor._count.documentos} registrados
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                    <Star className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-white/70">Evaluaciones</p>
                    <p className="text-sm font-semibold">
                      {proveedor._count.evaluaciones} realizadas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-white/70">Órdenes de Compra</p>
                    <p className="text-sm font-semibold">
                      {proveedor._count.ordenes} registradas
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Calificación General (sidebar for calificacion tab) */}
          {activeTab === 'calificacion' && (
            <>
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-center text-white shadow-sm">
                <p className="mb-1 text-sm font-medium text-white/80">
                  Calificación General
                </p>
                <p className="text-5xl font-bold">4.5</p>
                <div className="mt-2 flex justify-center">
                  <StarRating rating={4.5} size="md" />
                </div>
                <p className="mt-2 text-xs text-white/70">
                  Basado en 45 evaluaciones
                </p>
                <div className="mt-4 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold">
                  Proveedor Recomendado
                </div>
              </div>

              {/* Nueva Evaluación */}
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-orange-500" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Nueva Evaluación
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Calificación
                    </label>
                    <InteractiveStarRating
                      value={evalRating}
                      onChange={setEvalRating}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Comentarios
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Escriba sus comentarios..."
                      value={evalComment}
                      onChange={(e) => setEvalComment(e.target.value)}
                      className={inputCls + ' resize-none'}
                    />
                  </div>
                  <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90">
                    <Send className="h-4 w-4" />
                    Enviar Evaluación
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-3 border-t pt-6">
          <button
            onClick={() => router.push('/dashboard/proveedores')}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleSubmit('borrador')}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar Borrador
          </button>
          <button
            onClick={() => handleSubmit('activo')}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isEditing ? 'Guardar Proveedor' : 'Guardar Proveedor'}
          </button>
        </div>
      )}
    </div>
  );
}
