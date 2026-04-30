import apiClient from './api-client';

export interface TipoDocumento {
  id: string;
  nombre: string;
  descripcion: string | null;
  obligatorio: boolean;
  aplicaPersona: string;
  aplicaProveedor: string;
  requiereVigencia: boolean;
  activo: boolean;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

export async function fetchTiposDocumento(activo?: boolean): Promise<TipoDocumento[]> {
  const params = activo !== undefined ? { activo } : {};
  const { data } = await apiClient.get<TipoDocumento[]>('/tipos-documento-requerido', { params });
  return data;
}

export async function fetchTiposAplicables(
  tipoPersona: string,
  tipoProveedor: string,
): Promise<TipoDocumento[]> {
  const { data } = await apiClient.get<TipoDocumento[]>(
    '/tipos-documento-requerido/aplicables',
    { params: { tipoPersona, tipoProveedor } },
  );
  return data;
}
