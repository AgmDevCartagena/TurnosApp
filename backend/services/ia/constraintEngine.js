'use strict';

/**
 * constraintEngine.js
 * Motor determinístico de restricciones de programación operativa.
 *
 * REGLAS DE DISEÑO:
 * - Sin IA, sin probabilidades: todas las validaciones son booleanas y trazables.
 * - Nunca modifica la BD — solo evalúa y reporta.
 * - Recibe datos normalizados (ver esquema de entrada al final del archivo).
 * - Siempre retorna un objeto { valido, violaciones, advertencias, indicadores }.
 */

const CODIGOS = {
  DOBLE_TURNO:         'CE001',
  DESCANSO_MINIMO:     'CE002',
  HORAS_SEMANALES:     'CE003',
  HORAS_MENSUALES:     'CE004',
  SOLAPAMIENTO:        'CE005',
  EMPLEADO_INACTIVO:   'CE006',
  TURNO_SIN_EMPLEADOS: 'CE007',
  FESTIVO_NO_CUBIERTO: 'CE008',
  AREA_DESCUBIERTA:    'CE009',
  NOCTURNO_EXCESIVO:   'CE010',
};

// ─── Utilidades internas ──────────────────────────────────────────────────────

function minutosEntreFechas(fechaFin, fechaInicio) {
  return Math.round((new Date(fechaFin) - new Date(fechaInicio)) / 60000);
}

function horasDecimales(minutos) {
  return Math.round((minutos / 60) * 100) / 100;
}

function keyDia(fechaStr) {
  return fechaStr.substring(0, 10);
}

// ─── Validaciones individuales ────────────────────────────────────────────────

/**
 * CE001 — Detecta doble turno: un empleado asignado más de una vez en el mismo día.
 */
function validarDobleTurno(asignaciones) {
  const violaciones = [];
  const mapa = {};

  for (const asig of asignaciones) {
    const clave = `${asig.empleadoId}::${keyDia(asig.fechaInicio)}`;
    if (!mapa[clave]) {
      mapa[clave] = [];
    }
    mapa[clave].push(asig);
  }

  for (const [clave, lista] of Object.entries(mapa)) {
    if (lista.length > 1) {
      const [empleadoId, fecha] = clave.split('::');
      violaciones.push({
        codigo:      CODIGOS.DOBLE_TURNO,
        gravedad:    'error',
        empleadoId,
        fecha,
        mensaje:     `Empleado asignado a ${lista.length} turnos el mismo día (${fecha}).`,
        detalle:     lista.map(a => ({ turnoId: a.id, turno: a.turno, area: a.area })),
      });
    }
  }
  return violaciones;
}

/**
 * CE002 — Descanso mínimo entre turnos consecutivos (por defecto 8 horas).
 * @param {Array} asignaciones
 * @param {number} horasDescansoMinimo
 */
function validarDescansoMinimo(asignaciones, horasDescansoMinimo = 8) {
  const violaciones = [];
  const porEmpleado = {};

  for (const asig of asignaciones) {
    if (!porEmpleado[asig.empleadoId]) porEmpleado[asig.empleadoId] = [];
    porEmpleado[asig.empleadoId].push(asig);
  }

  for (const [empleadoId, lista] of Object.entries(porEmpleado)) {
    const ordenada = lista.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
    for (let i = 1; i < ordenada.length; i++) {
      const anterior = ordenada[i - 1];
      const actual   = ordenada[i];
      if (!anterior.fechaFin || !actual.fechaInicio) continue;

      const minutosDescanso = minutosEntreFechas(actual.fechaInicio, anterior.fechaFin);
      const minutosMinimos  = horasDescansoMinimo * 60;

      if (minutosDescanso < minutosMinimos) {
        violaciones.push({
          codigo:    CODIGOS.DESCANSO_MINIMO,
          gravedad:  'error',
          empleadoId,
          fecha:     keyDia(actual.fechaInicio),
          mensaje:   `Descanso insuficiente: ${horasDecimales(minutosDescanso)}h entre turnos (mínimo ${horasDescansoMinimo}h).`,
          detalle:   {
            turnoAnteriorId: anterior.id,
            turnoActualId:   actual.id,
            horasDescanso:   horasDecimales(minutosDescanso),
          },
        });
      }
    }
  }
  return violaciones;
}

