'use strict';

/**
 * Middleware de validación de entradas — protección contra XSS, inyección HTML/JS y datos maliciosos.
 * Usa Joi para definir esquemas estrictos por entidad.
 * Rechaza cualquier campo que contenga etiquetas HTML, atributos de eventos o código JavaScript.
 */

const Joi = require('joi');

// ─── Patrón de caracteres peligrosos ─────────────────────────────────────────
// Detecta: < > etiquetas HTML, javascript:, handlers on*, data: URLs
const HTML_PELIGROSO = /[<>]|javascript\s*:|on[a-z]{2,}\s*=|data\s*:/i;

/**
 * Extensión Joi: string.sinHtml()
 * Rechaza cualquier string que contenga HTML o patrones ejecutables.
 */
const joiSinHtml = Joi.extend((joi) => ({
  type: 'string',
  base: joi.string(),
  messages: {
    'string.sinHtml': '{{#label}} contiene etiquetas HTML o código JavaScript no permitido.'
  },
  rules: {
    sinHtml: {
      validate(value, helpers) {
        if (HTML_PELIGROSO.test(value)) {
          return helpers.error('string.sinHtml');
        }
        return value;
      }
    }
  }
}));

// ─── Alias de tipos base con la regla sinHtml ─────────────────────────────────
const textoSeguro = joiSinHtml.string().trim().sinHtml();

// ─── Esquemas ─────────────────────────────────────────────────────────────────

