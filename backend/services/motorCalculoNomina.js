/**
 * MotorCalculoNomina
 * Servicio centralizado de cálculo de nómina.
 * - Lee empleado, parámetros y conceptos desde la base de datos.
 * - No usa valores hardcodeados.
 * - Aplica aislamiento total por empresaId.
 * - Persiste la liquidación con detalle por concepto.
 */

'use strict';

const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const isSameOrBefore    = require('dayjs/plugin/isSameOrBefore');
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

const Empleado          = require('../models/Empleado');
const ParametroNomina   = require('../models/ParametroNomina');
const ConceptoNomina    = require('../models/ConceptoNomina');
const LiquidacionNomina = require('../models/LiquidacionNomina');
const NovedadNomina     = require('../models/NovedadNomina');
const { buscarTurnoPorDocumentoYRango, buscarTurnosPorAreaYRango } = require('../models/turnoModel');
const { generarFestivosColombiaAño } = require('./festivosService');

// ── Códigos de parámetros requeridos ──────────────────────────────────────────
const CODIGOS_REQUERIDOS = [
  'SMLV',
  'AUX_TRANSPORTE',
  'PORCENTAJE_SALUD_EMPLEADO',
  'PORCENTAJE_PENSION_EMPLEADO',
  'RECARGO_NOCTURNO',
  'RECARGO_DOMINICAL_FESTIVO',
  'HE_DIURNA',
  'HE_NOCTURNA',
  'HORAS_MES'
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildFestivosSet(fechaInicio, fechaFin) {
  const set = new Set();
  const añoIni = dayjs(fechaInicio).year();
  const añoFin = dayjs(fechaFin).year();
  for (let a = añoIni; a <= añoFin; a++) {
    generarFestivosColombiaAño(a).forEach(f => set.add(f.date));
  }
  return set;
}

/**
 * Calcula horas por tipo en un día específico.
 */
function calcularHorasDia(fecha, entradaStr, salidaStr, esDomFestivo, params) {
  const NOCTURNO_INI = 19;
  const NOCTURNO_FIN = 6;
  const JORNADA      = params.HORAS_MES ? params.HORAS_MES / (4.33 * 5) : 8; // ~8h

  let entrada = dayjs(`${fecha} ${entradaStr}`, 'YYYY-MM-DD HH:mm');
  let salida  = dayjs(`${fecha} ${salidaStr}`,  'YYYY-MM-DD HH:mm');
  if (salida.isSameOrBefore(entrada)) salida = salida.add(1, 'day');

  let horasNormales = 0, recargoNocturno = 0, recargoFestDom = 0;
  let heDiurnas = 0, heNocturnas = 0;
  let heDomFestDiurnas = 0, heDomFestNocturnas = 0;
  let acum = 0;
  let cur  = entrada.clone();

  while (cur.isBefore(salida)) {
    const sig     = cur.add(1, 'hour').isAfter(salida) ? salida : cur.add(1, 'hour');
    const fraccion = sig.diff(cur, 'minute') / 60;
    const hora    = cur.hour();
    const nocturno = hora >= NOCTURNO_INI || hora < NOCTURNO_FIN;
    const extra   = acum >= JORNADA;

    if (esDomFestivo) {
      recargoFestDom += fraccion;
      if (extra) {
        if (nocturno) heDomFestNocturnas += fraccion;
        else heDomFestDiurnas += fraccion;
      }
    } else if (nocturno) {
      recargoNocturno += fraccion;
      if (extra) heNocturnas += fraccion;
    } else {
      if (extra) heDiurnas += fraccion;
      else horasNormales += fraccion;
    }

    acum += fraccion;
    cur = sig;
  }

  return {
    horasNormales:         +horasNormales.toFixed(4),
    recargoNocturno:       +recargoNocturno.toFixed(4),
    recargoFestDom:        +recargoFestDom.toFixed(4),
    heDiurnas:             +heDiurnas.toFixed(4),
    heNocturnas:           +heNocturnas.toFixed(4),
    heDomFestDiurnas:      +heDomFestDiurnas.toFixed(4),
    heDomFestNocturnas:    +heDomFestNocturnas.toFixed(4),
    totalHoras:            +(acum.toFixed(4))
  };
}

/**
 * Calcula horas totales a partir del cronograma de un turno.
 */
function calcularHorasCronograma(cronograma, params, festivosSet) {
  let totales = {
    diasTrabajados: 0, diasDescanso: 0,
    horasNormales: 0, recargoNocturno: 0, recargoFestDom: 0,
    heDiurnas: 0, heNocturnas: 0, heDomFestDiurnas: 0, heDomFestNocturnas: 0,
    horasTotales: 0
  };

  for (const dia of cronograma) {
    const fechaStr = typeof dia.fecha === 'string'
      ? dia.fecha
      : dayjs(dia.fecha).format('YYYY-MM-DD');

    const esDescanso = !!(dia.esDescanso || dia.turno === 'DESCANSO' || (!dia.entrada && !dia.salida));
    totales.diasTrabajados++;

    if (!esDescanso && dia.entrada && dia.salida) {
      const esDomFest = !!(dia.esDomingo || dia.esFestivo || festivosSet.has(fechaStr) ||
        dayjs(fechaStr).day() === 0);
      const h = calcularHorasDia(fechaStr, dia.entrada, dia.salida, esDomFest, params);
      totales.horasNormales      += h.horasNormales;
      totales.recargoNocturno    += h.recargoNocturno;
      totales.recargoFestDom     += h.recargoFestDom;
      totales.heDiurnas          += h.heDiurnas;
      totales.heNocturnas        += h.heNocturnas;
      totales.heDomFestDiurnas   += h.heDomFestDiurnas;
      totales.heDomFestNocturnas += h.heDomFestNocturnas;
      totales.horasTotales       += h.totalHoras;
    } else {
      totales.diasDescanso++;
    }
  }

  // Redondear
  for (const k of Object.keys(totales)) {
    if (typeof totales[k] === 'number' && !Number.isInteger(totales[k])) {
      totales[k] = +totales[k].toFixed(2);
    }
  }
  return totales;
}

/**
 * Aplica los conceptos configurados y genera los detalles de la liquidación.
 * @returns { detalles[], totalDevengado, totalDeducciones }
 */
function aplicarConceptos(conceptos, horas, salarioBase, diasTrabajados, params, novedades) {
  const valorHora = salarioBase / (params.HORAS_MES || 220);
  // Salario proporcional al período (base para deducciones y salario base devengado)
  const salarioBaseDevengado = +((salarioBase / 30) * diasTrabajados).toFixed(2);
  const detalles  = [];
  let totalDevengado  = 0;
  let totalDeducciones = 0;

  const calc = {
    salarioBase,
    salarioBaseDevengado,
    totalDevengado: 0  // se actualiza progresivamente
  };

  for (const concepto of conceptos) {
    let valor = 0;
    const pct = concepto.referenciaParametro ? (params[concepto.referenciaParametro] || 0) : 0;
    // Las deducciones se calculan sobre el salario devengado proporcional, no el mensual completo
    const base = concepto.base === 'totalDevengado'
      ? calc.totalDevengado
      : concepto.tipo === 'deduccion'
        ? salarioBaseDevengado
        : salarioBase;

    switch (concepto.codigo) {
      case 'SALARIO_BASE':
        valor = +((salarioBase / 30) * diasTrabajados).toFixed(2);
        break;

      case 'AUX_TRANSPORTE':
        if (salarioBase <= 2 * (params.SMLV || 1750905)) {
          valor = +((params.AUX_TRANSPORTE / 30) * diasTrabajados).toFixed(2);
        }
        break;

      case 'RECARGO_NOCTURNO':
        valor = +(horas.recargoNocturno * valorHora * pct).toFixed(2);
        break;

      case 'RECARGO_DOMINICAL':
      case 'RECARGO_DOMINICAL_FESTIVO':
        valor = +(horas.recargoFestDom * valorHora * pct).toFixed(2);
        break;

      case 'HE_DIURNA':
        valor = +(horas.heDiurnas * valorHora * (1 + pct)).toFixed(2);
        break;

      case 'HE_NOCTURNA':
        valor = +(horas.heNocturnas * valorHora * (1 + pct)).toFixed(2);
        break;

      case 'HE_DOM_FESTIVA_DIURNA':
        valor = +(horas.heDomFestDiurnas * valorHora * (1 + (params.HE_DIURNA || 0.25) + pct)).toFixed(2);
        break;

      case 'HE_DOM_FESTIVA_NOCTURNA':
        valor = +(horas.heDomFestNocturnas * valorHora * (1 + (params.HE_NOCTURNA || 0.75) + pct)).toFixed(2);
        break;

      case 'DEDUCCION_SALUD':
        valor = +(base * pct).toFixed(2);
        break;

      case 'DEDUCCION_PENSION':
        valor = +(base * pct).toFixed(2);
        break;

      default:
        // Concepto genérico por porcentaje sobre base
        if (pct > 0 && base > 0) {
          valor = +(base * pct).toFixed(2);
        }
    }

    if (valor === 0 && concepto.tipo !== 'informativo') continue;

    const detalle = {
      conceptoId:     concepto._id || null,
      codigoConcepto: concepto.codigo,
      nombreConcepto: concepto.nombre,
      tipo:           concepto.tipo,
      cantidad:       concepto.tipo === 'devengado' ? diasTrabajados : 1,
      base:           base,
      porcentaje:     pct,
      valor,
      observacion: ''
    };

    detalles.push(detalle);

    if (concepto.tipo === 'devengado' && concepto.afectaTotal) {
      totalDevengado += valor;
      calc.totalDevengado = totalDevengado;
    } else if (concepto.tipo === 'deduccion' && concepto.afectaTotal) {
      totalDeducciones += valor;
    }
  }

  // Novedades como conceptos adicionales
  for (const nov of novedades) {
    if (nov.tipo === 'bonificacion' && nov.valor > 0) {
      detalles.push({
        conceptoId: null, codigoConcepto: 'NOVEDAD_BONIFICACION',
        nombreConcepto: `Bonificación: ${nov.descripcion || nov.tipo}`,
        tipo: 'devengado', cantidad: 1, base: 0, porcentaje: 0, valor: nov.valor, observacion: nov.observacion || ''
      });
      totalDevengado += nov.valor;
    } else if (nov.tipo === 'descuento' && nov.valor > 0) {
      detalles.push({
        conceptoId: null, codigoConcepto: 'NOVEDAD_DESCUENTO',
        nombreConcepto: `Descuento: ${nov.descripcion || nov.tipo}`,
        tipo: 'deduccion', cantidad: 1, base: 0, porcentaje: 0, valor: nov.valor, observacion: nov.observacion || ''
      });
      totalDeducciones += nov.valor;
    }
  }

  return {
    detalles,
    totalDevengado:  +totalDevengado.toFixed(2),
    totalDeducciones: +totalDeducciones.toFixed(2)
  };
}

// ── Validaciones comunes ──────────────────────────────────────────────────────

function validarFechas(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) {
    const err = new Error('Las fechas fechaInicio y fechaFin son requeridas.');
    err.status = 400; throw err;
  }
  const ini = dayjs(fechaInicio);
  const fin = dayjs(fechaFin);
  if (!ini.isValid() || !fin.isValid()) {
    const err = new Error('Las fechas proporcionadas no son válidas.');
    err.status = 400; throw err;
  }
  if (ini.isAfter(fin)) {
    const err = new Error('La fecha inicial no puede ser mayor que la fecha final.');
    err.status = 400; throw err;
  }
}

