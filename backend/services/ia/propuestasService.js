'use strict';

/**
 * propuestasService.js
 * CRUD de PropuestaProgramacionIA con aislamiento de tenant.
 * Nunca aplica propuestas — solo persiste borradores y registra aprobaciones.
 */

const prisma     = require('../../lib/prisma');
const { evaluar }            = require('./constraintEngine');
const { estimarCostoAsignaciones, compararEscenarios } = require('./estimadorCostos');
const { sanitizarIndicadores } = require('./sanitizer');
const crypto     = require('crypto');

// ─── Hash de datos (integridad) ───────────────────────────────────────────────

function hashDatos(datos) {
  return crypto.createHash('sha256').update(JSON.stringify(datos)).digest('hex').substring(0, 64);
}

// ─── Crear propuesta ──────────────────────────────────────────────────────────

/**
 * Crea una propuesta en estado 'borrador'.
 * Ejecuta validación determinística y estima indicadores antes de guardar.
 *
 * @param {Object} params
 * @param {string} params.empresaId
 * @param {string} params.creadoPorId      - usuarioId PG
 * @param {string} params.nombre
 * @param {string} params.objetivo         - código corto (máx 60 chars)
 * @param {string} [params.areaId]
 * @param {string} params.periodoInicio    - ISO date
 * @param {string} params.periodoFin       - ISO date
 * @param {Array}  params.asignacionesBase - estado actual (para indicadores base)
 * @param {Array}  params.asignacionesPropuesta - estado propuesto
 * @param {Object} [params.restricciones]  - límites de horario, cobertura, etc.
 * @param {Array}  [params.turnos]
 * @param {Array}  [params.areasRequeridas]
 * @param {number} [params.smlvVigente]
 * @param {string} [params.explicacion]    - texto libre generado por IA (ya sanitizado)
 * @param {Object} [params.hallazgos]
 * @returns {Promise<Object>} propuesta creada
 */
async function crearPropuesta({
  empresaId,
  creadoPorId,
  nombre,
  objetivo,
  areaId        = null,
  periodoInicio,
  periodoFin,
  asignacionesBase       = [],
  asignacionesPropuesta  = [],
  restricciones          = {},
  turnos                 = [],
  areasRequeridas        = [],
  smlvVigente            = null,
  explicacion            = null,
  hallazgos              = null,
}) {
  const limites = restricciones.limites || {};

  const indicadoresBase = evaluar({
    asignaciones: asignacionesBase,
    turnos,
    areasRequeridas,
    limites,
  });

  const indicadoresPropuesta = evaluar({
    asignaciones: asignacionesPropuesta,
    turnos,
    areasRequeridas,
    limites,
  });

  let indicadoresCosto = null;
  if (smlvVigente) {
    try {
      const costoBase    = estimarCostoAsignaciones(asignacionesBase, smlvVigente);
      const costoProp    = estimarCostoAsignaciones(asignacionesPropuesta, smlvVigente);
      indicadoresCosto   = compararEscenarios(costoBase, costoProp);
    } catch (_) {
      // estimación de costo es opcional — no bloquea
    }
  }

  const propuestaData = {
    restricciones:    restricciones,
    asignaciones:     asignacionesPropuesta,
    indicadoresCosto: indicadoresCosto || undefined,
  };

  const propuesta = await prisma.propuestaProgramacionIA.create({
    data: {
      empresaId,
      areaId,
      periodoInicio:       new Date(periodoInicio),
      periodoFin:          new Date(periodoFin),
      nombre:              nombre.substring(0, 200),
      objetivo:            objetivo.substring(0, 60),
      estado:              'borrador',
      restricciones:       restricciones,
      propuesta:           propuestaData,
      indicadoresBase:     sanitizarIndicadores(indicadoresBase),
      indicadoresPropuesta: sanitizarIndicadores(indicadoresPropuesta),
      hallazgos:           hallazgos || undefined,
      explicacion:         explicacion ? explicacion.substring(0, 10000) : null,
      dataHash:            hashDatos(propuestaData),
      creadoPorId,
      version:             1,
    },
  });

  return propuesta;
}

// ─── Listar propuestas ────────────────────────────────────────────────────────

