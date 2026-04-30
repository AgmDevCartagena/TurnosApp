import apiClient from './api-client';

export interface CuentaBancaria {
  id: string;
  proveedorId: string;
  titularCuenta: string;
  numeroCuenta: string;
  tipoCuenta: string;
  banco: string;
  ciudad: string;
  condicionPago: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCuentaBancariaPayload {
  titularCuenta: string;
  numeroCuenta: string;
  tipoCuenta: string;
  banco: string;
  ciudad: string;
  condicionPago: string;
}

export async function fetchCuentasBancarias(proveedorId: string): Promise<CuentaBancaria[]> {
  const { data } = await apiClient.get<CuentaBancaria[]>(
    `/proveedores/${proveedorId}/cuentas-bancarias`,
  );
  return data;
}

export async function createCuentaBancaria(
  proveedorId: string,
  payload: CreateCuentaBancariaPayload,
): Promise<CuentaBancaria> {
  const { data } = await apiClient.post<CuentaBancaria>(
    `/proveedores/${proveedorId}/cuentas-bancarias`,
    payload,
  );
  return data;
}

export async function updateCuentaBancaria(
  proveedorId: string,
  cuentaId: string,
  payload: Partial<CreateCuentaBancariaPayload>,
): Promise<CuentaBancaria> {
  const { data } = await apiClient.patch<CuentaBancaria>(
    `/proveedores/${proveedorId}/cuentas-bancarias/${cuentaId}`,
    payload,
  );
  return data;
}

export async function deleteCuentaBancaria(
  proveedorId: string,
  cuentaId: string,
): Promise<CuentaBancaria> {
  const { data } = await apiClient.delete<CuentaBancaria>(
    `/proveedores/${proveedorId}/cuentas-bancarias/${cuentaId}`,
  );
  return data;
}