async function cargarYValidarParametros(empresaId, fechaRef) {
  const mapa = await ParametroNomina.obtenerMapaVigente(
    empresaId, CODIGOS_REQUERIDOS, fechaRef
  );
  const clavesCriticas = ['SMLV', 'AUX_TRANSPORTE', 'PORCENTAJE_SALUD_EMPLEADO', 'PORCENTAJE_PENSION_EMPLEADO'];
  const faltantes = clavesCriticas.filter(c => !(c in mapa));
  if (faltantes.length > 0) {
    const err = new Error(
      `No existen parámetros de nómina vigentes para el periodo seleccionado. Faltantes: ${faltantes.join(', ')}.`
    );
    err.status = 400; throw err;
  }
  return mapa;
}

// ── calcularIndividual ────────────────────────────────────────────────────────

/**
 * Calcula la nómina de un empleado por documento.
 * @param {Object} opts
 * @param {string}   opts.documento        Documento del empleado
 * @param {string}   opts.fechaInicio      YYYY-MM-DD
 * @param {string}   opts.fechaFin         YYYY-MM-DD
 * @param {ObjectId} opts.empresaId        Siempre de la sesión del usuario
 * @param {ObjectId} opts.usuarioId        Usuario que calcula
 * @param {boolean}  [opts.guardar=true]   Persistir la liquidación en BD
 * @returns {Promise<Object>}              Resultado completo de la liquidación
 */
