import apiClient from './api-client';

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === 'true';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function debugLog(tag: string, data: Record<string, unknown>) {
  if (!DEBUG) return;
  console.debug(`[DEBUG][UbicacionesAPI][${tag}]`, {
    apiUrl: API_URL,
    ...data,
  });
}

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
  debugLog('fetchPaises', { endpoint: '/ubicaciones/paises' });
  try {
    const { data, status } = await apiClient.get('/ubicaciones/paises');
    const result: Pais[] = data.data ?? data;
    debugLog('fetchPaises', { responseStatus: status, items: result.length });
    return result;
  } catch (error) {
    debugLog('fetchPaises', { error: String(error) });
    throw error;
  }
}

export async function fetchDepartamentos(paisId: string): Promise<Departamento[]> {
  debugLog('fetchDepartamentos', { endpoint: '/ubicaciones/departamentos', paisId });
  try {
    const { data, status } = await apiClient.get('/ubicaciones/departamentos', {
      params: { paisId },
    });
    const result: Departamento[] = data.data ?? data;
    debugLog('fetchDepartamentos', { responseStatus: status, items: result.length, paisId });
    if (result.length === 0) {
      console.warn(`[UbicacionesAPI] fetchDepartamentos paisId=${paisId} devolvió 0 resultados`);
    }
    return result;
  } catch (error) {
    debugLog('fetchDepartamentos', { error: String(error), paisId });
    throw error;
  }
}

export async function fetchCiudades(departamentoId: string): Promise<Ciudad[]> {
  debugLog('fetchCiudades', { endpoint: '/ubicaciones/ciudades', departamentoId });
  try {
    const { data, status } = await apiClient.get('/ubicaciones/ciudades', {
      params: { departamentoId },
    });
    const result: Ciudad[] = data.data ?? data;
    debugLog('fetchCiudades', { responseStatus: status, items: result.length, departamentoId });
    return result;
  } catch (error) {
    debugLog('fetchCiudades', { error: String(error), departamentoId });
    throw error;
  }
}
