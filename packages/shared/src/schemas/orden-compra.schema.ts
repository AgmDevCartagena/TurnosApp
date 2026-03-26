import { z } from 'zod';

const lineaOrdenSchema = z.object({
  bienServicioId: z.string().uuid(),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  unidadMedida: z.string().min(1),
  precioUnitario: z.number().nonnegative('El precio debe ser mayor o igual a 0'),
  descuento: z.number().min(0).max(100).optional().default(0),
});

export const crearOrdenCompraSchema = z.object({
  solicitudId: z.string().uuid(),
  proveedorId: z.string().uuid(),
  condicionesPago: z.string().min(1, 'Las condiciones de pago son requeridas'),
  fechaEntregaEstimada: z.string().datetime(),
  observaciones: z.string().optional(),
  lineas: z.array(lineaOrdenSchema).min(1, 'Debe incluir al menos una línea'),
});

export type LineaOrdenDto = z.infer<typeof lineaOrdenSchema>;
export type CrearOrdenCompraDto = z.infer<typeof crearOrdenCompraSchema>;
