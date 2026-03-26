'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchProveedores,
  deleteProveedor,
  type Proveedor,
} from '@/lib/proveedores-api';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  Truck,
  Filter,
} from 'lucide-react';

const estadoColors: Record<string, string> = {
  activo: 'bg-green-50 text-green-700',
  inactivo: 'bg-red-50 text-red-700',
  suspendido: 'bg-orange-50 text-orange-700',
  en_evaluacion: 'bg-yellow-50 text-yellow-700',
  borrador: 'bg-gray-100 text-gray-600',
};

const estadoLabels: Record<string, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  suspendido: 'Suspendido',
  en_evaluacion: 'En Evaluación',
  borrador: 'Borrador',
};

export default function ProveedoresPage() {
  const router = useRouter();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProveedores = useCallback(
    async (page = 1, searchTerm = search) => {
      setLoading(true);
      try {
        const result = await fetchProveedores({
          page,
          limit: 10,
          search: searchTerm || undefined,
          estado: filterEstado || undefined,
        });
        setProveedores(result.data);
        setMeta(result.meta);
      } catch {
        setError('Error al cargar proveedores');
      } finally {
        setLoading(false);
      }
    },
    [search, filterEstado],
  );

  useEffect(() => {
    loadProveedores(1);
  }, [loadProveedores]);

  const handleSearch = () => loadProveedores(1, search);

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Desactivar el proveedor "${nombre}"?`)) return;
    try {
      await deleteProveedor(id);
      loadProveedores(meta.page);
    } catch {
      setError('Error al desactivar proveedor');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-500">Gestión de proveedores del sistema</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/proveedores/nuevo')}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuevo Proveedor
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por razón social, NIT o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="appearance-none rounded-lg border border-gray-300 py-2.5 pl-10 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="borrador">Borrador</option>
            <option value="en_evaluacion">En Evaluación</option>
            <option value="suspendido">Suspendido</option>
          </select>
        </div>
        <button
          onClick={handleSearch}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Buscar
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Razón Social</th>
              <th className="px-4 py-3 font-medium text-gray-600">NIT</th>
              <th className="px-4 py-3 font-medium text-gray-600">Tipo</th>
              <th className="px-4 py-3 font-medium text-gray-600">Contacto</th>
              <th className="px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </td>
              </tr>
            ) : proveedores.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Truck className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-gray-400">No se encontraron proveedores</p>
                </td>
              </tr>
            ) : (
              proveedores.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{p.razonSocial}</p>
                      <p className="text-xs text-gray-400">{p.ciudad ? `${p.ciudad}, ${p.departamento}` : p.direccion}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">{p.nit}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium capitalize text-blue-700">
                      {p.tipoProveedor}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-600">{p.emailCorporativo}</p>
                    <p className="text-xs text-gray-400">{p.telefono}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoColors[p.estado] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {estadoLabels[p.estado] || p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/dashboard/proveedores/${p.id}`)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-primary"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/proveedores/${p.id}/editar`)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.razonSocial)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        title="Desactivar"
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

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-gray-500">
              Mostrando {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} de{' '}
              {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => loadProveedores(meta.page - 1)}
                disabled={meta.page <= 1}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-sm text-gray-600">
                {meta.page} / {meta.totalPages}
              </span>
              <button
                onClick={() => loadProveedores(meta.page + 1)}
                disabled={meta.page >= meta.totalPages}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
