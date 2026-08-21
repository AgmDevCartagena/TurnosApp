'use strict';

/**
 * simulador.js
 * Simula cambios en una programación sin persistirlos en BD.
 *
 * REGLAS:
 * - Solo opera sobre datos en memoria — nunca escribe en BD.
 * - Devuelve el diff y el resultado validado por constraintEngine.
 * - Tipos de simulación: reemplazo, intercambio, reasignación de área.
 */

const { evaluar } = require('./constraintEngine');

// ─── Utilidades ───────────────────────────────────────────────────────────────

function clonarAsignaciones(asignaciones) {
  return asignaciones.map(a => ({ ...a }));
}

// ─── Simulaciones individuales ────────────────────────────────────────────────

/**
 * TIPO: reemplazo — reemplaza un empleado por otro en todas sus asignaciones del período.
 *
 * @param {Array}  asignaciones - estado actual
 * @param {string} empleadoIdSaliente
 * @param {string} empleadoIdEntrante
 * @param {string} [fechaDesde] - ISO date (opcional, filtra)
 * @param {string} [fechaHasta] - ISO date (opcional, filtra)
 * @returns {{ asignacionesResultantes: Array, asignacionesModificadas: number }}
 */
function simularReemplazo(asignaciones, empleadoIdSaliente, empleadoIdEntrante, fechaDesde = null, fechaHasta = null) {
  const resultado = clonarAsignaciones(asignaciones);
  let modificadas = 0;

  for (const asig of resultado) {
    if (asig.empleadoId !== empleadoIdSaliente) continue;
    if (fechaDesde && asig.fechaInicio < fechaDesde) continue;
    if (fechaHasta && asig.fechaInicio > fechaHasta + 'T23:59:59.999Z') continue;

    asig.empleadoId        = empleadoIdEntrante;
    asig._simulado         = true;
    asig._cambio           = 'reemplazo';
    asig._empleadoOriginal = empleadoIdSaliente;
    modificadas++;
  }

  return { asignacionesResultantes: resultado, asignacionesModificadas: modificadas };
}

/**
 * TIPO: intercambio — intercambia las asignaciones de dos empleados en un día específico.
 *
 * @param {Array}  asignaciones
 * @param {string} empleadoIdA
 * @param {string} empleadoIdB
 * @param {string} fecha - ISO date '2026-08-01'
 * @returns {{ asignacionesResultantes: Array, asignacionesModificadas: number }}
 */
function simularIntercambio(asignaciones, empleadoIdA, empleadoIdB, fecha) {
  const resultado = clonarAsignaciones(asignaciones);
  let modificadas = 0;
  const dia = fecha.substring(0, 10);

  for (const asig of resultado) {
    const asigDia = asig.fechaInicio?.substring(0, 10);
    if (asigDia !== dia) continue;

    if (asig.empleadoId === empleadoIdA) {
      asig.empleadoId        = empleadoIdB;
      asig._simulado         = true;
      asig._cambio           = 'intercambio';
      asig._empleadoOriginal = empleadoIdA;
      modificadas++;
    } else if (asig.empleadoId === empleadoIdB) {
      asig.empleadoId        = empleadoIdA;
      asig._simulado         = true;
      asig._cambio           = 'intercambio';
      asig._empleadoOriginal = empleadoIdB;
      modificadas++;
    }
  }

  return { asignacionesResultantes: resultado, asignacionesModificadas: modificadas };
}

/**
 * TIPO: agregar — agrega una nueva asignación temporal sin persistirla.
 *
 * @param {Array}  asignaciones - estado actual
 * @param {Object} nuevaAsignacion - { empleadoId, turno, area, fechaInicio, fechaFin }
 * @returns {{ asignacionesResultantes: Array, asignacionesModificadas: number }}
 */
function simularAgregarAsignacion(asignaciones, nuevaAsignacion) {
  const resultado = clonarAsignaciones(asignaciones);
  resultado.push({
    ...nuevaAsignacion,
    id:        `sim_${Date.now()}`,
    _simulado: true,
    _cambio:   'agregar',
  });
  return { asignacionesResultantes: resultado, asignacionesModificadas: 1 };
}

/**
 * TIPO: eliminar — elimina asignaciones de un empleado en una fecha.
 *
 * @param {Array}  asignaciones
 * @param {string} empleadoId
 * @param {string} fecha - ISO date
 * @returns {{ asignacionesResultantes: Array, asignacionesModificadas: number }}
 */
function simularEliminarAsignacion(asignaciones, empleadoId, fecha) {
  const dia     = fecha.substring(0, 10);
  const antes   = asignaciones.length;
  const resultado = asignaciones.filter(
    a => !(a.empleadoId === empleadoId && a.fechaInicio?.substring(0, 10) === dia)
  ).map(a => ({ ...a }));
  return { asignacionesResultantes: resultado, asignacionesModificadas: antes - resultado.length };
}

