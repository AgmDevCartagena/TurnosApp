const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface LineaOrden {
  id: string;
  bienServicioId: string;
  bienServicio?: {
    id: string;
    nombre: string;
    codigo: string;
  };
  cantidad: number;
  unidadMedida: string;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

export interface OrdenCompra {
  id: string;
  numero: string;
  empresaId: string;
  solicitudId: string;
  solicitud?: {
    id: string;
    descripcion: string;
  };
  proveedorId: string;
  proveedor?: {
    id: string;
    razonSocial: string;
    nit: string;
  };
  creadorId: string;
  creador?: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
  estado: string;
  condicionesPago: string;
  fechaEmision?: string;
  fechaEntregaEstimada?: string;
  observaciones?: string;
  subtotal: number;
  impuestos: number;
  total: number;
  lineas: LineaOrden[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrdenCompraDto {
  solicitudId: string;
  proveedorId: string;
  estado?: string;
  condicionesPago: string;
  fechaEmision?: string;
  fechaEntregaEstimada?: string;
  observaciones?: string;
  lineas: {
    bienServicioId: string;
    cantidad: number;
    unidadMedida: string;
    precioUnitario: number;
    descuento?: number;
  }[];
}

export interface QueryOrdenCompraParams {
  estado?: string;
  proveedorId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

async function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function fetchOrdenes(params?: QueryOrdenCompraParams) {
  const queryString = new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const url = `${API_URL}/ordenes-compra${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(url, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener órdenes de compra');
  }

  return response.json();
}

export async function fetchOrden(id: string): Promise<OrdenCompra> {
  const response = await fetch(`${API_URL}/ordenes-compra/${id}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al obtener orden de compra');
  }

  return response.json();
}

export async function createOrden(data: CreateOrdenCompraDto): Promise<OrdenCompra> {
  const response = await fetch(`${API_URL}/ordenes-compra`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al crear orden de compra');
  }

  return response.json();
}

export async function updateOrden(id: string, data: Partial<CreateOrdenCompraDto>): Promise<OrdenCompra> {
  const response = await fetch(`${API_URL}/ordenes-compra/${id}`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar orden de compra');
  }

  return response.json();
}

export async function emitirOrden(id: string): Promise<OrdenCompra> {
  const response = await fetch(`${API_URL}/ordenes-compra/${id}/emitir`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al emitir orden de compra');
  }

  return response.json();
}

export async function enviarProveedorOrden(id: string): Promise<OrdenCompra> {
  const response = await fetch(`${API_URL}/ordenes-compra/${id}/enviar-proveedor`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al enviar orden al proveedor');
  }

  return response.json();
}

export async function cancelarOrden(id: string, motivo: string): Promise<OrdenCompra> {
  const response = await fetch(`${API_URL}/ordenes-compra/${id}/cancelar`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ motivo }),
  });

  if (!response.ok) {
    throw new Error('Error al cancelar orden de compra');
  }

  return response.json();
}

export async function deleteOrden(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/ordenes-compra/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Error al eliminar orden de compra');
  }
}
