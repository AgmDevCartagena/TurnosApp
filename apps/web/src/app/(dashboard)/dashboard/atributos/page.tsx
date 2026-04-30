'use client';

import { useState, useEffect } from 'react';
import {
  fetchAtributos,
  createAtributo,
  updateAtributo,
  toggleActivoAtributo,
  deleteAtributo,
  type AtributoDinamico,
  type CreateAtributoDto,
} from '@/lib/atributos-api';
import { Plus, Eye, Trash2, X } from 'lucide-react';

export default function AtributosPage() {
  const [atributos, setAtributos] = useState<AtributoDinamico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<AtributoDinamico | null>(null);
  const [procesando, setProcesando] = useState(false);

  // Form state
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [tipoDato, setTipoDato] = useState<'TEXTO' | 'NUMERO' | 'LISTA' | 'BOOLEANO'>('TEXTO');
  const [valores, setValores] = useState('');
  const [obligatorio, setObligatorio] = useState(false);

  useEffect(() => {
    loadAtributos();
  }, []);

  const loadAtributos = async () => {
    try {
      setLoading(true);
      const data = await fetchAtributos();
      setAtributos(data);
    } catch (err) {
      console.error('Error al cargar atributos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNuevoAtributo = () => {
    setEditando(null);
    setNombre('');
    setCategoria('');
    setTipoDato('TEXTO');
    setValores('');
    setObligatorio(false);
    setModalOpen(true);
  };

  const handleEditarAtributo = (atributo: AtributoDinamico) => {
    setEditando(atributo);
    setNombre(atributo.nombre);
    setCategoria(atributo.categoria);
    setTipoDato(atributo.tipoDato);
    setValores(atributo.valores || '');
    setObligatorio(atributo.obligatorio);
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    try {
      setProcesando(true);

      const data: CreateAtributoDto = {
        nombre,
        categoria,
        tipoDato,
        valores: tipoDato === 'LISTA' ? valores : undefined,
        obligatorio,
      };

      if (editando) {
        await updateAtributo(editando.id, data);
      } else {
        await createAtributo(data);
      }

      setModalOpen(false);
      await loadAtributos();
    } catch (err: any) {
      alert(err.message || 'Error al guardar atributo');
    } finally {
      setProcesando(false);
    }
  };

  const handleToggleActivo = async (id: string) => {
    try {
      await toggleActivoAtributo(id);
      await loadAtributos();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este atributo?')) return;

    try {
      await deleteAtributo(id);
      await loadAtributos();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar atributo');
    }
  };

  const getTipoDatoBadge = (tipo: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      LISTA: { bg: 'bg-purple-100', text: 'text-purple-800' },
      TEXTO: { bg: 'bg-blue-100', text: 'text-blue-800' },
      NUMERO: { bg: 'bg-orange-100', text: 'text-orange-800' },
      BOOLEANO: { bg: 'bg-green-100', text: 'text-green-800' },
    };

    const badge = badges[tipo] ?? { bg: 'bg-gray-100', text: 'text-gray-800' };
    return (
      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
        {tipo}
      </span>
    );
  };

  // Agrupar atributos por categoría
  const atributosPorCategoria = atributos.reduce((acc, atributo) => {
    if (!acc[atributo.categoria]) {
      acc[atributo.categoria] = [];
    }
    acc[atributo.categoria].push(atributo);
    return acc;
  }, {} as Record<string, AtributoDinamico[]>);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Cargando atributos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Atributos Dinámicos</h1>
          <p className="text-gray-600">Configuración de atributos por categoría</p>
        </div>
        <button
          onClick={handleNuevoAtributo}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
          Nuevo Atributo
        </button>
      </div>

      {/* Gestión de Atributos Dinámicos */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Gestión de Atributos Dinámicos</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Categoría
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tipo Dato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Valores
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Obligatorio
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {Object.entries(atributosPorCategoria).map(([, attrs]) => (
                <>
                  {attrs.map((atributo) => (
                    <tr key={atributo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {atributo.nombre}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {atributo.categoria}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getTipoDatoBadge(atributo.tipoDato)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {atributo.valores || '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActivo(atributo.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            atributo.activo ? 'bg-primary' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              atributo.activo ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditarAtributo(atributo)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEliminar(atributo.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Crear/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editando ? 'Editar Atributo' : 'Nuevo Atributo'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Marca, Procesador, Tamaño..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Categoría *
                </label>
                <input
                  type="text"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ej: Laptop, Monitor, Mobiliario..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Tipo de Dato *
                </label>
                <select
                  value={tipoDato}
                  onChange={(e) => setTipoDato(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="TEXTO">Texto</option>
                  <option value="NUMERO">Número</option>
                  <option value="LISTA">Lista</option>
                  <option value="BOOLEANO">Booleano</option>
                </select>
              </div>

              {tipoDato === 'LISTA' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Valores (separados por coma)
                  </label>
                  <input
                    type="text"
                    value={valores}
                    onChange={(e) => setValores(e.target.value)}
                    placeholder="Ej: Dell, HP, Lenovo, Apple"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="obligatorio"
                  checked={obligatorio}
                  onChange={(e) => setObligatorio(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="obligatorio" className="text-sm text-gray-700">
                  Campo obligatorio
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={procesando || !nombre || !categoria}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {procesando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
