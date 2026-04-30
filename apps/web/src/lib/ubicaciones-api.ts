import apiClient from './api-client';

// Interfaces
export interface Pais {
  id: string;
  codigo: string;
  nombre: string;
  nombreOficial?: string;
}

export interface Departamento {
  id: string;
  codigo: string;
  nombre: string;
}

export interface Ciudad {
  id: string;
  codigo: string;
  nombre: string;
}

// API Functions
export async function fetchPaises(): Promise<Pais[]> {
  const { data } = await apiClient.get('/ubicaciones/paises');
  return data.data ?? data;
}

export async function fetchDepartamentos(paisId: string): Promise<Departamento[]> {
  const { data } = await apiClient.get('/ubicaciones/departamentos', {
    params: { paisId },
  });
  return data.data ?? data;
}

export async function fetchCiudades(departamentoId: string): Promise<Ciudad[]> {
  const { data } = await apiClient.get('/ubicaciones/ciudades', {
    params: { departamentoId },
  });
  return data.data ?? data;
}
