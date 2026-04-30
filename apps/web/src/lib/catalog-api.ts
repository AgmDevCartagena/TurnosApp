import apiClient from './api-client';

// ═══════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════

export interface Producto {
  id: string;
  bienServicioId: string;
  sku: string;
  slug: string;
  nombreCorto: string;
  descripcionCorta?: string;
  descripcionLarga?: string;
  marca?: string;
  modelo?: string;
  imagenPrincipal?: string;
  imagenesAdicionales: string[];
  fichatecnicaUrl?: string;
  stockDisponible: number;
  stockMinimo: number;
  tiempoEntregaDias?: number;
  destacado: boolean;
  nuevo: boolean;
  enOferta: boolean;
  precioReferencial?: number;
  visibleCatalogo: boolean;
  ordenVisualizacion: number;
  createdAt: string;
  updatedAt: string;
  bienServicio?: {
    id: string;
    nombre: string;
    descripcion?: string;
    unidadMedida: string;
    tipo: string;
    categoria?: {
      id: string;
      nombre: string;
      codigo: string;
    };
  };
  proveedores?: ProductoProveedor[];
  _count?: {
    proveedores: number;
  };
}

export interface ProductoProveedor {
  id: string;
  productoId: string;
  proveedorId: string;
  precioNegociado: number;
  moneda: string;
  tiempoEntregaDias?: number;
  cantidadMinima: number;
  cantidadMaxima?: number;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  activo: boolean;
  preferido: boolean;
  proveedor?: {
    id: string;
    razonSocial: string;
    nit: string;
    telefono?: string;
    emailCorporativo?: string;
  };
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  codigo: string;
  padreId?: string;
  activo: boolean;
  _count?: {
    bienes: number;
  };
}

export interface Carrito {
  id: string;
  usuarioId: string;
  empresaId: string;
  estado: string;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
  items: ItemCarrito[];
  subtotal: number;
  itemsCount: number;
}

export interface ItemCarrito {
  id: string;
  carritoId: string;
  productoId: string;
  proveedorId?: string;
  cantidad: number;
  precioUnitario: number;
  moneda: string;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
  producto: Producto;
  proveedor?: {
    id: string;
    razonSocial: string;
    nit: string;
  };
}

export interface CatalogQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoriaId?: string;
  marca?: string;
  destacado?: boolean;
  nuevo?: boolean;
  enOferta?: boolean;
  precioMin?: number;
  precioMax?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AddToCartData {
  productoId: string;
  cantidad: number;
  proveedorId?: string;
  observaciones?: string;
}

export interface UpdateCartItemData {
  cantidad?: number;
  observaciones?: string;
}

export interface CheckoutData {
  centroCostoId: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  justificacion: string;
  titulo?: string;
  observaciones?: string;
  fechaRequerida?: string;
}

// ═══════════════════════════════════════
// CATÁLOGO
// ═══════════════════════════════════════

export async function fetchProducts(params: CatalogQueryParams = {}): Promise<PaginatedResponse<Producto>> {
  const { data } = await apiClient.get<PaginatedResponse<Producto>>('/catalog/products', { params });
  return data;
}

export async function fetchProductBySlug(slug: string): Promise<Producto> {
  const { data } = await apiClient.get(`/catalog/products/${slug}`);
  return data;
}

export async function fetchCategories(): Promise<Categoria[]> {
  const { data } = await apiClient.get('/catalog/categories');
  return data;
}

export async function fetchBrands(): Promise<string[]> {
  const { data } = await apiClient.get('/catalog/brands');
  return data;
}

// ═══════════════════════════════════════
// CARRITO
// ═══════════════════════════════════════

export async function fetchCart(): Promise<Carrito> {
  const { data } = await apiClient.get('/cart');
  return data;
}

export async function addToCart(itemData: AddToCartData): Promise<Carrito> {
  const { data } = await apiClient.post('/cart/items', itemData);
  return data;
}

export async function updateCartItem(itemId: string, itemData: UpdateCartItemData): Promise<Carrito> {
  const { data } = await apiClient.put(`/cart/items/${itemId}`, itemData);
  return data;
}

export async function removeCartItem(itemId: string): Promise<Carrito> {
  const { data } = await apiClient.delete(`/cart/items/${itemId}`);
  return data;
}

export async function clearCart(): Promise<Carrito> {
  const { data } = await apiClient.delete('/cart');
  return data;
}

export async function validateCheckout(): Promise<{
  valid: boolean;
  errors: string[];
  itemsCount: number;
  subtotal: number;
}> {
  const { data } = await apiClient.get('/cart/validate');
  return data;
}

export async function checkout(checkoutData: CheckoutData): Promise<{
  solicitud: any;
  message: string;
}> {
  const { data } = await apiClient.post('/cart/checkout', checkoutData);
  return data;
}