const schemaEmpresaCrear = joiSinHtml.object({
  nombre: textoSeguro
    .min(2).max(150)
    .required()
    .messages({
      'string.empty':   'El nombre de empresa es requerido.',
      'string.min':     'El nombre debe tener al menos 2 caracteres.',
      'string.max':     'El nombre no puede superar 150 caracteres.',
      'any.required':   'El nombre de empresa es requerido.',
      'string.sinHtml': 'El nombre de empresa no puede contener etiquetas HTML ni código JavaScript.'
    }),

  nit: joiSinHtml.string().trim()
    .max(20)
    .pattern(/^[0-9\-]+$/, 'NIT')
    .optional().allow('', null)
    .messages({
      'string.max':           'El NIT no puede superar 20 caracteres.',
      'string.pattern.name':  'El NIT solo puede contener números y guiones.',
      'string.sinHtml':       'El NIT contiene caracteres no permitidos.'
    }),

  razonSocial: textoSeguro
    .max(200)
    .optional().allow('', null)
    .messages({
      'string.max':     'La razón social no puede superar 200 caracteres.',
      'string.sinHtml': 'La razón social no puede contener etiquetas HTML ni código JavaScript.'
    }),

  dominio: joiSinHtml.string().trim()
    .max(100)
    .pattern(/^[a-zA-Z0-9.\-_]*$/, 'dominio')
    .optional().allow('', null)
    .messages({
      'string.max':           'El dominio no puede superar 100 caracteres.',
      'string.pattern.name':  'El dominio solo puede contener letras, números, puntos y guiones.',
      'string.sinHtml':       'El dominio contiene caracteres no permitidos.'
    }),

  colorTema: joiSinHtml.string().trim()
    .pattern(/^#[0-9a-fA-F]{3,8}$/, 'color_hex')
    .optional().allow('', null)
    .messages({ 'string.pattern.name': 'El color debe ser un valor hexadecimal válido (ej: #667eea).' }),

  estado: Joi.string().valid('activa', 'inactiva', 'suspendida').optional(),

  modulosHabilitados: Joi.array()
    .items(Joi.string().valid(
      'turnos', 'nomina', 'usuarios', 'parametros', 'reportes',
      'empresas', 'areas', 'transporte', 'programacion_operativa'
    ))
    .optional(),

  adminUsuario: joiSinHtml.object({
    username: joiSinHtml.string().trim().min(3).max(50)
      .pattern(/^[a-zA-Z0-9_.\-]+$/, 'username')
      .optional().allow('', null)
      .messages({
        'string.pattern.name': 'El usuario solo puede contener letras, números, punto, guion y guion bajo.'
      }),
    password: Joi.string().min(4).max(100).optional().allow('', null)
      .messages({ 'string.min': 'La contraseña del admin debe tener al menos 4 caracteres.' }),
    nombre: textoSeguro.max(150).optional().allow('', null)
      .messages({ 'string.sinHtml': 'El nombre del administrador no puede contener HTML ni JavaScript.' })
  }).optional().allow(null)
});

const schemaEmpresaActualizar = schemaEmpresaCrear.fork(
  ['nombre'], (field) => field.optional()
);

// ─── Área ─────────────────────────────────────────────────────────────────────
const schemaArea = joiSinHtml.object({
  nombre: textoSeguro
    .min(2).max(100)
    .required()
    .messages({
      'string.empty':   'El nombre del área es requerido.',
      'string.min':     'El nombre debe tener al menos 2 caracteres.',
      'string.max':     'El nombre no puede superar 100 caracteres.',
      'any.required':   'El nombre del área es requerido.',
      'string.sinHtml': 'El nombre del área no puede contener etiquetas HTML ni código JavaScript.'
    }),

  codigo: joiSinHtml.string().trim().max(20)
    .pattern(/^[a-zA-Z0-9_\-]*$/, 'codigo_area')
    .optional().allow('', null)
    .messages({
      'string.max':           'El código no puede superar 20 caracteres.',
      'string.pattern.name':  'El código del área solo puede contener letras, números, guion y guion bajo.'
    }),

  descripcion: textoSeguro.max(300).optional().allow('', null)
    .messages({
      'string.max':     'La descripción no puede superar 300 caracteres.',
      'string.sinHtml': 'La descripción no puede contener etiquetas HTML ni código JavaScript.'
    }),

  empresaId: Joi.string().uuid().optional().allow(null),
  estado:    Joi.string().valid('activo', 'inactivo').optional()
});

const schemaAreaActualizar = schemaArea.fork(
  ['nombre'], (field) => field.optional()
);

// ─── Usuario ──────────────────────────────────────────────────────────────────
const schemaUsuarioCrear = joiSinHtml.object({
  username: joiSinHtml.string().trim().min(3).max(50)
    .pattern(/^[a-zA-Z0-9_.\-]+$/, 'username')
    .required()
    .messages({
      'string.empty':         'El usuario es requerido.',
      'string.min':           'El usuario debe tener al menos 3 caracteres.',
      'string.max':           'El usuario no puede superar 50 caracteres.',
      'string.pattern.name':  'El usuario solo puede contener letras, números, punto, guion y guion bajo.',
      'any.required':         'El usuario es requerido.'
    }),

  password: Joi.string().min(4).max(100)
    .required()
    .messages({
      'string.empty':   'La contraseña es requerida.',
      'string.min':     'La contraseña debe tener al menos 4 caracteres.',
      'any.required':   'La contraseña es requerida.'
    }),

  nombre: textoSeguro
    .min(2).max(150)
    .required()
    .messages({
      'string.empty':   'El nombre es requerido.',
      'string.min':     'El nombre debe tener al menos 2 caracteres.',
      'string.max':     'El nombre no puede superar 150 caracteres.',
      'any.required':   'El nombre es requerido.',
      'string.sinHtml': 'El nombre no puede contener etiquetas HTML ni código JavaScript.'
    }),

  correo: Joi.string().email({ tlds: { allow: false } }).max(200)
    .optional().allow('', null)
    .messages({
      'string.email': 'El correo electrónico no tiene un formato válido.',
      'string.max':   'El correo no puede superar 200 caracteres.'
    }),

  rol: Joi.string().valid('admin', 'usuario', 'super_admin').optional(),

  empresaId:         Joi.string().uuid().optional().allow(null),
  modulosPermitidos: Joi.array().items(Joi.string().max(50)).optional(),
  areasPermitidas:   Joi.array().items(
    Joi.alternatives().try(Joi.string(), Joi.object())
  ).optional(),

  empresas: Joi.array().items(
    Joi.object({
      empresaId: Joi.string().uuid().required(),
      rolId:     Joi.string().uuid().required(),
      modulos:   Joi.array().items(Joi.string()).optional(),
      areas:     Joi.array().items(Joi.string()).optional(),
      permisos:  Joi.array().items(Joi.string()).optional()
    })
  ).optional()
});

const schemaUsuarioEditar = joiSinHtml.object({
  nombre: textoSeguro
    .min(2).max(150)
    .optional()
    .messages({
      'string.min':     'El nombre debe tener al menos 2 caracteres.',
      'string.max':     'El nombre no puede superar 150 caracteres.',
      'string.sinHtml': 'El nombre no puede contener etiquetas HTML ni código JavaScript.'
    }),

  username: joiSinHtml.string().trim().min(3).max(50)
    .pattern(/^[a-zA-Z0-9_.\-]+$/, 'username')
    .optional()
    .messages({
      'string.pattern.name': 'El usuario solo puede contener letras, números, punto, guion y guion bajo.'
    }),

  correo: Joi.string().email({ tlds: { allow: false } }).max(200)
    .optional().allow('', null)
    .messages({ 'string.email': 'El correo electrónico no tiene un formato válido.' }),

  rol:    Joi.string().valid('admin', 'usuario', 'super_admin').optional(),
  activo: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),

  modulosPermitidos: Joi.array().items(Joi.string().max(50)).optional(),
  areasPermitidas:   Joi.array().items(
    Joi.alternatives().try(Joi.string(), Joi.object())
  ).optional(),

  empresas: Joi.array().items(
    Joi.object({
      empresaId: Joi.string().uuid().required(),
      rolId:     Joi.string().uuid().required(),
      modulos:   Joi.array().items(Joi.string()).optional(),
      areas:     Joi.array().items(Joi.string()).optional(),
      permisos:  Joi.array().items(Joi.string()).optional()
    })
  ).optional()
});

