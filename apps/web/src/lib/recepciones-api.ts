const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface Recepcion {
  id: string;
  ordenCompraId: string;
  ordenCompra?: {
    id: string;
    numero: string;
    proveedor: {
      id: string;
      razonSocial: string;
      nit: string;
    };
    solicitud: {
      id: string;
      descripcion: string;
    };
    total: number;
  };
  fechaRecepcion: string;
  recibidoPorId: string;
  recibidoPor?: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
  observaciones?: string;
  createdAt: string;
}

export interface OrdenPendiente {
  id: string;
  numero: string;
  proveedor: {
    id: string;
    razonSocial: string;
    nit: string;
  };
  solicitud: {
    id: string;
    descripcion: string;
  };
  estado: string;
  fechaEntregaEstimada?: string;
  total: number;
  recepciones: any[];
}

export interface CreateRecepcionDto {
  ordenCompraId: string;
  fechaRecepcion?: string;
  observaciones?: string;
}

export interface QueryRecepcionParams {
  ordenCompraId?: string;
  page?: number;
  limit?: number;
}

async function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function fetchRecepciones(params?: QueryRecepcionParams) {
  const queryString = new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const url = `${API_URL}/recepciones${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(url, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener recepciones');
  }

  return response.json();
}

export async function fetchRecepcion(id: string): Promise<Recepcion> {
  const response = await fetch(`${API_URL}/recepciones/${id}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener recepción');
  }

  return response.json();
}

export async function fetchOrdenesPendientes(): Promise<OrdenPendiente[]> {
  const response = await fetch(`${API_URL}/recepciones/ordenes-pendientes`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener órdenes pendientes');
  }

  return response.json();
}

export async function createRecepcion(data: CreateRecepcionDto): Promise<Recepcion> {
  const response = await fetch(`${API_URL}/recepciones`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear recepción');
  }

  return response.json();
}

export async function deleteRecepcion(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/recepciones/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al eliminar recepción');
  }
}
