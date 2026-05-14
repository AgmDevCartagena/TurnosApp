export const fieldLabels: Record<string, string> = {
  nombre: 'Nombre',
  apellido: 'Apellido',
  email: 'Correo electrónico',
  password: 'Contraseña',
  username: 'Nombre de usuario',
  cedula: 'Cédula',
  direccion: 'Dirección',
  area: 'Área',
  rolId: 'Rol',
  empresaId: 'Empresa',
  centroCostoId: 'Centro de costo',
  activo: 'Estado',
  tipoPersona: 'Tipo de persona',
  tipoIdentificacion: 'Tipo de identificación',
  nit: 'Número de identificación',
  razonSocial: 'Razón social',
  nombreCompleto: 'Nombre completo',
  emailCorporativo: 'Correo corporativo',
  telefono: 'Teléfono',
  paisId: 'País',
  departamentoId: 'Departamento',
  ciudadId: 'Ciudad',
  tipoProveedor: 'Tipo de proveedor',
  tipoEmpresa: 'Tipo de empresa',
  fechaConstitucion: 'Fecha de constitución',
  codigoCiiu: 'Código CIIU',
  descripcionActividad: 'Descripción de actividad',
  repLegalNombres: 'Nombres del representante legal',
  repLegalApellidos: 'Apellidos del representante legal',
  repLegalTipoDoc: 'Tipo de documento del representante legal',
  repLegalNumDoc: 'Número de documento del representante legal',
  repLegalEmail: 'Correo del representante legal',
  repLegalTelefono: 'Teléfono del representante legal',
  codigo: 'Código',
  descripcion: 'Descripción',
  modulo: 'Módulo',
  accion: 'Acción',
  estado: 'Estado',
  numero: 'Número',
  titulo: 'Título',
  prioridad: 'Prioridad',
  moneda: 'Moneda',
  justificacion: 'Justificación',
  totalEstimado: 'Total estimado',
  fechaRequerida: 'Fecha requerida',
  codigoProveedor: 'Código de proveedor',
};

export function getFieldLabel(field: string): string {
  return fieldLabels[field] ?? field;
}

/**
 * Translates English class-validator constraint messages to Spanish.
 * Falls back to the original message if no translation is found.
 */
export function translateConstraintMessage(msg: string, field: string): string {
  const label = getFieldLabel(field);

  if (/should not exist/.test(msg)) {
    return `El campo "${label}" no es válido para esta operación.`;
  }
  if (/should not be empty|must not be empty/.test(msg)) {
    return `El campo "${label}" es obligatorio.`;
  }
  if (/must be an email/.test(msg)) {
    return `El "${label}" no tiene un formato de correo electrónico válido.`;
  }
  if (/must be longer than or equal to (\d+)/.test(msg)) {
    const n = msg.match(/(\d+)/)?.[1];
    return `El campo "${label}" debe tener al menos ${n} caracteres.`;
  }
  if (/must be shorter than or equal to (\d+)/.test(msg)) {
    const n = msg.match(/(\d+)/)?.[1];
    return `El campo "${label}" no puede tener más de ${n} caracteres.`;
  }
  if (/must be a UUID/.test(msg)) {
    return `Debe seleccionar un valor válido para "${label}".`;
  }
  if (/must be a string/.test(msg)) {
    return `El campo "${label}" debe ser texto.`;
  }
  if (/must be a boolean/.test(msg)) {
    return `El campo "${label}" debe ser verdadero o falso.`;
  }
  if (/must be a number/.test(msg)) {
    return `El campo "${label}" debe ser un número.`;
  }
  if (/must be an integer/.test(msg)) {
    return `El campo "${label}" debe ser un número entero.`;
  }
  if (/must be a Date/.test(msg)) {
    return `El campo "${label}" debe ser una fecha válida.`;
  }
  if (/must be one of the following values/.test(msg)) {
    return `El valor seleccionado para "${label}" no es válido.`;
  }
  if (/must contain at least (\d+) element/.test(msg)) {
    const n = msg.match(/(\d+)/)?.[1];
    return `"${label}" debe contener al menos ${n} elemento(s).`;
  }
  if (/must be a valid enum value/.test(msg)) {
    return `El valor de "${label}" no es válido.`;
  }

  return msg;
}

export const httpErrorMessages: Record<number, string> = {
  400: 'La información enviada no es válida. Revise los campos marcados.',
  401: 'Su sesión ha expirado. Inicie sesión nuevamente.',
  403: 'No tiene permisos para realizar esta acción.',
  404: 'No se encontró el registro solicitado.',
  409: 'Ya existe un registro con esta información.',
  500: 'Ocurrió un error interno. Intente nuevamente o contacte al administrador.',
};