// ─── Rol ──────────────────────────────────────────────────────────────────────
const schemaRolCrear = joiSinHtml.object({
  codigo: joiSinHtml.string().trim().min(2).max(60)
    .pattern(/^[a-zA-Z0-9_]+$/, 'codigo_rol')
    .required()
    .messages({
      'string.empty':         'El código del rol es requerido.',
      'string.min':           'El código debe tener al menos 2 caracteres.',
      'string.max':           'El código no puede superar 60 caracteres.',
      'string.pattern.name':  'El código del rol solo puede contener letras, números y guion bajo.',
      'any.required':         'El código del rol es requerido.'
    }),

  nombre: textoSeguro
    .min(2).max(100)
    .required()
    .messages({
      'string.empty':   'El nombre del rol es requerido.',
      'string.min':     'El nombre debe tener al menos 2 caracteres.',
      'string.max':     'El nombre no puede superar 100 caracteres.',
      'any.required':   'El nombre del rol es requerido.',
      'string.sinHtml': 'El nombre del rol no puede contener etiquetas HTML ni código JavaScript.'
    }),

  descripcion: textoSeguro.max(300).optional().allow('', null)
    .messages({
      'string.max':     'La descripción no puede superar 300 caracteres.',
      'string.sinHtml': 'La descripción no puede contener etiquetas HTML ni código JavaScript.'
    }),

  permisos: Joi.array().items(Joi.string().max(100)).optional()
});

const schemaRolEditar = joiSinHtml.object({
  nombre: textoSeguro.min(2).max(100).optional()
    .messages({
      'string.min':     'El nombre debe tener al menos 2 caracteres.',
      'string.max':     'El nombre no puede superar 100 caracteres.',
      'string.sinHtml': 'El nombre del rol no puede contener etiquetas HTML ni código JavaScript.'
    }),

  descripcion: textoSeguro.max(300).optional().allow('', null)
    .messages({
      'string.max':     'La descripción no puede superar 300 caracteres.',
      'string.sinHtml': 'La descripción no puede contener etiquetas HTML ni código JavaScript.'
    })
});

// ─── Factory de middleware ────────────────────────────────────────────────────
function validar(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly:    false,
      stripUnknown:  false,
      convert:       true
    });
    if (error) {
      const msgs = error.details.map(d => d.message);
      return res.status(400).json({ success: false, error: msgs.join(' | ') });
    }
    req.body = value;
    next();
  };
}

// ─── Exportar middlewares ─────────────────────────────────────────────────────
module.exports = {
  validarEmpresaCrear:      validar(schemaEmpresaCrear),
  validarEmpresaActualizar: validar(schemaEmpresaActualizar),
  validarArea:              validar(schemaArea),
  validarAreaActualizar:    validar(schemaAreaActualizar),
  validarUsuarioCrear:      validar(schemaUsuarioCrear),
  validarUsuarioEditar:     validar(schemaUsuarioEditar),
  validarRolCrear:          validar(schemaRolCrear),
  validarRolEditar:         validar(schemaRolEditar)
};
