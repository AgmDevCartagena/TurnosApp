'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchRoles,
  createRol,
  updateRol,
  deleteRol,
  fetchPermisos,
  type Rol,
  type Permiso,
} from '@/lib/admin-api';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Shield,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react';

interface RolForm {
  nombre: string;
  descripcion: string;
  permisoIds: string[];
}

const emptyForm: RolForm = { nombre: '', descripcion: '', permisoIds: [] };

export default function RolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RolForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRol, setExpandedRol] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRoles({ limit: 100 });
      setRoles(result.data);
    } catch {
      setError('Error al cargar roles');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPermisos = useCallback(async () => {
    try {
      const result = await fetchPermisos({ limit: 1000 });
      setPermisos(result.data);
    } catch {
      /* permisos will be empty */
    }
  }, []);

  useEffect(() => {
    loadRoles();
    loadPermisos();
  }, [loadRoles, loadPermisos]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (r: Rol) => {
    setEditingId(r.id);
    setForm({
      nombre: r.nombre,
      descripcion: r.descripcion || '',
      permisoIds: r.permisos.map((p) => p.permiso.id),
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateRol(editingId, {
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          permisoIds: form.permisoIds,
        });
      } else {
        await createRol({
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          permisoIds: form.permisoIds.length > 0 ? form.permisoIds : undefined,
        });
      }
      setModalOpen(false);
      loadRoles();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el rol "${nombre}"?`)) return;
    try {
      await deleteRol(id);
      loadRoles();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Error al eliminar rol');
    }
  };

  const togglePermiso = (permisoId: string) => {
    setForm((prev) => ({
      ...prev,
      permisoIds: prev.permisoIds.includes(permisoId)
        ? prev.permisoIds.filter((id) => id !== permisoId)
        : [...prev.permisoIds, permisoId],
    }));
  };

  const toggleAllModulo = (modulo: string) => {
    const moduloPermisos = permisos.filter((p) => p.modulo === modulo);
    const allSelected = moduloPermisos.every((p) => form.permisoIds.includes(p.id));

    if (allSelected) {
      setForm((prev) => ({
        ...prev,
        permisoIds: prev.permisoIds.filter((id) => !moduloPermisos.find((p) => p.id === id)),
      }));
    } else {
      const newIds = new Set([...form.permisoIds, ...moduloPermisos.map((p) => p.id)]);
      setForm((prev) => ({ ...prev, permisoIds: Array.from(newIds) }));
    }
  };

  // Agrupar permisos por módulo
  const permisosByModulo = permisos.reduce<Record<string, Permiso[]>>((acc, p) => {
    if (!acc[p.modulo]) acc[p.modulo] = [];
    acc[p.modulo]!.push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-sm text-gray-500">Gestión de roles y permisos del sistema</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuevo Rol
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          No se encontraron roles
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((r) => (
            <div key={r.id} className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                    <Shield className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 capitalize">{r.nombre.replace('_', ' ')}</h3>
                    <p className="text-sm text-gray-500">{r.descripcion || 'Sin descripción'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>{r._count?.usuarios ?? 0}</span>
                  </div>
                  <span className="text-sm text-gray-400">{r.permisos.length} permisos</span>
                  <button
                    onClick={() => setExpandedRol(expandedRol === r.id ? null : r.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                  >
                    {expandedRol === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id, r.nombre)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {expandedRol === r.id && (
                <div className="border-t bg-gray-50 px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {r.permisos.map((p) => (
                      <span
                        key={p.permiso.id}
                        className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 border"
                      >
                        {p.permiso.codigo}
                      </span>
                    ))}
                    {r.permisos.length === 0 && (
                      <span className="text-sm text-gray-400">Sin permisos asignados</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Editar Rol' : 'Nuevo Rol'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nombre del rol</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="ej: coordinador"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Descripción</label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción del rol..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-gray-700">
                  Permisos ({form.permisoIds.length} seleccionados)
                </label>
                <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border p-3">
                  {Object.entries(permisosByModulo).map(([modulo, perms]) => {
                    const allSelected = perms.every((p) => form.permisoIds.includes(p.id));
                    return (
                      <div key={modulo} className="space-y-1">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 capitalize cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => toggleAllModulo(modulo)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          {modulo}
                        </label>
                        <div className="ml-6 flex flex-wrap gap-2">
                          {perms.map((p) => (
                            <label
                              key={p.id}
                              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                                form.permisoIds.includes(p.id)
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={form.permisoIds.includes(p.id)}
                                onChange={() => togglePermiso(p.id)}
                                className="sr-only"
                              />
                              {p.accion}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(permisosByModulo).length === 0 && (
                    <p className="text-sm text-gray-400">Cargando permisos...</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Guardar Cambios' : 'Crear Rol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
