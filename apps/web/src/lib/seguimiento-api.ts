const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface SolicitudSeguimiento {
  id: string;
  descripcion: string;
  estado: string;
  etapa: string;
  totalEstimado: number;
  prioridad: string;
  departamento?: string;
  categoria?: string;
  createdAt: string;
  solicitante: {
    id: string;
    nombre: string;
    apellido: string;
  };
  centroCosto?: {
    id: string;
    nombre: string;
    codigo: string;
  };
  flujoAprobacion?: any;
  cotizaciones: any[];
  ordenes: any[];
}

export interface QuerySeguimientoParams {
  numeroSolicitud?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  solicitante?: string;
  centroCosto?: string;
  estado?: string;
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

export async function consultarSolicitudes(params?: QuerySeguimientoParams) {
  const queryString = new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const url = `${API_URL}/seguimiento/solicitudes${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(url, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al consultar solicitudes');
  }

  return response.json();
}

export async function obtenerDetalleSeguimiento(solicitudId: string) {
  const response = await fetch(`${API_URL}/seguimiento/solicitudes/${solicitudId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener detalle de seguimiento');
  }

  return response.json();
}