/**
 * CE003 — Horas semanales: agrupa por ISO week y verifica máximo.
 * @param {Array} asignaciones
 * @param {number} maxHorasSemanales
 */
function validarHorasSemanales(asignaciones, maxHorasSemanales = 48) {
  const violaciones = [];
  const semanas = {};

  for (const asig of asignaciones) {
    if (!asig.fechaInicio || !asig.fechaFin) continue;
    const mins = minutosEntreFechas(asig.fechaFin, asig.fechaInicio);
    if (mins <= 0) continue;
    const semana = getISOWeek(new Date(asig.fechaInicio));
    const clave  = `${asig.empleadoId}::${semana}`;
    semanas[clave] = (semanas[clave] || 0) + mins;
  }

  for (const [clave, totalMins] of Object.entries(semanas)) {
    const [empleadoId, semana] = clave.split('::');
    const totalHoras = horasDecimales(totalMins);
    if (totalHoras > maxHorasSemanales) {
      violaciones.push({
        codigo:    CODIGOS.HORAS_SEMANALES,
        gravedad:  'advertencia',
        empleadoId,
        semana,
        mensaje:   `Empleado supera las ${maxHorasSemanales}h semanales: ${totalHoras}h programadas en semana ${semana}.`,
        detalle:   { horasProgramadas: totalHoras, maximo: maxHorasSemanales },
      });
    }
  }
  return violaciones;
}

/**
 * CE004 — Horas mensuales: agrupa por año-mes y verifica máximo.
 * @param {Array} asignaciones
 * @param {number} maxHorasMensuales
 */
function validarHorasMensuales(asignaciones, maxHorasMensuales = 192) {
  const violaciones = [];
  const meses = {};

  for (const asig of asignaciones) {
    if (!asig.fechaInicio || !asig.fechaFin) continue;
    const mins = minutosEntreFechas(asig.fechaFin, asig.fechaInicio);
    if (mins <= 0) continue;
    const mes   = asig.fechaInicio.substring(0, 7);
    const clave = `${asig.empleadoId}::${mes}`;
    meses[clave] = (meses[clave] || 0) + mins;
  }

  for (const [clave, totalMins] of Object.entries(meses)) {
    const [empleadoId, mes] = clave.split('::');
    const totalHoras = horasDecimales(totalMins);
    if (totalHoras > maxHorasMensuales) {
      violaciones.push({
        codigo:    CODIGOS.HORAS_MENSUALES,
        gravedad:  'advertencia',
        empleadoId,
        mes,
        mensaje:   `Empleado supera las ${maxHorasMensuales}h mensuales: ${totalHoras}h programadas en ${mes}.`,
        detalle:   { horasProgramadas: totalHoras, maximo: maxHorasMensuales },
      });
    }
  }
  return violaciones;
}

/**
 * CE005 — Solapamiento de turnos: detecta rangos datetime que se cruzan.
 */
function validarSolapamiento(asignaciones) {
  const violaciones = [];
  const porEmpleado = {};

  for (const asig of asignaciones) {
    if (!asig.fechaInicio || !asig.fechaFin) continue;
    if (!porEmpleado[asig.empleadoId]) porEmpleado[asig.empleadoId] = [];
    porEmpleado[asig.empleadoId].push({ ...asig, _ini: new Date(asig.fechaInicio), _fin: new Date(asig.fechaFin) });
  }

  for (const [empleadoId, lista] of Object.entries(porEmpleado)) {
    const ordenada = lista.sort((a, b) => a._ini - b._ini);
    for (let i = 0; i < ordenada.length - 1; i++) {
      const a = ordenada[i];
      const b = ordenada[i + 1];
      if (a._fin > b._ini) {
        violaciones.push({
          codigo:    CODIGOS.SOLAPAMIENTO,
          gravedad:  'error',
          empleadoId,
          fecha:     keyDia(a.fechaInicio),
          mensaje:   `Solapamiento entre turno ${a.id} (fin: ${a.fechaFin}) y turno ${b.id} (inicio: ${b.fechaInicio}).`,
          detalle:   { turnoAId: a.id, turnoBId: b.id, solapamientoMinutos: minutosEntreFechas(a._fin, b._ini) },
        });
      }
    }
  }
  return violaciones;
}

