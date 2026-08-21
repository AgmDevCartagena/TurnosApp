'use strict';

/**
 * estimadorCostos.js
 * Estimación del impacto económico RELATIVO de cambios en programación.
 *
 * REGLAS CRÍTICAS:
 * - NO realiza cálculo de nómina ni accede al motorCalculoNomina.
 * - Opera SOLO con tarifas por hora anonimizadas (bandas salariales, no valores reales).
 * - El resultado es una ESTIMACIÓN orientativa, no una liquidación.
 * - Los valores monetarios absolutos NUNCA se exponen a la IA.
 */

// ─── Bandas salariales (anonimización de salarios) ───────────────────────────

const BANDAS = [
  { nombre: 'BANDA_1', minSmlv: 1.0, maxSmlv: 1.5 },
  { nombre: 'BANDA_2', minSmlv: 1.5, maxSmlv: 2.5 },
  { nombre: 'BANDA_3', minSmlv: 2.5, maxSmlv: 4.0 },
  { nombre: 'BANDA_4', minSmlv: 4.0, maxSmlv: 8.0 },
  { nombre: 'BANDA_5', minSmlv: 8.0, maxSmlv: Infinity },
];

/**
 * Convierte un salario mensual a su banda salarial (anonimizado).
 * @param {number} salarioMensual
 * @param {number} smlvVigente
 * @returns {string} nombre de la banda
 */
function clasificarBanda(salarioMensual, smlvVigente) {
  const multiplo = salarioMensual / smlvVigente;
  const banda = BANDAS.find(b => multiplo >= b.minSmlv && multiplo < b.maxSmlv);
  return banda?.nombre || 'BANDA_5';
}

// ─── Cálculo de costo por hora ────────────────────────────────────────────────

/**
 * Estima el costo hora ordinario a partir del salario mensual.
 * Fórmula: salario / (30 días * 8h/día) con factor prestacional básico.
 * @param {number} salarioMensual
 * @param {number} factorPrestacional - defecto 1.516 (Colombia: SS+paraf+cesantías+vacaciones)
 * @returns {number} costo hora estimado
 */
function costoHoraEstimado(salarioMensual, factorPrestacional = 1.516) {
  const horasMes = 240;
  return (salarioMensual * factorPrestacional) / horasMes;
}

// ─── Cálculo de costo de un bloque de asignaciones ───────────────────────────

/**
 * Estima el costo total de un conjunto de asignaciones.
 * Requiere que cada asignación tenga { fechaInicio, fechaFin, salarioMensual }.
 * Los salarios se clasifican en bandas ANTES de cualquier cálculo, y
 * el resultado NO expone salarios individuales.
 *
 * @param {Array}  asignaciones - con campo salarioMensual
 * @param {number} smlvVigente
 * @param {Object} opciones
 * @param {number} opciones.factorPrestacional
 * @param {number} opciones.factorHorasExtra    - multiplica horas que superen 8h/día
 * @param {number} opciones.factorNocturno      - multiplica horas nocturnas (22:00-06:00)
 *
 * @returns {{
 *   costoTotalEstimado: number,
 *   totalHoras:         number,
 *   distribBandas:      Object,   ← porcentaje por banda (no valores absolutos)
 *   costoRelativo:      number,   ← en múltiplos de SMLV
 *   desglose:           Array,    ← por banda (sin empleados individuales)
 * }}
 */
