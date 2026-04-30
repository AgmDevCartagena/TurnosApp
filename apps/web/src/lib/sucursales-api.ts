import apiClient from './api-client';

export interface Sucursal {
  id: string;
  proveedorId: string;
  numero: number;
  direccion: string;
  ciudad: string;
  pais?: string | null;
  contacto: string;
  telefono: string;
  fax?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSucursalPayload {
  direccion: string;
  ciudad: string;
  pais?: string;
  contacto: string;
  telefono: string;
  fax?: string;
}

export async function fetchSucursales(proveedorId: string): Promise<Sucursal[]> {
  const { data } = await apiClient.get<Sucursal[]>(`/proveedores/${proveedorId}/sucursales`);
  return data;
}

export async function createSucursal(
  proveedorId: string,
  payload: CreateSucursalPayload,
): Promise<Sucursal> {
  const { data } = await apiClient.post<Sucursal>(
    `/proveedores/${proveedorId}/sucursales`,
    payload,
  );
  return data;
}

export async function updateSucursal(
  proveedorId: string,
  sucursalId: string,
  payload: Partial<CreateSucursalPayload>,
): Promise<Sucursal> {
  const { data } = await apiClient.patch<Sucursal>(
    `/proveedores/${proveedorId}/sucursales/${sucursalId}`,
    payload,
  );
  return data;
}

export async function deleteSucursal(
  proveedorId: string,
  sucursalId: string,
): Promise<Sucursal> {
  const { data } = await apiClient.delete<Sucursal>(
    `/proveedores/${proveedorId}/sucursales/${sucursalId}`,
  );
  return data;
}
