'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchCotizacionesBySolicitud, seleccionarCotizacion, type Cotizacion } from '@/lib/cotizaciones-api';
import { ArrowLeft, Download, Star, Clock, CheckCircle2, FileText } from 'lucide-react';

export default function ComparativoPage() {
  const params = useParams();
  const router = useRouter();
  const solicitudId = params.solicitudId as string;

  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionando, setSeleccionando] = useState(false);

  useEffect(() => {
    loadCotizaciones();
  }, [solicitudId]);

  const loadCotizaciones = async () => {
    try {
      setLoading(true);
      const data = await fetchCotizacionesBySolicitud(solicitudId);
      setCotizaciones(data);
    } catch (err) {
      setError('Error al cargar cotizaciones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionar = async (cotizacionId: string) => {
    if (!confirm('¿Está seguro de seleccionar esta cotización como ganadora?')) {
      return;
    }

    try {
      setSeleccionando(true);
      await seleccionarCotizacion(cotizacionId);
      await loadCotizaciones();
    } catch (err) {
      alert('Error al seleccionar cotización');
      console.error(err);
    } finally {
      setSeleccionando(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Cargando comparativo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        <p>{error}</p>
      </div>
    );
  }

  if (cotizaciones.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-600">No hay cotizaciones para comparar</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-primary hover:underline"
        >
          Volver
        </button>
      </div>
    );
  }

  const productoNombre = cotizaciones[0]?.lineas[0]?.descripcion || 'Producto';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comparativo de Proveedores</h1>
            <p className="text-gray-600">{productoNombre}</p>
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90">
          <Download className="h-4 w-4" />
          Consultar Precios
        </button>
      </div>

      {/* Tabla Comparativa */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">PROVEEDOR</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">PRECIO UNIT.</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">TIEMPO ENTREGA</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">CALIFICACIÓN</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">HISTÓRICO</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">ACCIÓN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {cotizaciones.map((cotizacion, index) => {
              const precioUnitario = cotizacion.lineas[0]?.precioUnitario || 0;
              const isSelected = cotizacion.seleccionada;
              const isLowestPrice = index === 0;

              return (
                <tr
                  key={cotizacion.id}
                  className={`${
                    isSelected ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Proveedor */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white">
                        {cotizacion.proveedor?.razonSocial.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {cotizacion.proveedor?.razonSocial}
                        </p>
                        <p className="text-sm text-gray-500">
                          NIT: {cotizacion.proveedor?.nit}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Precio */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(precioUnitario)}
                      </p>
                      {isLowestPrice && !isSelected && (
                        <span className="mt-1 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Mejor precio
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Tiempo Entrega */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-700">
                      <Clock className="h-4 w-4" />
                      <span>{cotizacion.tiempoEntrega || 0} días</span>
                    </div>
                  </td>

                  {/* Calificación */}
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      {cotizacion.calificacion ? (
                        renderStars(Number(cotizacion.calificacion))
                      ) : (
                        <span className="text-sm text-gray-400">Sin calificación</span>
                      )}
                    </div>
                  </td>

                  {/* Histórico */}
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-medium text-gray-900">
                      {cotizacion.historico} compras
                    </span>
                  </td>

                  {/* Acción */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                          <CheckCircle2 className="h-4 w-4" />
                          Seleccionada
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSeleccionar(cotizacion.id)}
                          disabled={seleccionando}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                        >
                          Seleccionar
                        </button>
                      )}
                      <button
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-primary"
                        title="Ver detalles"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Información adicional */}
      <div className="grid gap-4 md:grid-cols-3">
        {cotizaciones.slice(0, 3).map((cotizacion) => (
          <div key={cotizacion.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="font-semibold text-gray-900">
              {cotizacion.proveedor?.razonSocial}
            </h3>
            <div className="mt-3 space-y-2 text-sm">
              {cotizacion.condicionesPago && (
                <div>
                  <span className="text-gray-600">Condiciones de pago:</span>
                  <p className="font-medium text-gray-900">{cotizacion.condicionesPago}</p>
                </div>
              )}
              {cotizacion.garantia && (
                <div>
                  <span className="text-gray-600">Garantía:</span>
                  <p className="font-medium text-gray-900">{cotizacion.garantia}</p>
                </div>
              )}
              {cotizacion.validezOferta && (
                <div>
                  <span className="text-gray-600">Validez de oferta:</span>
                  <p className="font-medium text-gray-900">{cotizacion.validezOferta} días</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
