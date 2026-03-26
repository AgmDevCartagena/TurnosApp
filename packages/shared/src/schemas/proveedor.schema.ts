import { z } from 'zod';

export const crearProveedorSchema = z.object({
  razonSocial: z.string().min(2, 'La razón social debe tener al menos 2 caracteres'),
  nit: z
    .string()
    .min(5, 'El NIT debe tener al menos 5 caracteres')
    .regex(/^[0-9-]+$/, 'El NIT solo puede contener números y guiones'),
  contacto: z.string().min(2, 'El contacto debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().min(7, 'El teléfono debe tener al menos 7 caracteres'),
  direccion: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
});

export const evaluarProveedorSchema = z.object({
  proveedorId: z.string().uuid(),
  periodo: z.string().min(1, 'El periodo es requerido'),
  calidad: z.number().min(0).max(100),
  cumplimiento: z.number().min(0).max(100),
  precio: z.number().min(0).max(100),
  observaciones: z.string().optional(),
});

export type CrearProveedorDto = z.infer<typeof crearProveedorSchema>;
export type EvaluarProveedorDto = z.infer<typeof evaluarProveedorSchema>;
