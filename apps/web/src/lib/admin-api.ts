import apiClient from './api-client';

// ═══════════════════════════════════════
// USUARIOS
// ═══════════════════════════════════════

export interface Usuario {
  id: string;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  cedula?: string;
  direccion?: string;
  area?: string;
  centroCostoId?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  rol: { id: string; nombre: string; descripcion?: string };
  empresas?: Array<{
    empresa: { id: string; nombre: string };
    rol: { id: string; nombre: string };
  }>;
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
  username: string;
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  cedula: string;
  empresaId: string;
  direccion?: string;
  area?: string;
  centroCostoId?: string;
  rolId: string;
}) {
  const { data } = await apiClient.post('/admin/usuarios', body);
  return data.data ?? data;
}

export async function updateUsuario(
  id: string,
  body: Partial<{
    username: string;
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    cedula: string;
    direccion: string;
    area: string;
    centroCostoId: string;
    rolId: string;
    activo: boolean;
  }>,
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
  codigo: string;
  nombre: string;
  modulo: string;
  accion: string;
  descripcion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface PermisoDetallado extends Permiso {
  _count?: { roles: number };
  roles?: Array<{
    rol: {
      id: string;
      codigo: string;
      nombre: string;
      activo: boolean;
    };
  }>;
}

export async function fetchPermisos(params: {
  page?: number;
  limit?: number;
  search?: string;
  modulo?: string;
  activo?: boolean;
} = {}): Promise<PaginatedResponse<PermisoDetallado>> {
  const { data } = await apiClient.get('/admin/permisos', { params });
  return data;
}

export async function fetchPermiso(id: string): Promise<PermisoDetallado> {
  const { data } = await apiClient.get(`/admin/permisos/${id}`);
  return data.data ?? data;
}

export async function fetchModulosDisponibles(): Promise<Array<{ value: string; label: string; count: number }>> {
  const { data } = await apiClient.get('/admin/permisos/modulos');
  return data.data ?? data;
}

export async function createPermiso(body: {
  codigo: string;
  nombre: string;
  modulo: string;
  accion: string;
  descripcion?: string;
  activo?: boolean;
}): Promise<PermisoDetallado> {
  const { data } = await apiClient.post('/admin/permisos', body);
  return data.data ?? data;
}

export async function updatePermiso(
  id: string,
  body: Partial<{
    nombre: string;
    descripcion: string;
    activo: boolean;
  }>
): Promise<PermisoDetallado> {
  const { data } = await apiClient.put(`/admin/permisos/${id}`, body);
  return data.data ?? data;
}

export async function deletePermiso(id: string) {
  const { data } = await apiClient.delete(`/admin/permisos/${id}`);
  return data;
}

// ═══════════════════════════════════════
// EMPRESAS
// ═══════════════════════════════════════

export interface Empresa {
  id: string;
  nombre: string;
  nit: string;
  razonSocial: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { usuariosEmpresas: number };
}

export async function fetchEmpresas(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<Empresa>> {
  const { data } = await apiClient.get<PaginatedResponse<Empresa>>('/admin/empresas', { params });
  return data;
}

export async function fetchEmpresa(id: string) {
  const { data } = await apiClient.get(`/admin/empresas/${id}`);
  return data.data ?? data;
}

export async function createEmpresa(body: {
  nombre: string;
  nit: string;
  razonSocial: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  activo?: boolean;
}) {
  const { data } = await apiClient.post('/admin/empresas', body);
  return data.data ?? data;
}

export async function updateEmpresa(
  id: string,
  body: Partial<{
    nombre: string;
    nit: string;
    razonSocial: string;
    direccion: string;
    telefono: string;
    email: string;
    activo: boolean;
  }>,
) {
  const { data } = await apiClient.patch(`/admin/empresas/${id}`, body);
  return data.data ?? data;
}

export async function deleteEmpresa(id: string) {
  const { data } = await apiClient.delete(`/admin/empresas/${id}`);
  return data.data ?? data;
}

export async function asignarEmpresaUsuario(body: {
  usuarioId: string;
  empresaId: string;
  rolId: string;
  activo?: boolean;
}) {
  const { data } = await apiClient.post('/admin/empresas/asignar-usuario', body);
  return data.data ?? data;
}

export async function desasignarEmpresaUsuario(usuarioId: string, empresaId: string) {
  const { data } = await apiClient.delete(`/admin/empresas/${empresaId}/usuarios/${usuarioId}`);
  return data.data ?? data;
}

// ═══════════════════════════════════════
// CENTROS DE COSTO
// ═══════════════════════════════════════

export interface CentroCosto {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string;
  empresaId: string;
  activo: boolean;
}

export async function fetchCentrosCosto(empresaId?: string): Promise<CentroCosto[]> {
  const params = empresaId ? { empresaId } : {};
  const { data } = await apiClient.get('/admin/centros-costo', { params });
  return data.data ?? data;
}

export async function fetchCentroCosto(id: string) {
  const { data } = await apiClient.get(`/admin/centros-costo/${id}`);
  return data.data ?? data;
}

export async function createCentroCosto(body: {
  codigo: string;
  nombre: string;
  descripcion?: string;
  empresaId: string;
  activo?: boolean;
}) {
  const { data } = await apiClient.post('/admin/centros-costo', body);
  return data.data ?? data;
}

export async function updateCentroCosto(
  id: string,
  body: Partial<{
    codigo: string;
    nombre: string;
    descripcion: string;
    empresaId: string;
    activo: boolean;
  }>
) {
  const { data } = await apiClient.put(`/admin/centros-costo/${id}`, body);
  return data.data ?? data;
}

export async function deleteCentroCosto(id: string) {
  const { data } = await apiClient.delete(`/admin/centros-costo/${id}`);
  return data.data ?? data;
}

// ═══════════════════════════════════════
// ÁREAS
// ═══════════════════════════════════════

export interface Area {
  id: string;
  codigo: string;
  nombre: string;
  empresaId: string;
  jefeAreaId?: string;
  presupuestoAnual?: number;
  activo: boolean;
}

export async function fetchAreas(empresaId?: string): Promise<Area[]> {
  const params = empresaId ? { empresaId } : {};
  const { data } = await apiClient.get('/admin/areas', { params });
  return data.data ?? data;
}

export async function fetchArea(id: string) {
  const { data } = await apiClient.get(`/admin/areas/${id}`);
  return data.data ?? data;
}

export async function createArea(body: {
  codigo: string;
  nombre: string;
  empresaId: string;
  jefeAreaId?: string;
  presupuestoAnual?: number;
  activo?: boolean;
}) {
  const { data } = await apiClient.post('/admin/areas', body);
  return data.data ?? data;
}

export async function updateArea(
  id: string,
  body: Partial<{
    codigo: string;
    nombre: string;
    empresaId: string;
    jefeAreaId: string;
    presupuestoAnual: number;
    activo: boolean;
  }>
) {
  const { data } = await apiClient.put(`/admin/areas/${id}`, body);
  return data.data ?? data;
}

export async function deleteArea(id: string) {
  const { data } = await apiClient.delete(`/admin/areas/${id}`);
  return data.data ?? data;
}
