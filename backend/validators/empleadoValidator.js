// -------------------------------------------------------------
// Validador de Empleados con Joi
// -------------------------------------------------------------

const Joi = require('joi');

/**
 * Esquema de validación para los datos de un empleado.
 * Se usa para validar registros del CSV o del ingreso manual.
 */
const empleadoSchema = Joi.object({
    nombre: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.base': 'El nombre debe ser un texto.',
            'string.empty': 'El nombre no puede estar vacío.',
            'any.required': 'El campo "nombre" es obligatorio.'
        }),

    salarioBasico: Joi.number()
        .positive()
        .precision(2)
        .required()
        .messages({
            'number.base': 'El salario básico debe ser un número.',
            'number.positive': 'El salario básico debe ser positivo.',
            'any.required': 'El campo "salarioBasico" es obligatorio.'
        }),

    cargo: Joi.string()
        .allow('', null)
        .max(80)
        .messages({
            'string.base': 'El cargo debe ser texto.',
            'string.max': 'El cargo no puede tener más de 80 caracteres.'
        }),

    auxTransporte: Joi.number()
        .allow(null)
        .positive()
        .precision(2)
        .messages({
            'number.base': 'El auxilio de transporte debe ser un número.',
            'number.positive': 'El auxilio de transporte debe ser positivo.'
        }),

    diasTrabajados: Joi.number()
        .integer()
        .allow(null)
        .min(0)
        .max(31)
        .messages({
            'number.base': 'Los días trabajados deben ser un número entero.',
            'number.min': 'Los días trabajados no pueden ser negativos.',
            'number.max': 'Los días trabajados no pueden superar 31.'
        }),

    novedad: Joi.string()
        .allow('', null)
        .max(150)
        .messages({
            'string.base': 'La novedad debe ser texto.',
            'string.max': 'La novedad no puede superar los 150 caracteres.'
        })
});

/**
 * Función de validación reutilizable.
 * @param {Object} empleado - Datos del empleado a validar.
 * @returns {Object} { value, error }
 */
exports.validarEmpleado = (empleado) => {
    return empleadoSchema.validate(empleado, { abortEarly: false });
};
