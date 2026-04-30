import apiClient from './api-client';

export interface Socio {
  id: string;
  proveedorId: string;
  tipoDoc: string;
  numeroDoc: string;
  nombreRazon: string;
  participacion: string;
  tipoParticipacion: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSocioPayload {
  tipoDoc: string;
  numeroDoc: string;
  nombreRazon: string;
  participacion: string;
  tipoParticipacion: string;
}

export async function fetchSocios(proveedorId: string): Promise<Socio[]> {
  const { data } = await apiClient.get<Socio[]>(`/proveedores/${proveedorId}/socios`);
  return data;
}

export async function createSocio(
  proveedorId: string,
  payload: CreateSocioPayload,
): Promise<Socio> {
  const { data } = await apiClient.post<Socio>(`/proveedores/${proveedorId}/socios`, payload);
  return data;
}

export async function updateSocio(
  proveedorId: string,
  socioId: string,
  payload: Partial<CreateSocioPayload>,
): Promise<Socio> {
  const { data } = await apiClient.patch<Socio>(
    `/proveedores/${proveedorId}/socios/${socioId}`,
    payload,
  );
  return data;
}

export async function deleteSocio(proveedorId: string, socioId: string): Promise<Socio> {
  const { data } = await apiClient.delete<Socio>(
    `/proveedores/${proveedorId}/socios/${socioId}`,
  );
  return data;
}
