import { z } from 'zod';

const lineaSolicitudSchema = z.object({
  bienServicioId: z.string().uuid(),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  unidadMedida: z.string().min(1, 'La unidad de medida es requerida'),
  especificaciones: z.string().optional(),
  precioEstimado: z.number().nonnegative().optional(),
});

export const crearSolicitudSchema = z.object({
  justificacion: z.string().min(10, 'La justificación debe tener al menos 10 caracteres'),
  centroCostoId: z.string().uuid('Centro de costo inválido'),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']),
  fechaRequerida: z.string().datetime().optional(),
  lineas: z.array(lineaSolicitudSchema).min(1, 'Debe incluir al menos una línea'),
});

export type LineaSolicitudDto = z.infer<typeof lineaSolicitudSchema>;
export type CrearSolicitudDto = z.infer<typeof crearSolicitudSchema>;
