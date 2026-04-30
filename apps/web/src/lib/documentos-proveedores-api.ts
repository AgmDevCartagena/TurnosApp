import apiClient from './api-client';
import type { TipoDocumento } from './tipos-documento-api';

export interface DocumentoProveedor {
  id: string;
  proveedorId: string;
  tipoDocumentoId: string;
  tipoDocumento: TipoDocumento;
  nombre: string;
  url: string | null;
  fechaExpedicion: string | null;
  fechaVencimiento: string | null;
  estado: string;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDocumentoPayload {
  tipoDocumentoId: string;
  nombre: string;
  url?: string;
  fechaExpedicion?: string;
  fechaVencimiento?: string;
  observaciones?: string;
}

export async function fetchDocumentosProveedor(proveedorId: string): Promise<DocumentoProveedor[]> {
  const { data } = await apiClient.get<DocumentoProveedor[]>(
    `/proveedores/${proveedorId}/documentos-wizard`,
  );
  return data;
}

export async function upsertDocumentoProveedor(
  proveedorId: string,
  payload: UpsertDocumentoPayload,
): Promise<DocumentoProveedor> {
  const { data } = await apiClient.post<DocumentoProveedor>(
    `/proveedores/${proveedorId}/documentos-wizard`,
    payload,
  );
  return data;
}

export async function updateDocumentoProveedor(
  proveedorId: string,
  docId: string,
  payload: Partial<UpsertDocumentoPayload>,
): Promise<DocumentoProveedor> {
  const { data } = await apiClient.patch<DocumentoProveedor>(
    `/proveedores/${proveedorId}/documentos-wizard/${docId}`,
    payload,
  );
  return data;
}

export async function deleteDocumentoProveedor(
  proveedorId: string,
  docId: string,
): Promise<DocumentoProveedor> {
  const { data } = await apiClient.delete<DocumentoProveedor>(
    `/proveedores/${proveedorId}/documentos-wizard/${docId}`,
  );
  return data;
}
