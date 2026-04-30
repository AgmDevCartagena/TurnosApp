const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface AtributoDinamico {
  id: string;
  nombre: string;
  categoria: string;
  tipoDato: 'TEXTO' | 'NUMERO' | 'LISTA' | 'BOOLEANO';
  valores?: string;
  obligatorio: boolean;
  activo: boolean;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAtributoDto {
  nombre: string;
  categoria: string;
  tipoDato: 'TEXTO' | 'NUMERO' | 'LISTA' | 'BOOLEANO';
  valores?: string;
  obligatorio?: boolean;
  activo?: boolean;
  orden?: number;
}

export interface UpdateAtributoDto {
  nombre?: string;
  categoria?: string;
  tipoDato?: 'TEXTO' | 'NUMERO' | 'LISTA' | 'BOOLEANO';
  valores?: string;
  obligatorio?: boolean;
  activo?: boolean;
  orden?: number;
}

export interface QueryAtributoParams {
  categoria?: string;
  activo?: boolean;
}

async function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function fetchAtributos(params?: QueryAtributoParams): Promise<AtributoDinamico[]> {
  const queryString = new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const url = `${API_URL}/atributos${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(url, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener atributos');
  }

  return response.json();
}

export async function fetchAtributo(id: string): Promise<AtributoDinamico> {
  const response = await fetch(`${API_URL}/atributos/${id}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener atributo');
  }

  return response.json();
}

export async function fetchCategorias(): Promise<string[]> {
  const response = await fetch(`${API_URL}/atributos/categorias`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener categorías');
  }

  return response.json();
}

export async function createAtributo(data: CreateAtributoDto): Promise<AtributoDinamico> {
  const response = await fetch(`${API_URL}/atributos`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear atributo');
  }

  return response.json();
}

export async function updateAtributo(id: string, data: UpdateAtributoDto): Promise<AtributoDinamico> {
  const response = await fetch(`${API_URL}/atributos/${id}`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar atributo');
  }

  return response.json();
}

export async function toggleActivoAtributo(id: string): Promise<AtributoDinamico> {
  const response = await fetch(`${API_URL}/atributos/${id}/toggle-activo`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al cambiar estado del atributo');
  }

  return response.json();
}

export async function deleteAtributo(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/atributos/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al eliminar atributo');
  }
}
