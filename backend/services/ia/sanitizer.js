'use strict';

/**
 * sanitizer.js
 * Sanitiza los datos de programación antes de enviarlos al proveedor IA.
 *
 * REGLAS:
 * - Nunca expone: cédulas, salarios, cuentas bancarias, datos sensibles GDPR.
 * - Siempre anonimiza: nombres reales reemplazados por alias reproducibles.
 * - Retorna SOLO los campos necesarios para el análisis de patrones.
 * - Los alias son deterministas por sesión/empresa (no se persisten).
 */

const crypto = require('crypto');

// ─── Anonimización determinista ───────────────────────────────────────────────

/**
 * Genera un alias reproducible para un ID de empleado.
 * El alias es estable dentro de la misma sesión/contexto pero no revela el ID real.
 * @param {string} empleadoId
 * @param {string} salt - empresaId u otro salt de sesión
 * @returns {string} alias tipo 'EMP_A3F2'
 */
function generarAlias(empleadoId, salt = '') {
  const hash = crypto
    .createHash('sha256')
    .update(`${salt}::${empleadoId}`)
    .digest('hex')
    .substring(0, 4)
    .toUpperCase();
  return `EMP_${hash}`;
}

// ─── Sanitización de asignaciones ────────────────────────────────────────────

/**
 * Sanitiza una lista de asignaciones para el contexto IA.
 * Elimina: empleadoId real, documentos, nombres, salarios.
 * Conserva: alias, área, turno, fechas, duración.
 *
 * @param {Array}  asignaciones
 * @param {string} empresaId - salt para alias deterministas
 * @param {Object} opciones
 * @param {boolean} opciones.incluirNombres - solo si ConfiguracionIA.permitirNombres=true
 * @param {boolean} opciones.incluirSalarios - SIEMPRE false (bloqueado en este módulo)
 * @returns {{ asignacionesSanitizadas: Array, mapaAlias: Object }}
 */
function sanitizarAsignaciones(asignaciones, empresaId, opciones = {}) {
  const { incluirNombres = false } = opciones;
  const mapaAlias = {};

  const asignacionesSanitizadas = asignaciones.map(asig => {
    const alias = generarAlias(asig.empleadoId, empresaId);
    mapaAlias[alias] = asig.empleadoId;

    const sanitizada = {
      alias,
      turno:       asig.turno,
      area:        asig.area,
      fechaInicio: asig.fechaInicio,
      fechaFin:    asig.fechaFin,
      tipoTurno:   asig.tipoTurno || null,
    };

    if (incluirNombres && asig.nombreEmpleado) {
      sanitizada.nombre = asig.nombreEmpleado;
    }

    return sanitizada;
  });

  return { asignacionesSanitizadas, mapaAlias };
}

// ─── Sanitización de empleados ────────────────────────────────────────────────

/**
 * Sanitiza perfil de empleado: elimina documento, salario, cuenta bancaria, fechaNacimiento.
 * @param {Object} empleado
 * @param {string} empresaId
 * @param {Object} opciones
 * @param {boolean} opciones.incluirNombres
 * @returns {Object}
 */
function sanitizarEmpleado(empleado, empresaId, opciones = {}) {
  const { incluirNombres = false } = opciones;
  const alias = generarAlias(empleado.id || empleado._id?.toString(), empresaId);

  const resultado = {
    alias,
    area:          empleado.area || null,
    cargo:         empleado.cargo || null,
    tipoContrato:  empleado.tipoContrato || null,
    estado:        empleado.estado || 'activo',
  };

  if (incluirNombres && empleado.nombre) {
    resultado.nombre = empleado.nombre;
  }

  return resultado;
}

// ─── Sanitización de indicadores ─────────────────────────────────────────────

/**
 * Sanitiza indicadores operativos: elimina valores monetarios absolutos.
 * Conserva ratios, porcentajes y conteos.
 * @param {Object} indicadores
 * @returns {Object}
 */
function sanitizarIndicadores(indicadores) {
  const camposBloqueados = ['costoTotal', 'salarioPromedio', 'salarioMaximo', 'salarioMinimo',
    'costoPorHora', 'nominaMensual', 'presupuesto'];

  const resultado = {};
  for (const [key, val] of Object.entries(indicadores)) {
    const bloqueado = camposBloqueados.some(c => key.toLowerCase().includes(c.toLowerCase()));
    if (!bloqueado) {
      resultado[key] = val;
    }
  }
  return resultado;
}

// ─── Sanitización de texto libre ─────────────────────────────────────────────

const PATRONES_SENSIBLES = [
  { regex: /\b\d{6,12}\b/g,                     reemplazo: '[ID_OMITIDO]' },
  { regex: /\$\s*[\d.,]+/g,                      reemplazo: '[VALOR_OMITIDO]' },
  { regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, reemplazo: '[EMAIL_OMITIDO]' },
  { regex: /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g,  reemplazo: '[TEL_OMITIDO]' },
  { regex: /cuenta\s*\d+/gi,                     reemplazo: '[CUENTA_OMITIDA]' },
];

/**
 * Limpia texto libre de datos potencialmente sensibles.
 * @param {string} texto
 * @returns {string}
 */
function sanitizarTexto(texto) {
  if (typeof texto !== 'string') return texto;
  let resultado = texto;
  for (const { regex, reemplazo } of PATRONES_SENSIBLES) {
    resultado = resultado.replace(regex, reemplazo);
  }
  return resultado;
}

// ─── Validación de respuesta IA ───────────────────────────────────────────────

/**
 * Verifica que la respuesta de la IA no contenga datos que no debería conocer.
 * Lanza Error si detecta fugas de información.
 * @param {string} respuestaIA
 * @param {Set<string>} idsReales - Set de IDs reales que NUNCA deben aparecer
 * @returns {boolean}
 */
function validarRespuestaIA(respuestaIA, idsReales = new Set()) {
  if (typeof respuestaIA !== 'string') return true;
  for (const id of idsReales) {
    if (respuestaIA.includes(id)) {
      throw new Error(`[sanitizer] Fuga de dato sensible en respuesta IA: ID encontrado en output`);
    }
  }
  return true;
}

module.exports = {
  generarAlias,
  sanitizarAsignaciones,
  sanitizarEmpleado,
  sanitizarIndicadores,
  sanitizarTexto,
  validarRespuestaIA,
};
