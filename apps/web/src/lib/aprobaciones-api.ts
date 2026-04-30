const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface PasoAprobacion {
  id: string;
  flujoId: string;
  orden: number;
  aprobadorId: string;
  aprobador: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
  estado: string; // pendiente, aprobada, rechazada, escalada
  comentario?: string;
  fechaDecision?: string;
  createdAt: string;
}

export interface FlujoAprobacion {
  id: string;
  solicitudId: string;
  solicitud?: {
    id: string;
    descripcion: string;
    totalEstimado: number;
    prioridad?: string;
    solicitante: {
      id: string;
      nombre: string;
      apellido: string;
      email?: string;
    };
    lineas?: any[];
  };
  estadoActual: string; // pendiente, aprobada, rechazada
  pasos: PasoAprobacion[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlujoAprobacionDto {
  solicitudId: string;
  pasos: {
    orden: number;
    aprobadorId: string;
  }[];
}

export interface AprobarRechazarDto {
  comentario?: string;
}

export interface QueryAprobacionParams {
  estado?: string;
  aprobadorId?: string;
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

export async function createFlujoAprobacion(data: CreateFlujoAprobacionDto): Promise<FlujoAprobacion> {
  const response = await fetch(`${API_URL}/aprobaciones/flujos`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al crear flujo de aprobación');
  }

  return response.json();
}

export async function fetchFlujos(params?: QueryAprobacionParams) {
  const queryString = new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const url = `${API_URL}/aprobaciones/flujos${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(url, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener flujos de aprobación');
  }

  return response.json();
}

export async function fetchFlujo(id: string): Promise<FlujoAprobacion> {
  const response = await fetch(`${API_URL}/aprobaciones/flujos/${id}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener flujo de aprobación');
  }

  return response.json();
}

export async function fetchFlujoBySolicitud(solicitudId: string): Promise<FlujoAprobacion | null> {
  const response = await fetch(`${API_URL}/aprobaciones/solicitud/${solicitudId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Error al obtener flujo de aprobación');
  }

  return response.json();
}

export async function fetchMisAprobacionesPendientes(params?: QueryAprobacionParams) {
  const queryString = new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const url = `${API_URL}/aprobaciones/pendientes/mis-aprobaciones${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(url, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener aprobaciones pendientes');
  }

  return response.json();
}

export async function aprobarPaso(pasoId: string, data: AprobarRechazarDto): Promise<PasoAprobacion> {
  const response = await fetch(`${API_URL}/aprobaciones/pasos/${pasoId}/aprobar`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al aprobar');
  }

  return response.json();
}

export async function rechazarPaso(pasoId: string, data: AprobarRechazarDto): Promise<PasoAprobacion> {
  const response = await fetch(`${API_URL}/aprobaciones/pasos/${pasoId}/rechazar`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al rechazar');
  }

  return response.json();
}
