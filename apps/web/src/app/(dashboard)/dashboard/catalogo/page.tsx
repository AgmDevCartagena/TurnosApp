'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, ShoppingCart, Grid, List } from 'lucide-react';
import { fetchProducts, fetchCategories, fetchBrands, addToCart, type Producto, type Categoria } from '@/lib/catalog-api';

export default function CatalogoPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [cartCount, setCartCount] = useState(0);

  const [filters, setFilters] = useState({
    search: '',
    categoriaId: '',
    marca: '',
    destacado: false,
    nuevo: false,
    enOferta: false,
    precioMin: undefined as number | undefined,
    precioMax: undefined as number | undefined,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadCatalog();
    loadFilters();
  }, [filters, pagination.page]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const result = await fetchProducts({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setProductos(result.data);
      setPagination((prev) => ({
        ...prev,
        total: result.meta.total,
        totalPages: result.meta.totalPages,
      }));
    } catch (error) {
      console.error('Error al cargar catálogo:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const [cats, brands] = await Promise.all([fetchCategories(), fetchBrands()]);
      setCategorias(cats);
      setMarcas(brands);
    } catch (error) {
      console.error('Error al cargar filtros:', error);
    }
  };

  const handleAddToCart = async (productoId: string) => {
    try {
      await addToCart({ productoId, cantidad: 1 });
      setCartCount((prev) => prev + 1);
      alert('Producto agregado al carrito');
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error al agregar al carrito');
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Precio a consultar';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(Number(price));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Catálogo de Productos</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Explora y solicita productos para tu empresa
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/carrito')}
          className="relative flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 transition-colors"
        >
          <ShoppingCart className="h-5 w-5" />
          Ver Carrito
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <aside className="space-y-6 lg:col-span-1">
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Búsqueda
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Buscar productos..."
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Categoría
                </label>
                <select
                  value={filters.categoriaId}
                  onChange={(e) => setFilters({ ...filters, categoriaId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Marca
                </label>
                <select
                  value={filters.marca}
                  onChange={(e) => setFilters({ ...filters, marca: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">Todas las marcas</option>
                  {marcas.map((marca) => (
                    <option key={marca} value={marca}>
                      {marca}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.destacado}
                    onChange={(e) => setFilters({ ...filters, destacado: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Destacados</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.nuevo}
                    onChange={(e) => setFilters({ ...filters, nuevo: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Nuevos</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.enOferta}
                    onChange={(e) => setFilters({ ...filters, enOferta: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">En oferta</span>
                </label>
              </div>

              <button
                onClick={() => {
                  setFilters({
                    search: '',
                    categoriaId: '',
                    marca: '',
                    destacado: false,
                    nuevo: false,
                    enOferta: false,
                    precioMin: undefined,
                    precioMax: undefined,
                  });
                  setPagination({ ...pagination, page: 1 });
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </aside>

        <main className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {pagination.total} productos encontrados
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-lg p-2 ${
                  viewMode === 'grid'
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-lg p-2 ${
                  viewMode === 'list'
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'
                    : 'space-y-4'
                }
              >
                {productos.map((producto) => (
                  <div
                    key={producto.id}
                    className="group rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/dashboard/catalogo/${producto.slug}`)}
                  >
                    <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-700">
                      {producto.imagenPrincipal ? (
                        <img
                          src={producto.imagenPrincipal}
                          alt={producto.nombreCorto}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <ShoppingCart className="h-12 w-12" />
                        </div>
                      )}
                      {producto.nuevo && (
                        <span className="absolute top-2 left-2 rounded-full bg-blue-500 px-2 py-1 text-xs font-bold text-white">
                          NUEVO
                        </span>
                      )}
                      {producto.enOferta && (
                        <span className="absolute top-2 right-2 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
                          OFERTA
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                        {producto.nombreCorto}
                      </h3>
                      {producto.descripcionCorta && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {producto.descripcionCorta}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                          {formatPrice(producto.precioReferencial)}
                        </p>
                        {producto.marca && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {producto.marca}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(producto.id);
                        }}
                        className="w-full rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 transition-colors"
                      >
                        Agregar al carrito
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