async function calcularIndividual({ documento, fechaInicio, fechaFin, empresaId, usuarioId, guardar = true }) {
  // ── 1. Validar documento
  if (!documento || !String(documento).trim()) {
    const err = new Error('El documento del empleado es requerido.');
    err.status = 400; throw err;
  }

  // ── 2. Validar fechas
  validarFechas(fechaInicio, fechaFin);

  // ── 3. Cargar parámetros vigentes desde BD
  const fechaRef = new Date(fechaInicio);
  const params   = await cargarYValidarParametros(empresaId, fechaRef);

  // ── 4. Buscar empleado en la empresa (nunca confiar en empresaId del frontend)
  const empleado = await Empleado.findOne({
    documento: String(documento).trim(),
    empresaId
  });

  if (!empleado) {
    const err = new Error('El empleado no existe o no pertenece a su empresa.');
    err.status = 404; throw err;
  }

  // ── 5. Validar empresa del empleado (seguridad multiempresa)
  if (String(empleado.empresaId) !== String(empresaId)) {
    const err = new Error('El empleado no pertenece a la empresa autenticada.');
    err.status = 403; throw err;
  }

  // ── 6. Validar que el empleado está activo
  if (empleado.estado !== 'activo') {
    const err = new Error(`El empleado está ${empleado.estado}. No se puede calcular nómina para empleados inactivos.`);
    err.status = 400; throw err;
  }

  // ── 7. Salario del empleado (siempre del modelo Empleado, nunca del frontend)
  const salarioBase = empleado.salario;

  // ── 8. Buscar turnos del periodo
  const turno = await buscarTurnoPorDocumentoYRango(
    String(documento).trim(), fechaInicio, fechaFin, empresaId
  );

  // Extraer cronograma
  let cronograma = [];
  if (turno) {
    if (turno.historialTurnos && turno.historialTurnos.length > 0) {
      const ini = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      for (const h of turno.historialTurnos) {
        if (h.cronogramaDetallado) {
          const dias = h.cronogramaDetallado.filter(d => {
            const fd = new Date(d.fecha);
            return fd >= ini && fd <= fin;
          });
          cronograma = cronograma.concat(dias);
        }
      }
    } else if (turno.cronogramaDetallado) {
      const ini = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      cronograma = turno.cronogramaDetallado.filter(d => {
        const fd = new Date(d.fecha);
        return fd >= ini && fd <= fin;
      });
    }
  }

  // Si no hay cronograma, calcular días calendario normales
  if (cronograma.length === 0) {
    let d = dayjs(fechaInicio);
    const finD = dayjs(fechaFin);
    while (!d.isAfter(finD)) {
      cronograma.push({
        fecha: d.format('YYYY-MM-DD'),
        esDescanso: d.day() === 0,
        esDomingo: d.day() === 0,
        esFestivo: false
      });
      d = d.add(1, 'day');
    }
  }

  // ── 9. Calcular horas
  const festivosSet = buildFestivosSet(fechaInicio, fechaFin);
  const horas       = calcularHorasCronograma(cronograma, params, festivosSet);

  // ── 10. Cargar conceptos activos de la empresa
  const conceptos = await ConceptoNomina.obtenerVigentes(empresaId, fechaRef);

  // ── 11. Cargar novedades del periodo
  const novedades = await NovedadNomina.find({
    empresaId,
    empleadoId: empleado._id,
    estado: 'activa',
    fechaInicio: { $lte: new Date(fechaFin) },
    fechaFin:    { $gte: new Date(fechaInicio) }
  });

  // ── 12. Aplicar conceptos y calcular totales
  const { detalles, totalDevengado, totalDeducciones } = aplicarConceptos(
    conceptos, horas, salarioBase, horas.diasTrabajados, params, novedades
  );

  const netoPagar = +(totalDevengado - totalDeducciones).toFixed(2);

  // ── 13. Construir resultado
  const resultado = {
    empleado: {
      id:        empleado._id,
      documento: empleado.documento,
      nombre:    `${empleado.nombre} ${empleado.apellidos || ''}`.trim(),
      area:      turno?.area || empleado.area || '',
      cargo:     empleado.cargo || ''
    },
    empresa:    { id: empresaId },
    periodo:    { inicio: fechaInicio, fin: fechaFin, diasTrabajados: horas.diasTrabajados },
    salarioBase,
    horas: {
      normales:         horas.horasNormales,
      recargoNocturno:  horas.recargoNocturno,
      recargoFestDom:   horas.recargoFestDom,
      heDiurnas:        horas.heDiurnas,
      heNocturnas:      horas.heNocturnas,
      heDomFestDiurnas: horas.heDomFestDiurnas,
      heDomFestNocturnas: horas.heDomFestNocturnas,
      totales:          horas.horasTotales
    },
    detalles,
    totalDevengado,
    totalDeducciones,
    netoPagar,
    parametrosUsados: params
  };

  // ── 14. Guardar liquidación en BD
  if (guardar) {
    const liq = new LiquidacionNomina({
      empresaId,
      empleadoId:       empleado._id,
      documentoEmpleado: empleado.documento,
      nombreEmpleado:   `${empleado.nombre} ${empleado.apellidos || ''}`.trim(),
      areaNombre:       resultado.empleado.area,
      periodoInicio:    new Date(fechaInicio),
      periodoFin:       new Date(fechaFin),
      salarioBase,
      diasTrabajados:   horas.diasTrabajados,
      totalDevengado,
      totalDeducciones,
      netoPagar,
      estado:           'borrador',
      calculadoPor:     usuarioId,
      parametrosUsados: params,
      detalles
    });
    await liq.save();
    resultado.liquidacionId = liq._id;
    resultado.estadoLiquidacion = liq.estado;
  }

  return resultado;
}