// ─── Generador de diff ────────────────────────────────────────────────────────

/**
 * Calcula qué asignaciones cambiaron entre estado original y resultante.
 * @param {Array} original
 * @param {Array} resultante
 * @returns {Array} lista de cambios con { tipo, id, antes, despues }
 */
function calcularDiff(original, resultante) {
  const diff = [];
  const mapaOriginal = Object.fromEntries(original.map(a => [a.id, a]));
  const mapaResultante = Object.fromEntries(resultante.map(a => [a.id, a]));

  for (const asig of resultante) {
    if (!mapaOriginal[asig.id]) {
      diff.push({ tipo: 'agregada', id: asig.id, despues: asig });
    } else if (asig.empleadoId !== mapaOriginal[asig.id].empleadoId) {
      diff.push({ tipo: 'modificada', id: asig.id, antes: mapaOriginal[asig.id], despues: asig });
    }
  }

  for (const asig of original) {
    if (!mapaResultante[asig.id]) {
      diff.push({ tipo: 'eliminada', id: asig.id, antes: asig });
    }
  }

  return diff;
}

// ─── Punto de entrada principal ───────────────────────────────────────────────

/**
 * Ejecuta una simulación y retorna el resultado validado por constraintEngine.
 *
 * @param {Object} params
 * @param {string} params.tipo - 'reemplazo' | 'intercambio' | 'agregar' | 'eliminar'
 * @param {Array}  params.asignacionesBase
 * @param {Object} params.parametros - parámetros específicos del tipo de simulación
 * @param {Array}  [params.turnos]
 * @param {Array}  [params.areasRequeridas]
 * @param {Set}    [params.empleadosInactivos]
 * @param {Object} [params.limites]
 *
 * @returns {{
 *   tipo:                  string,
 *   asignacionesModificadas: number,
 *   diff:                  Array,
 *   validacionBase:        Object,
 *   validacionResultante:  Object,
 *   mejora:                boolean|null,
 *   resumen:               string,
 * }}
 */
function simular({
  tipo,
  asignacionesBase,
  parametros,
  turnos            = [],
  areasRequeridas   = [],
  empleadosInactivos = new Set(),
  limites           = {},
}) {
  let asignacionesResultantes;
  let asignacionesModificadas;

  switch (tipo) {
    case 'reemplazo':
      ({ asignacionesResultantes, asignacionesModificadas } = simularReemplazo(
        asignacionesBase,
        parametros.empleadoIdSaliente,
        parametros.empleadoIdEntrante,
        parametros.fechaDesde,
        parametros.fechaHasta,
      ));
      break;

    case 'intercambio':
      ({ asignacionesResultantes, asignacionesModificadas } = simularIntercambio(
        asignacionesBase,
        parametros.empleadoIdA,
        parametros.empleadoIdB,
        parametros.fecha,
      ));
      break;

    case 'agregar':
      ({ asignacionesResultantes, asignacionesModificadas } = simularAgregarAsignacion(
        asignacionesBase,
        parametros.asignacion,
      ));
      break;

    case 'eliminar':
      ({ asignacionesResultantes, asignacionesModificadas } = simularEliminarAsignacion(
        asignacionesBase,
        parametros.empleadoId,
        parametros.fecha,
      ));
      break;

    default:
      throw new Error(`Tipo de simulación no reconocido: ${tipo}`);
  }

  const validacionBase = evaluar({
    asignaciones: asignacionesBase,
    turnos,
    areasRequeridas,
    empleadosInactivos,
    limites,
  });

  const validacionResultante = evaluar({
    asignaciones: asignacionesResultantes,
    turnos,
    areasRequeridas,
    empleadosInactivos,
    limites,
  });

  const diff = calcularDiff(asignacionesBase, asignacionesResultantes);

  const erroresBase  = validacionBase.violaciones.length;
  const erroresFinal = validacionResultante.violaciones.length;
  const mejora = erroresFinal < erroresBase ? true : erroresFinal > erroresBase ? false : null;

  const resumen = mejora === true
    ? `La simulación reduce errores de ${erroresBase} a ${erroresFinal}.`
    : mejora === false
      ? `La simulación introduce ${erroresFinal - erroresBase} error(es) adicionale(s).`
      : `La simulación no cambia el número de errores (${erroresFinal}).`;

  return {
    tipo,
    asignacionesModificadas,
    diff,
    validacionBase,
    validacionResultante,
    mejora,
    resumen,
  };
}

module.exports = {
  simular,
  simularReemplazo,
  simularIntercambio,
  simularAgregarAsignacion,
  simularEliminarAsignacion,
  calcularDiff,
};
