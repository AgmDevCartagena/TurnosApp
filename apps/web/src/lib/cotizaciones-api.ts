const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface LineaCotizacion {
  id: string;
  lineaSolicitudId?: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  precioUnitario: number;
  descuento: number;
  impuesto: number;
  total: number;
  observaciones?: string;
}

export interface Cotizacion {
  id: string;
  numero: string;
  empresaId: string;
  solicitudId: string;
  proveedorId: string;
  proveedor?: {
    id: string;
    razonSocial: string;
    nit: string;
    emailCorporativo: string;
    telefono?: string;
  };
  estado: string;
  fechaSolicitud?: string;
  fechaRespuesta?: string;
  fechaVencimiento?: string;
  tiempoEntrega?: number;
  condicionesPago?: string;
  garantia?: string;
  validezOferta?: number;
  observaciones?: string;
  subtotal: number;
  impuestos: number;
  descuento: number;
  total: number;
  moneda: string;
  calificacion?: number;
  historico: number;
  documentoAdjunto?: string;
  seleccionada: boolean;
  motivoRechazo?: string;
  lineas: LineaCotizacion[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCotizacionDto {
  solicitudId: string;
  proveedorId: string;
  estado?: string;
  fechaSolicitud?: string;
  fechaRespuesta?: string;
  fechaVencimiento?: string;
  tiempoEntrega?: number;
  condicionesPago?: string;
  garantia?: string;
  validezOferta?: number;
  observaciones?: string;
  moneda?: string;
  calificacion?: number;
  historico?: number;
  documentoAdjunto?: string;
  seleccionada?: boolean;
  motivoRechazo?: string;
  lineas: Omit<LineaCotizacion, 'id' | 'total'>[];
}

export interface QueryCotizacionParams {
  solicitudId?: string;
  proveedorId?: string;
  estado?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

async function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function fetchCotizaciones(params?: QueryCotizacionParams) {
  const queryString = new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const url = `${API_URL}/cotizaciones${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(url, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener cotizaciones');
  }

  return response.json();
}

export async function fetchCotizacion(id: string): Promise<Cotizacion> {
  const response = await fetch(`${API_URL}/cotizaciones/${id}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener cotización');
  }

  return response.json();
}

export async function fetchCotizacionesBySolicitud(solicitudId: string): Promise<Cotizacion[]> {
  const response = await fetch(`${API_URL}/cotizaciones/solicitud/${solicitudId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener cotizaciones de la solicitud');
  }

  return response.json();
}

export async function createCotizacion(data: CreateCotizacionDto): Promise<Cotizacion> {
  const response = await fetch(`${API_URL}/cotizaciones`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al crear cotización');
  }

  return response.json();
}

export async function updateCotizacion(id: string, data: Partial<CreateCotizacionDto>): Promise<Cotizacion> {
  const response = await fetch(`${API_URL}/cotizaciones/${id}`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar cotización');
  }

  return response.json();
}

export async function seleccionarCotizacion(id: string): Promise<Cotizacion> {
  const response = await fetch(`${API_URL}/cotizaciones/${id}/seleccionar`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al seleccionar cotización');
  }

  return response.json();
}

export async function rechazarCotizacion(id: string, motivo: string): Promise<Cotizacion> {
  const response = await fetch(`${API_URL}/cotizaciones/${id}/rechazar`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ motivo }),
  });

  if (!response.ok) {
    throw new Error('Error al rechazar cotización');
  }

  return response.json();
}

export async function deleteCotizacion(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/cotizaciones/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al eliminar cotización');
  }
}
