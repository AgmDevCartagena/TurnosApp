'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  fetchRoles,
  fetchEmpresas,
  fetchCentrosCosto,
  fetchAreas,
  asignarEmpresaUsuario,
  desasignarEmpresaUsuario,
  type Usuario,
  type Rol,
  type Empresa,
  type CentroCosto,
  type Area,
} from '@/lib/admin-api';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { parseApiError } from '@/lib/parse-api-error';

interface UsuarioForm {
  username: string;
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  cedula: string;
  empresaId: string;
  direccion: string;
  area: string;
  centroCostoId: string;
  rolId: string;
  activo: boolean;
}

const emptyForm: UsuarioForm = { 
  username: '',
  email: '', 
  password: '', 
  nombre: '', 
  apellido: '', 
  cedula: '',
  empresaId: '',
  direccion: '',
  area: '',
  centroCostoId: '',
  rolId: '',
  activo: true
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [form, setForm] = useState<UsuarioForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [newEmpresaId, setNewEmpresaId] = useState('');
  const [newEmpresaRolId, setNewEmpresaRolId] = useState('');

  const loadUsuarios = useCallback(async (page = 1, searchTerm = search) => {
    setLoading(true);
    try {
      const result = await fetchUsuarios({ page, limit: 10, search: searchTerm || undefined });
      setUsuarios(result.data);
      setMeta(result.meta);
    } catch {
      setErrors(['Error al cargar usuarios']);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadRoles = useCallback(async () => {
    try {
      const result = await fetchRoles({ limit: 100 });
      setRoles(result.data);
    } catch {
      setErrors(['Error al cargar roles']);
    }
  }, []);

  const loadEmpresas = useCallback(async () => {
    try {
      const result = await fetchEmpresas({ page: 1, limit: 100 });
      setEmpresas(result.data);
    } catch (err) {
      console.error('Error al cargar empresas:', err);
    }
  }, []);

  const loadCentrosCosto = useCallback(async (empresaId?: string) => {
    try {
      const result = await fetchCentrosCosto(empresaId);
      setCentrosCosto(result);
    } catch (err) {
      console.error('Error al cargar centros de costo:', err);
    }
  }, []);

  const loadAreas = useCallback(async (empresaId?: string) => {
    try {
      const result = await fetchAreas(empresaId);
      setAreas(result);
    } catch (err) {
      console.error('Error al cargar áreas:', err);
    }
  }, []);

  useEffect(() => {
    loadUsuarios(1);
    loadRoles();
    loadEmpresas();
    loadCentrosCosto();
    loadAreas();
  }, [loadUsuarios, loadRoles, loadEmpresas, loadCentrosCosto, loadAreas]);

  const handleSearch = () => {
    loadUsuarios(1, search);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors([]);
    setValidationError(null);
    
    // Validar que existan empresas
    if (empresas.length === 0) {
      setValidationError('Debe crear al menos una empresa antes de crear usuarios.');
      return;
    }
    
    // Validar que existan centros de costo
    if (centrosCosto.length === 0) {
      setValidationError('Debe crear al menos un centro de costo antes de crear usuarios.');
      return;
    }
    
    setModalOpen(true);
  };

  const openEdit = (u: Usuario) => {
    setEditingId(u.id);
    setEditingUser(u);
    const primaryEmpresaId = u.empresas?.[0]?.empresa.id || '';
    setForm({ 
      username: u.username,
      email: u.email, 
      password: '', 
      nombre: u.nombre, 
      apellido: u.apellido,
      cedula: u.cedula || '',
      empresaId: primaryEmpresaId,
      direccion: u.direccion || '',
      area: u.area || '',
      centroCostoId: u.centroCostoId || '',
      rolId: u.rol?.id || u.empresas?.[0]?.rol?.id || '',
      activo: u.activo
    });
    if (primaryEmpresaId) {
      loadCentrosCosto(primaryEmpresaId);
      loadAreas(primaryEmpresaId);
    }
    setNewEmpresaId('');
    setNewEmpresaRolId('');
    setErrors([]);
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const clientErrors: string[] = [];
    if (!form.nombre.trim()) clientErrors.push('El nombre es obligatorio.');
    if (!form.apellido.trim()) clientErrors.push('El apellido es obligatorio.');
    if (!form.username.trim()) clientErrors.push('El nombre de usuario es obligatorio.');
    if (!form.cedula.trim()) clientErrors.push('La cédula es obligatoria.');
    if (!form.email.trim()) clientErrors.push('El email es obligatorio.');
    if (!editingId && !form.password.trim()) clientErrors.push('La contraseña es obligatoria.');
    if (!form.empresaId) clientErrors.push('Debe seleccionar una empresa.');
    if (!form.rolId) clientErrors.push('Debe seleccionar un rol.');
    if (clientErrors.length) { setErrors(clientErrors); return; }

    setSaving(true);
    setErrors([]);
    try {
      if (editingId) {
        const body: any = {
          username: form.username,
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          cedula: form.cedula,
          direccion: form.direccion,
          area: form.area,
          centroCostoId: form.centroCostoId || undefined,
          rolId: form.rolId,
          activo: form.activo,
        };
        if (form.password) body.password = form.password;
        await updateUsuario(editingId, body);
      } else {
        const { activo: _activo, ...createPayload } = form;
        await createUsuario({ ...createPayload, cedula: createPayload.cedula || '' });
      }
      setModalOpen(false);
      loadUsuarios(meta.page);
    } catch (err: unknown) {
      const parsed = parseApiError(err, 'Error al guardar el usuario.');
      setErrors(parsed.allMessages.length ? parsed.allMessages : [parsed.summary]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar este usuario?')) return;
    try {
      await deleteUsuario(id);
      loadUsuarios(meta.page);
    } catch {
      setErrors(['Error al desactivar usuario']);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Crear, editar y administrar usuarios del sistema</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </button>
      </div>

      {validationError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">Requisitos previos</h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{validationError}</p>
              <div className="mt-3 flex gap-2">
                {empresas.length === 0 && (
                  <button
                    onClick={() => window.location.href = '/dashboard/empresas'}
                    className="text-sm font-medium text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-amber-100 underline"
                  >
                    Ir a Empresas
                  </button>
                )}
                {centrosCosto.length === 0 && (
                  <button
                    onClick={() => window.location.href = '/dashboard/centros-costo'}
                    className="text-sm font-medium text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-amber-100 underline"
                  >
                    Ir a Centros de Costo
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setValidationError(null)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={handleSearch}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Buscar
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Usuario</th>
              <th className="px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 font-medium text-gray-600">Rol</th>
              <th className="px-4 py-3 font-medium text-gray-600">Empresa</th>
              <th className="px-4 py-3 font-medium text-gray-600">Área</th>
              <th className="px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  No se encontraron usuarios
                </td>
              </tr>
            ) : (
              usuarios.map((u) => {
                const empresaPrincipal = u.empresas?.[0]?.empresa;
                const rolUsuario = u.rol || u.empresas?.[0]?.rol;
                return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white">
                        {u.nombre.charAt(0)}{u.apellido.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.nombre} {u.apellido}</p>
                        <p className="text-xs text-gray-500">Cédula: {u.cedula || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    {rolUsuario ? (
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 capitalize">
                        {rolUsuario.nombre.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Sin rol</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {empresaPrincipal ? (
                      <span className="text-sm text-gray-900">{empresaPrincipal.nombre}</span>
                    ) : (
                      <span className="text-sm text-gray-400">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.area ? (
                      <span className="text-sm text-gray-900">{u.area}</span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        u.activo ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        title="Desactivar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-gray-500">
              Mostrando {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} de{' '}
              {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => loadUsuarios(meta.page - 1)}
                disabled={meta.page <= 1}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-sm text-gray-600">
                {meta.page} / {meta.totalPages}
              </span>
              <button
                onClick={() => loadUsuarios(meta.page + 1)}
                disabled={meta.page >= meta.totalPages}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-800 shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {errors.length > 0 && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <ul className="space-y-0.5">
                      {errors.map((msg, i) => (
                        <li key={i} className="text-sm text-red-700">{msg}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre *</label>
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Apellido *</label>
                    <input
                      type="text"
                      placeholder="Apellido"
                      value={form.apellido}
                      onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Usuario *</label>
                    <input
                      type="text"
                      placeholder="jperez"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Cédula *</label>
                    <input
                      type="text"
                      placeholder="Ej: 12345678"
                      value={form.cedula}
                      onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email *</label>
                  <input
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Dirección</label>
                  <input
                    type="text"
                    placeholder="Calle 123 #45-67"
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Empresa *</label>
                    <select
                      value={form.empresaId}
                      onChange={(e) => {
                        const empresaId = e.target.value;
                        setForm({ ...form, empresaId, centroCostoId: '', area: '' });
                        if (empresaId) {
                          loadCentrosCosto(empresaId);
                          loadAreas(empresaId);
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    >
                      <option value="">Seleccionar empresa...</option>
                      {empresas.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Área</label>
                    <select
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      disabled={!form.empresaId}
                    >
                      <option value="">{form.empresaId ? 'Seleccionar área...' : 'Seleccione empresa primero'}</option>
                      {areas
                        .filter(a => !form.empresaId || a.empresaId === form.empresaId)
                        .map((a) => (
                          <option key={a.id} value={a.nombre}>{a.nombre}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contraseña {editingId && '(dejar vacío para no cambiar)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      placeholder="••••••••"
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Rol *</label>
                    <select
                      value={form.rolId}
                      onChange={(e) => setForm({ ...form, rolId: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    >
                      <option value="">Seleccionar rol...</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Centro de Costo *</label>
                    <select
                      value={form.centroCostoId}
                      onChange={(e) => setForm({ ...form, centroCostoId: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                      disabled={!form.empresaId}
                    >
                      <option value="">{!form.empresaId ? 'Primero seleccione una empresa' : 'Seleccionar centro de costo...'}</option>
                      {centrosCosto
                        .filter(cc => !form.empresaId || cc.empresaId === form.empresaId)
                        .map((cc) => (
                          <option key={cc.id} value={cc.id}>
                            {cc.nombre} ({cc.codigo})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Multi-empresa (solo en edición) */}
                {editingId && editingUser && (
                  <div className="rounded-lg border border-gray-200 dark:border-slate-600 p-4">
                    <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Empresas asociadas</p>
                    <div className="space-y-2 mb-3">
                      {(editingUser.empresas ?? []).map((asig) => (
                        <div key={asig.empresa.id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-700 px-3 py-2 text-sm">
                          <span className="text-gray-900 dark:text-white font-medium">{asig.empresa.nombre}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-auto ml-3">{asig.rol?.nombre}</span>
                          <button
                            type="button"
                            disabled={savingEmpresa || (editingUser.empresas?.length ?? 0) <= 1}
                            onClick={async () => {
                              if (!confirm(`\u00bfDesasignar de ${asig.empresa.nombre}?`)) return;
                              setSavingEmpresa(true);
                              try {
                                await desasignarEmpresaUsuario(editingId, asig.empresa.id);
                                const updated = { ...editingUser, empresas: editingUser.empresas?.filter(e => e.empresa.id !== asig.empresa.id) };
                                setEditingUser(updated as Usuario);
                                loadUsuarios(meta.page);
                              } catch { setErrors(['Error al desasignar empresa']); }
                              finally { setSavingEmpresa(false); }
                            }}
                            className="ml-2 rounded p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                            title={(editingUser.empresas?.length ?? 0) <= 1 ? 'Debe quedar al menos una empresa' : 'Desasignar'}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newEmpresaId}
                        onChange={(e) => setNewEmpresaId(e.target.value)}
                        className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-2 py-2 text-xs"
                      >
                        <option value="">+ Empresa</option>
                        {empresas
                          .filter(e => !(editingUser.empresas ?? []).some(a => a.empresa.id === e.id))
                          .map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                      </select>
                      <select
                        value={newEmpresaRolId}
                        onChange={(e) => setNewEmpresaRolId(e.target.value)}
                        className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-2 py-2 text-xs"
                      >
                        <option value="">Rol</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={!newEmpresaId || !newEmpresaRolId || savingEmpresa}
                      onClick={async () => {
                        setSavingEmpresa(true);
                        try {
                          await asignarEmpresaUsuario({ usuarioId: editingId, empresaId: newEmpresaId, rolId: newEmpresaRolId });
                          const empresa = empresas.find(e => e.id === newEmpresaId);
                          const rol = roles.find(r => r.id === newEmpresaRolId);
                          const updated = { ...editingUser, empresas: [...(editingUser.empresas ?? []), { empresa: { id: newEmpresaId, nombre: empresa?.nombre ?? '' }, rol: { id: newEmpresaRolId, nombre: rol?.nombre ?? '' } }] };
                          setEditingUser(updated as Usuario);
                          setNewEmpresaId(''); setNewEmpresaRolId('');
                          loadUsuarios(meta.page);
                        } catch (err: unknown) {
                          const parsed = parseApiError(err, 'Error al asignar empresa.');
                          setErrors(parsed.allMessages.length ? parsed.allMessages : [parsed.summary]);
                        } finally { setSavingEmpresa(false); }
                      }}
                      className="mt-2 w-full rounded-lg border border-dashed border-primary py-1.5 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-40"
                    >
                      {savingEmpresa ? 'Guardando...' : 'Asignar empresa'}
                    </button>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                  <select
                    value={form.activo ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, activo: e.target.value === 'true' })}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 pt-4 -mx-6 px-6 -mb-6 pb-6">
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-gray-300 dark:border-slate-600 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
