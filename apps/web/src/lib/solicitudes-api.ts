import apiClient from './api-client';

// ─── Types ───────────────────────────────────────────

export interface LineaSolicitud {
  id?: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  especificaciones?: string | null;
  precioEstimado: number;
}

export interface Solicitud {
  id: string;
  numero: string;
  titulo: string;
  solicitanteId: string;
  solicitante: { id: string; nombre: string; apellido: string; email: string };
  estado: string;
  departamento: string | null;
  categoria: string | null;
  prioridad: string;
  centroCostoId: string | null;
  centroCosto: { id: string; nombre: string; codigo: string } | null;
  fechaRequerida: string | null;
  tiempoEntrega: number | null;
  moneda: string;
  descripcion: string | null;
  justificacion: string;
  totalEstimado: number;
  lineas: LineaSolicitud[];
  createdAt: string;
  updatedAt: string;
  _count?: { lineas: number };
}

export interface SolicitudQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  estado?: string;
  departamento?: string;
  categoria?: string;
  prioridad?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateSolicitudBody {
  titulo: string;
  departamento?: string;
  categoria?: string;
  prioridad?: string;
  centroCostoId?: string;
  fechaRequerida?: string;
  tiempoEntrega?: number;
  moneda?: string;
  descripcion?: string;
  justificacion: string;
  estado?: string;
  lineas: Omit<LineaSolicitud, 'id'>[];
}

// ─── API calls ───────────────────────────────────────

export async function fetchSolicitudes(
  params: SolicitudQueryParams = {},
): Promise<PaginatedResponse<Solicitud>> {
  const { data } = await apiClient.get<PaginatedResponse<Solicitud>>('/solicitudes', { params });
  return data;
}

export async function fetchSolicitud(id: string): Promise<Solicitud> {
  const { data } = await apiClient.get<Solicitud>(`/solicitudes/${id}`);
  return data;
}

export async function createSolicitud(body: CreateSolicitudBody): Promise<Solicitud> {
  const { data } = await apiClient.post<Solicitud>('/solicitudes', body);
  return data;
}

export async function updateSolicitud(id: string, body: Partial<CreateSolicitudBody>): Promise<Solicitud> {
  const { data } = await apiClient.patch<Solicitud>(`/solicitudes/${id}`, body);
  return data;
}

export async function deleteSolicitud(id: string): Promise<void> {
  await apiClient.delete(`/solicitudes/${id}`);
}