function estimarCostoAsignaciones(asignaciones, smlvVigente, opciones = {}) {
  const {
    factorPrestacional = 1.516,
    factorHorasExtra   = 1.25,
    factorNocturno     = 1.35,
  } = opciones;

  if (!smlvVigente || smlvVigente <= 0) {
    throw new Error('[estimadorCostos] smlvVigente requerido y debe ser mayor a 0');
  }

  const porBanda = {};
  let costoTotal = 0;
  let horasTotal = 0;

  for (const asig of asignaciones) {
    if (!asig.fechaInicio || !asig.fechaFin || !asig.salarioMensual) continue;

    const ini     = new Date(asig.fechaInicio);
    const fin     = new Date(asig.fechaFin);
    const minutos = Math.max(0, (fin - ini) / 60000);
    const horas   = minutos / 60;
    horasTotal   += horas;

    const banda    = clasificarBanda(asig.salarioMensual, smlvVigente);
    const costoH   = costoHoraEstimado(asig.salarioMensual, factorPrestacional);

    const horaExtra   = Math.max(0, horas - 8) * factorHorasExtra;
    const horasNocturnas = _contarHorasNocturnas(ini, fin) * factorNocturno;
    const horasNormales  = Math.max(0, horas - Math.max(0, horas - 8));

    const costoAsig = costoH * (horasNormales + horaExtra + horasNocturnas);
    costoTotal += costoAsig;

    if (!porBanda[banda]) porBanda[banda] = { horas: 0, costo: 0, count: 0 };
    porBanda[banda].horas += horas;
    porBanda[banda].costo += costoAsig;
    porBanda[banda].count += 1;
  }

  const distribBandas = {};
  for (const [banda, datos] of Object.entries(porBanda)) {
    distribBandas[banda] = {
      porcentajeHoras: horasTotal > 0 ? Math.round((datos.horas / horasTotal) * 100) : 0,
      count: datos.count,
    };
  }

  const desglose = Object.entries(porBanda).map(([banda, datos]) => ({
    banda,
    count:             datos.count,
    horas:             Math.round(datos.horas * 100) / 100,
    costoEstimadoBanda: Math.round(datos.costo),
  }));

  return {
    costoTotalEstimado: Math.round(costoTotal),
    totalHoras:         Math.round(horasTotal * 100) / 100,
    distribBandas,
    costoRelativo:      Math.round((costoTotal / smlvVigente) * 100) / 100,
    desglose,
  };
}

// ─── Comparación de escenarios ────────────────────────────────────────────────

/**
 * Compara el costo estimado entre dos escenarios (base vs propuesta).
 * Retorna la variación absoluta y porcentual SIN exponer salarios individuales.
 *
 * @param {Object} costoBase
 * @param {Object} costoPropuesta
 * @returns {{
 *   variacionAbsoluta:    number,
 *   variacionPorcentual:  number,
 *   esEconomico:          boolean,
 *   resumen:              string,
 * }}
 */
function compararEscenarios(costoBase, costoPropuesta) {
  const variacionAbsoluta   = costoPropuesta.costoTotalEstimado - costoBase.costoTotalEstimado;
  const variacionPorcentual = costoBase.costoTotalEstimado > 0
    ? Math.round((variacionAbsoluta / costoBase.costoTotalEstimado) * 10000) / 100
    : 0;
  const esEconomico = variacionAbsoluta <= 0;

  const signo  = variacionAbsoluta >= 0 ? '+' : '';
  const resumen = `Variación de costo estimada: ${signo}${variacionPorcentual}% ` +
    `(${signo}${variacionAbsoluta.toLocaleString('es-CO')} COP). ` +
    (esEconomico ? 'La propuesta es más económica o neutral.' : 'La propuesta incrementa el costo.');

  return { variacionAbsoluta, variacionPorcentual, esEconomico, resumen };
}

// ─── Helper horas nocturnas ───────────────────────────────────────────────────

function _contarHorasNocturnas(ini, fin) {
  let horas = 0;
  let cursor = new Date(ini);
  while (cursor < fin) {
    const siguiente = new Date(Math.min(fin.getTime(), cursor.getTime() + 3600000));
    const hora = cursor.getUTCHours();
    if (hora >= 22 || hora < 6) horas += (siguiente - cursor) / 3600000;
    cursor = siguiente;
  }
  return horas;
}

module.exports = {
  clasificarBanda,
  costoHoraEstimado,
  estimarCostoAsignaciones,
  compararEscenarios,
  BANDAS,
};
