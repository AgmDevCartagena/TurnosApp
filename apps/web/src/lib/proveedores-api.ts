import apiClient from './api-client';

export interface Proveedor {
  id: string;
  codigoProveedor?: string;
  tipoProveedor: string;
  tipoPersona: string;
  razonSocial: string;
  nombreCompleto?: string;
  tipoIdentificacion: string;
  nit: string;
  direccion: string;
  paisId?: string | null;
  departamentoId?: string | null;
  ciudadId?: string | null;
  departamento: string | null;
  ciudad: string | null;
  telefono: string;
  emailCorporativo: string;
  tipoEmpresa: string | null;
  fechaConstitucion: string | null;
  codigoCiiu: string | null;
  descripcionActividad: string | null;
  certificaciones: string[];
  observaciones: string | null;
  repLegalNombres: string | null;
  repLegalApellidos: string | null;
  repLegalTipoDoc: string | null;
  repLegalNumDoc: string | null;
  repLegalTelefono: string | null;
  repLegalEmail: string | null;
  regimenIva: string | null;
  esAutorretenedorRenta: boolean;
  resolucionRentaNo: string | null;
  resolucionRentaFecha: string | null;
  resolucionRentaPct: string | null;
  esGranContribuyente: boolean;
  resolucionGcNo: string | null;
  resolucionGcFecha: string | null;
  actividadesIca: string[];
  codigoIca: string | null;
  municipioIca: string | null;
  esAutorretenedorIca: boolean;
  rangoExperiencia: string | null;
  descripcionExperiencia: string | null;
  estadoOnboarding: string;
  estadoOperativo: string;
  estado: string;
  creadoPor: { id: string; nombre: string; apellido: string } | null;
  createdAt: string;
  updatedAt: string;
  _count?: { evaluaciones: number; ordenes: number; documentos: number };
}

export interface ProveedorQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  estado?: string;
  tipoProveedor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export async function fetchProveedores(
  params: ProveedorQueryParams = {},
): Promise<PaginatedResponse<Proveedor>> {
  const { data } = await apiClient.get<PaginatedResponse<Proveedor>>('/proveedores', { params });
  return data;
}

export async function fetchProveedor(id: string): Promise<Proveedor> {
  const { data } = await apiClient.get<Proveedor>(`/proveedores/${id}`);
  return data;
}

export async function createProveedor(body: Partial<Proveedor>): Promise<Proveedor> {
  const { data } = await apiClient.post<Proveedor>('/proveedores', body);
  return data;
}

export async function updateProveedor(id: string, body: Partial<Proveedor>): Promise<Proveedor> {
  const { data } = await apiClient.patch<Proveedor>(`/proveedores/${id}`, body);
  return data;
}

export async function deleteProveedor(id: string): Promise<Proveedor> {
  const { data } = await apiClient.delete<Proveedor>(`/proveedores/${id}`);
  return data;
}

export async function validateNit(nit: string): Promise<{ available: boolean }> {
  const { data } = await apiClient.get(`/proveedores/validate/nit`, {
    params: { nit },
  });
  return data;
}

export async function validateEmail(email: string): Promise<{ available: boolean }> {
  const { data } = await apiClient.get(`/proveedores/validate/email`, {
    params: { email },
  });
  return data;
}