/**
 * CE006 — Empleados inactivos asignados a turnos.
 * @param {Array} asignaciones
 * @param {Set<string>} empleadosInactivos - Set de empleadoId inactivos
 */
function validarEmpleadosInactivos(asignaciones, empleadosInactivos) {
  const violaciones = [];
  const reportados  = new Set();

  for (const asig of asignaciones) {
    if (empleadosInactivos.has(asig.empleadoId) && !reportados.has(asig.empleadoId)) {
      reportados.add(asig.empleadoId);
      violaciones.push({
        codigo:    CODIGOS.EMPLEADO_INACTIVO,
        gravedad:  'error',
        empleadoId: asig.empleadoId,
        fecha:     keyDia(asig.fechaInicio),
        mensaje:   `Empleado inactivo asignado a un turno.`,
        detalle:   { empleadoId: asig.empleadoId },
      });
    }
  }
  return violaciones;
}

/**
 * CE007 — Turnos sin empleados asignados.
 * @param {Array} turnos - lista de turnos/slots con campo asignaciones[]
 */
function validarTurnosSinEmpleados(turnos) {
  const violaciones = [];
  for (const turno of turnos) {
    const cantAsig = turno.asignaciones?.length || 0;
    if (cantAsig === 0) {
      violaciones.push({
        codigo:   CODIGOS.TURNO_SIN_EMPLEADOS,
        gravedad: 'advertencia',
        turnoId:  turno.id,
        fecha:    keyDia(turno.fecha || turno.fechaInicio),
        mensaje:  `Turno "${turno.nombre || turno.id}" sin empleados asignados el ${keyDia(turno.fecha || turno.fechaInicio)}.`,
        detalle:  { turnoId: turno.id, area: turno.area },
      });
    }
  }
  return violaciones;
}

/**
 * CE009 — Área descubierta: un área requerida no tiene empleados en un día.
 * @param {Array} areasRequeridas - [{ nombre, fecha, minimoPersonas }]
 * @param {Array} asignaciones
 */
function validarAreaDescubierta(areasRequeridas, asignaciones) {
  const violaciones = [];

  for (const req of areasRequeridas) {
    const dia = keyDia(req.fecha);
    const asigDia = asignaciones.filter(
      a => keyDia(a.fechaInicio) === dia && a.area === req.nombre
    );
    if (asigDia.length < req.minimoPersonas) {
      violaciones.push({
        codigo:   CODIGOS.AREA_DESCUBIERTA,
        gravedad: asigDia.length === 0 ? 'error' : 'advertencia',
        fecha:    dia,
        area:     req.nombre,
        mensaje:  `Área "${req.nombre}" con cobertura insuficiente el ${dia}: ${asigDia.length}/${req.minimoPersonas} personas.`,
        detalle:  { asignados: asigDia.length, requeridos: req.minimoPersonas },
      });
    }
  }
  return violaciones;
}

// ─── ISO Week helper ──────────────────────────────────────────────────────────

