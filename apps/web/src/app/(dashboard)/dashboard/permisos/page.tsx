'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchPermisos,
  createPermiso,
  updatePermiso,
  deletePermiso,
  fetchPermiso,
  type PermisoDetallado,
} from '@/lib/admin-api';
import { Plus, Search, Filter, Eye, Pencil, Trash2, Loader2, X, Shield, AlertTriangle, Info } from 'lucide-react';
import { MODULOS, ACCIONES, MODULO_COLORS, type ModuloKey, type AccionKey } from './constants';

interface PermisoForm {
  modulo: string;
  accion: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

const emptyForm: PermisoForm = {
  modulo: '',
  accion: '',
  nombre: '',
  descripcion: '',
  activo: true,
};

export default function PermisosPage() {
  const [permisos, setPermisos] = useState<PermisoDetallado[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPermiso, setSelectedPermiso] = useState<PermisoDetallado | null>(null);
  const [form, setForm] = useState<PermisoForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModulo, setSelectedModulo] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadPermisos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPermisos({
        page,
        limit: 50,
        search: searchTerm || undefined,
        modulo: selectedModulo !== 'all' ? selectedModulo : undefined,
      });
      setPermisos(result.data);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages);
    } catch (err) {
      setError('Error al cargar permisos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedModulo]);

  useEffect(() => {
    loadPermisos();
  }, [loadPermisos]);

  const codigoGenerado = useMemo(() => {
    if (form.modulo && form.accion) {
      return `${form.modulo}.${form.accion}`;
    }
    return '';
  }, [form.modulo, form.accion]);

  useEffect(() => {
    if (form.modulo && form.accion && !editingId) {
      const nombreAuto = `${ACCIONES[form.accion as AccionKey]} ${MODULOS[form.modulo as ModuloKey]}`;
      setForm(prev => ({ ...prev, nombre: nombreAuto }));
    }
  }, [form.modulo, form.accion, editingId]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (permiso: PermisoDetallado) => {
    setEditingId(permiso.id);
    setForm({
      modulo: permiso.modulo,
      accion: permiso.accion,
      nombre: permiso.nombre,
      descripcion: permiso.descripcion || '',
      activo: permiso.activo,
    });
    setError(null);
    setModalOpen(true);
  };

  const openDetail = async (id: string) => {
    try {
      const permiso = await fetchPermiso(id);
      setSelectedPermiso(permiso);
      setDetailModalOpen(true);
    } catch {
      setError('Error al cargar detalle del permiso');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await updatePermiso(editingId, {
          nombre: form.nombre,
          descripcion: form.descripcion,
          activo: form.activo,
        });
      } else {
        await createPermiso({
          codigo: codigoGenerado,
          nombre: form.nombre,
          modulo: form.modulo,
          accion: form.accion,
          descripcion: form.descripcion,
          activo: form.activo,
        });
      }
      setModalOpen(false);
      loadPermisos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar permiso');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Está seguro de eliminar el permiso "${nombre}"?\n\nEsta acción no se puede deshacer.`)) return;

    try {
      await deletePermiso(id);
      loadPermisos();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar permiso');
    }
  };

  const modulosUnicos = useMemo(() => {
    const modulos = new Set(permisos.map(p => p.modulo));
    return Array.from(modulos).sort();
  }, [permisos]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Permisos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configurar permisos del sistema • {total} permisos registrados
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo Permiso
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, nombre, módulo o descripción..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="sm:w-64">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={selectedModulo}
              onChange={(e) => {
                setSelectedModulo(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
            >
              <option value="all">Todos los módulos</option>
              {modulosUnicos.map((modulo) => (
                <option key={modulo} value={modulo}>
                  {MODULOS[modulo as ModuloKey] || modulo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : permisos.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchTerm || selectedModulo !== 'all' ? 'No se encontraron permisos' : 'No hay permisos registrados'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
              {searchTerm || selectedModulo !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza creando el primer permiso del sistema'}
            </p>
            {!searchTerm && selectedModulo === 'all' && (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Crear Primer Permiso
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Módulo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Acción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Roles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {permisos.map((permiso) => (
                  <tr key={permiso.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs font-mono text-primary dark:text-primary-400 bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded">
                        {permiso.codigo}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{permiso.nombre}</div>
                      {permiso.descripcion && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          {permiso.descripcion}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${MODULO_COLORS[permiso.modulo] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {MODULOS[permiso.modulo as ModuloKey] || permiso.modulo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {ACCIONES[permiso.accion as AccionKey] || permiso.accion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openDetail(permiso.id)}
                        className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-400 transition-colors"
                        title="Ver roles asociados"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        {permiso._count?.roles || 0}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        permiso.activo
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {permiso.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      <button
                        onClick={() => openDetail(permiso.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:text-primary hover:bg-primary/10 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-primary/20 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(permiso)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(permiso.id, permiso.nombre)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Página {page} de {totalPages} • {total} permisos en total
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4 z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingId ? 'Editar Permiso' : 'Crear Nuevo Permiso'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Estructura de Permisos RBAC</p>
                    <p className="text-blue-700 dark:text-blue-300">
                      Los permisos siguen el formato <code className="bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded text-xs">módulo.acción</code>.
                      Selecciona el módulo y la acción para generar automáticamente el código del permiso.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Módulo *
                  </label>
                  <select
                    value={form.modulo}
                    onChange={(e) => setForm({ ...form, modulo: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                    disabled={!!editingId}
                  >
                    <option value="">Seleccionar módulo...</option>
                    {Object.entries(MODULOS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {editingId && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      El módulo no puede modificarse en permisos existentes
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Acción *
                  </label>
                  <select
                    value={form.accion}
                    onChange={(e) => setForm({ ...form, accion: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                    disabled={!!editingId}
                  >
                    <option value="">Seleccionar acción...</option>
                    {Object.entries(ACCIONES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {editingId && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      La acción no puede modificarse en permisos existentes
                    </p>
                  )}
                </div>
              </div>

              {codigoGenerado && !editingId && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <span className="text-green-600 dark:text-green-400 text-sm font-bold">✓</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                        Código del permiso generado
                      </p>
                      <code className="inline-block text-sm font-mono text-green-900 dark:text-green-100 bg-green-100 dark:bg-green-900/40 px-3 py-1.5 rounded">
                        {codigoGenerado}
                      </code>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                        Este será el código funcional usado en el sistema RBAC
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre del Permiso *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ver Solicitudes de Compra"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Nombre legible para humanos que describe el permiso
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descripción
                </label>
                <textarea
                  placeholder="Describe qué permite hacer este permiso en el sistema..."
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Estado
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={form.activo}
                      onChange={() => setForm({ ...form, activo: true })}
                      className="w-4 h-4 text-primary focus:ring-primary focus:ring-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Activo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!form.activo}
                      onChange={() => setForm({ ...form, activo: false })}
                      className="w-4 h-4 text-primary focus:ring-primary focus:ring-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Inactivo</span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="submit"
                  disabled={saving || !form.modulo || !form.accion || !form.nombre}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Actualizar Permiso' : 'Crear Permiso'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailModalOpen && selectedPermiso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4 z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Detalle del Permiso
              </h2>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Código del Permiso
                  </label>
                  <code className="mt-1 block text-lg font-mono text-primary dark:text-primary-400 bg-primary/10 dark:bg-primary/20 px-3 py-2 rounded">
                    {selectedPermiso.codigo}
                  </code>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nombre
                  </label>
                  <p className="mt-1 text-base font-medium text-gray-900 dark:text-white">
                    {selectedPermiso.nombre}
                  </p>
                </div>

                {selectedPermiso.descripcion && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Descripción
                    </label>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      {selectedPermiso.descripcion}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Módulo
                    </label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${MODULO_COLORS[selectedPermiso.modulo] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {MODULOS[selectedPermiso.modulo as ModuloKey] || selectedPermiso.modulo}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acción
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {ACCIONES[selectedPermiso.accion as AccionKey] || selectedPermiso.accion}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </label>
                    <p className="mt-1">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        selectedPermiso.activo
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {selectedPermiso.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Roles Asociados
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {selectedPermiso._count?.roles || 0} rol(es)
                    </p>
                  </div>
                </div>
              </div>

              {selectedPermiso.roles && selectedPermiso.roles.length > 0 && (
                <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Roles que tienen este permiso
                  </h3>
                  <div className="space-y-2">
                    {selectedPermiso.roles.map(({ rol }) => (
                      <div
                        key={rol.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {rol.nombre}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Código: {rol.codigo}
                          </p>
                        </div>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          rol.activo
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {rol.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Información del Sistema
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Creado:</span>
                    <p className="text-gray-900 dark:text-white mt-0.5">
                      {new Date(selectedPermiso.createdAt).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Última actualización:</span>
                    <p className="text-gray-900 dark:text-white mt-0.5">
                      {new Date(selectedPermiso.updatedAt).toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