/**
 * Lista propuestas de la empresa con paginación.
 * Siempre filtra por empresaId — nunca retorna propuestas de otras empresas.
 */
async function listarPropuestas(empresaId, { estado, areaId, pagina = 1, porPagina = 20 } = {}) {
  const where = { empresaId };
  if (estado)  where.estado  = estado;
  if (areaId)  where.areaId  = areaId;

  const [total, items] = await Promise.all([
    prisma.propuestaProgramacionIA.count({ where }),
    prisma.propuestaProgramacionIA.findMany({
      where,
      select: {
        id: true, nombre: true, objetivo: true, estado: true,
        periodoInicio: true, periodoFin: true, areaId: true,
        version: true, creadoPorId: true, aprobadoPorId: true,
        fechaAprobacion: true, createdAt: true, updatedAt: true,
        indicadoresBase: true, indicadoresPropuesta: true,
      },
      orderBy: { createdAt: 'desc' },
      skip:  (pagina - 1) * porPagina,
      take:  porPagina,
    }),
  ]);

  return { total, pagina, porPagina, items };
}

// ─── Obtener propuesta por ID ─────────────────────────────────────────────────

/**
 * Obtiene una propuesta verificando que pertenezca a la empresa.
 * Lanza 403 si no pertenece.
 */
async function obtenerPropuesta(propuestaId, empresaId) {
  const propuesta = await prisma.propuestaProgramacionIA.findUnique({
    where: { id: propuestaId },
  });

  if (!propuesta) return null;

  if (propuesta.empresaId !== empresaId) {
    const err = new Error('Acceso denegado a propuesta de otra empresa');
    err.statusCode = 403;
    throw err;
  }

  return propuesta;
}

// ─── Aprobar propuesta ────────────────────────────────────────────────────────

/**
 * Cambia el estado de una propuesta a 'aprobada'.
 * No aplica los cambios — eso es responsabilidad del controlador/usuario.
 */
async function aprobarPropuesta(propuestaId, empresaId, aprobadoPorId) {
  const propuesta = await obtenerPropuesta(propuestaId, empresaId);
  if (!propuesta) {
    const err = new Error('Propuesta no encontrada');
    err.statusCode = 404;
    throw err;
  }

  if (!['borrador', 'validada'].includes(propuesta.estado)) {
    const err = new Error(`No se puede aprobar una propuesta en estado '${propuesta.estado}'`);
    err.statusCode = 400;
    throw err;
  }

  return prisma.propuestaProgramacionIA.update({
    where: { id: propuestaId },
    data:  { estado: 'aprobada', aprobadoPorId, fechaAprobacion: new Date() },
  });
}

// ─── Rechazar propuesta ───────────────────────────────────────────────────────

async function rechazarPropuesta(propuestaId, empresaId, rechazadoPorId) {
  const propuesta = await obtenerPropuesta(propuestaId, empresaId);
  if (!propuesta) {
    const err = new Error('Propuesta no encontrada');
    err.statusCode = 404;
    throw err;
  }

  if (propuesta.estado === 'aplicada') {
    const err = new Error('No se puede rechazar una propuesta ya aplicada');
    err.statusCode = 400;
    throw err;
  }

  return prisma.propuestaProgramacionIA.update({
    where: { id: propuestaId },
    data:  { estado: 'rechazada', aprobadoPorId: rechazadoPorId, fechaAprobacion: new Date() },
  });
}

// ─── Marcar como aplicada ─────────────────────────────────────────────────────

async function marcarAplicada(propuestaId, empresaId) {
  const propuesta = await obtenerPropuesta(propuestaId, empresaId);
  if (!propuesta || propuesta.estado !== 'aprobada') {
    const err = new Error('Solo se pueden aplicar propuestas en estado aprobada');
    err.statusCode = 400;
    throw err;
  }

  return prisma.propuestaProgramacionIA.update({
    where: { id: propuestaId },
    data:  { estado: 'aplicada' },
  });
}

module.exports = {
  crearPropuesta,
  listarPropuestas,
  obtenerPropuesta,
  aprobarPropuesta,
  rechazarPropuesta,
  marcarAplicada,
};