function getISOWeek(date) {
  const d  = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ─── Cálculo de indicadores ───────────────────────────────────────────────────

function calcularIndicadores(asignaciones) {
  const totalMinutos = asignaciones.reduce((acc, a) => {
    if (!a.fechaInicio || !a.fechaFin) return acc;
    const m = minutosEntreFechas(a.fechaFin, a.fechaInicio);
    return acc + (m > 0 ? m : 0);
  }, 0);

  const empleadosUnicos = new Set(asignaciones.map(a => a.empleadoId)).size;
  const diasCubiertos   = new Set(asignaciones.map(a => keyDia(a.fechaInicio))).size;

  return {
    totalAsignaciones:   asignaciones.length,
    empleadosUnicos,
    diasCubiertos,
    totalHoras:          horasDecimales(totalMinutos),
    promedioHorasPorEmpleado: empleadosUnicos > 0 ? horasDecimales(totalMinutos / empleadosUnicos) : 0,
  };
}

// ─── Punto de entrada principal ───────────────────────────────────────────────

/**
 * Evalúa un conjunto de asignaciones contra todas las restricciones.
 *
 * @param {Object} params
 * @param {Array}  params.asignaciones      - Lista de asignaciones a evaluar
 * @param {Array}  [params.turnos]          - Turnos/slots para CE007
 * @param {Array}  [params.areasRequeridas] - Requisitos de cobertura por área/día
 * @param {Set}    [params.empleadosInactivos] - IDs de empleados inactivos
 * @param {Object} [params.limites]         - Overrides de límites: { horasDescansoMinimo, maxHorasSemanales, maxHorasMensuales }
 *
 * @returns {{ valido: boolean, violaciones: Array, advertencias: Array, indicadores: Object }}
 */
function evaluar({
  asignaciones      = [],
  turnos            = [],
  areasRequeridas   = [],
  empleadosInactivos = new Set(),
  limites           = {},
}) {
  const {
    horasDescansoMinimo = 8,
    maxHorasSemanales   = 48,
    maxHorasMensuales   = 192,
  } = limites;

  const todasViolaciones = [
    ...validarDobleTurno(asignaciones),
    ...validarDescansoMinimo(asignaciones, horasDescansoMinimo),
    ...validarHorasSemanales(asignaciones, maxHorasSemanales),
    ...validarHorasMensuales(asignaciones, maxHorasMensuales),
    ...validarSolapamiento(asignaciones),
    ...validarEmpleadosInactivos(asignaciones, empleadosInactivos),
    ...validarTurnosSinEmpleados(turnos),
    ...validarAreaDescubierta(areasRequeridas, asignaciones),
  ];

  const errores      = todasViolaciones.filter(v => v.gravedad === 'error');
  const advertencias = todasViolaciones.filter(v => v.gravedad === 'advertencia');

  return {
    valido:       errores.length === 0,
    violaciones:  errores,
    advertencias,
    indicadores:  calcularIndicadores(asignaciones),
    resumen: {
      totalErrores:       errores.length,
      totalAdvertencias:  advertencias.length,
      codigosAfectados:   [...new Set(todasViolaciones.map(v => v.codigo))],
    },
  };
}

module.exports = { evaluar, CODIGOS, calcularIndicadores };

/*
 * ─── ESQUEMA DE ASIGNACIÓN ESPERADA ──────────────────────────────────────────
 * {
 *   id:          string,   // ID único de la asignación
 *   empleadoId:  string,   // ID del empleado
 *   turno:       string,   // Nombre del turno (ej. 'TURNO_A')
 *   area:        string,   // Nombre del área
 *   fechaInicio: string,   // ISO 8601 datetime (ej. '2026-08-01T06:00:00.000Z')
 *   fechaFin:    string,   // ISO 8601 datetime
 * }
 *
 * ─── ESQUEMA DE TURNO ESPERADO (para CE007) ──────────────────────────────────
 * {
 *   id:          string,
 *   nombre:      string,
 *   area:        string,
 *   fecha:       string,   // ISO date (ej. '2026-08-01')
 *   asignaciones: Array,
 * }
 *
 * ─── ESQUEMA DE ÁREA REQUERIDA (para CE009) ──────────────────────────────────
 * {
 *   nombre:         string,
 *   fecha:          string,  // ISO date
 *   minimoPersonas: number,
 * }
 */