// ── calcularPorArea ───────────────────────────────────────────────────────────

/**
 * Calcula la nómina de todos los empleados activos de un área.
 * @param {Object} opts
 * @param {string}   opts.areaId        ID del área (valida pertenencia a empresa)
 * @param {string}   opts.fechaInicio   YYYY-MM-DD
 * @param {string}   opts.fechaFin      YYYY-MM-DD
 * @param {ObjectId} opts.empresaId     Siempre de la sesión
 * @param {ObjectId} opts.usuarioId     Usuario que calcula
 * @returns {Promise<Object>}
 */
async function calcularPorArea({ areaId, fechaInicio, fechaFin, empresaId, usuarioId }) {
  validarFechas(fechaInicio, fechaFin);

  if (!areaId) {
    const err = new Error('El areaId es requerido.');
    err.status = 400; throw err;
  }

  // Validar que el área pertenece a la empresa (multiempresa)
  const Area = require('../models/Area');
  const area = await Area.findOne({ _id: areaId, empresaId });
  if (!area) {
    const err = new Error('El área no existe o no pertenece a su empresa.');
    err.status = 403; throw err;
  }

  // Buscar empleados activos del área
  const empleados = await Empleado.find({
    empresaId,
    areaId,
    estado: 'activo'
  });

  const resultados = [];
  const errores    = [];

  for (const emp of empleados) {
    try {
      const liq = await calcularIndividual({
        documento: emp.documento,
        fechaInicio, fechaFin, empresaId, usuarioId,
        guardar: true
      });
      resultados.push(liq);
    } catch (e) {
      errores.push({ documento: emp.documento, nombre: emp.nombre, error: e.message });
    }
  }

  const totalDevengadoArea = resultados.reduce((s, r) => s + r.totalDevengado, 0);
  const totalNetoPagarArea = resultados.reduce((s, r) => s + r.netoPagar, 0);

  return {
    area: { id: area._id, nombre: area.nombre },
    periodo: { inicio: fechaInicio, fin: fechaFin },
    totalEmpleados:    empleados.length,
    procesados:        resultados.length,
    errores:           errores.length,
    totalDevengado:    +totalDevengadoArea.toFixed(2),
    totalNeto:         +totalNetoPagarArea.toFixed(2),
    resultados,
    errores
  };
}

// ── Exportar ──────────────────────────────────────────────────────────────────

module.exports = { calcularIndividual, calcularPorArea };
