import apiClient from './api-client';

// ═══════════════════════════════════════
// USUARIOS
// ═══════════════════════════════════════

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  rol: { id: string; nombre: string; descripcion?: string };
}

export interface UsuarioQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  rolId?: string;
  activo?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export async function fetchUsuarios(params: UsuarioQueryParams = {}): Promise<PaginatedResponse<Usuario>> {
  const { data } = await apiClient.get<PaginatedResponse<Usuario>>('/admin/usuarios', { params });
  return data;
}

export async function fetchUsuario(id: string) {
  const { data } = await apiClient.get(`/admin/usuarios/${id}`);
  return data.data ?? data;
}

export async function createUsuario(body: {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rolId: string;
}) {
  const { data } = await apiClient.post('/admin/usuarios', body);
  return data.data ?? data;
}

export async function updateUsuario(
  id: string,
  body: Partial<{ email: string; password: string; nombre: string; apellido: string; rolId: string; activo: boolean }>,
) {
  const { data } = await apiClient.patch(`/admin/usuarios/${id}`, body);
  return data.data ?? data;
}

export async function deleteUsuario(id: string) {
  const { data } = await apiClient.delete(`/admin/usuarios/${id}`);
  return data.data ?? data;
}

// ═══════════════════════════════════════
// ROLES
// ═══════════════════════════════════════

export interface Permiso {
  id: string;
  recurso: string;
  accion: string;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { usuarios: number };
  permisos: { permiso: Permiso }[];
}

export async function fetchRoles(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<Rol>> {
  const { data } = await apiClient.get<PaginatedResponse<Rol>>('/admin/roles', { params });
  return data;
}

export async function fetchRol(id: string) {
  const { data } = await apiClient.get(`/admin/roles/${id}`);
  return data.data ?? data;
}

export async function createRol(body: { nombre: string; descripcion?: string; permisoIds?: string[] }) {
  const { data } = await apiClient.post('/admin/roles', body);
  return data.data ?? data;
}

export async function updateRol(
  id: string,
  body: Partial<{ nombre: string; descripcion: string; activo: boolean; permisoIds: string[] }>,
) {
  const { data } = await apiClient.patch(`/admin/roles/${id}`, body);
  return data.data ?? data;
}

export async function deleteRol(id: string) {
  const { data } = await apiClient.delete(`/admin/roles/${id}`);
  return data.data ?? data;
}

// ═══════════════════════════════════════
// PERMISOS
// ═══════════════════════════════════════

export async function fetchPermisos(): Promise<Permiso[]> {
  const { data } = await apiClient.get('/admin/permisos');
  return data.data ?? data;
}
