'use strict';

const { evaluar, CODIGOS, calcularIndicadores } = require('../../services/ia/constraintEngine');

// ─── Helpers de fixture ───────────────────────────────────────────────────────

function asig(overrides = {}) {
  return {
    id:          'a1',
    empleadoId:  'emp1',
    turno:       'TURNO_A',
    area:        'PLANTA',
    fechaInicio: '2026-08-01T06:00:00.000Z',
    fechaFin:    '2026-08-01T14:00:00.000Z',
    ...overrides,
  };
}

// ─── CODIGOS exportados ───────────────────────────────────────────────────────

describe('CODIGOS', () => {
  test('exporta todos los códigos esperados', () => {
    expect(CODIGOS.DOBLE_TURNO).toBe('CE001');
    expect(CODIGOS.DESCANSO_MINIMO).toBe('CE002');
    expect(CODIGOS.HORAS_SEMANALES).toBe('CE003');
    expect(CODIGOS.SOLAPAMIENTO).toBe('CE005');
    expect(CODIGOS.EMPLEADO_INACTIVO).toBe('CE006');
    expect(CODIGOS.AREA_DESCUBIERTA).toBe('CE009');
  });
});

// ─── evaluar — resultado vacío ────────────────────────────────────────────────

describe('evaluar — sin asignaciones', () => {
  test('retorna válido con colecciones vacías', () => {
    const result = evaluar({});
    expect(result.valido).toBe(true);
    expect(result.violaciones).toHaveLength(0);
    expect(result.advertencias).toHaveLength(0);
    expect(result.indicadores.totalAsignaciones).toBe(0);
  });
});

// ─── CE001 — Doble turno ──────────────────────────────────────────────────────

describe('CE001 — Doble turno', () => {
  test('no detecta error cuando empleado tiene un solo turno por día', () => {
    const result = evaluar({ asignaciones: [asig()] });
    const err = result.violaciones.filter(v => v.codigo === CODIGOS.DOBLE_TURNO);
    expect(err).toHaveLength(0);
  });

  test('detecta doble turno: mismo empleado, mismo día', () => {
    const a1 = asig({ id: 'a1', fechaInicio: '2026-08-01T06:00:00.000Z', fechaFin: '2026-08-01T14:00:00.000Z' });
    const a2 = asig({ id: 'a2', fechaInicio: '2026-08-01T16:00:00.000Z', fechaFin: '2026-08-01T22:00:00.000Z' });
    const result = evaluar({ asignaciones: [a1, a2] });
    const err = result.violaciones.filter(v => v.codigo === CODIGOS.DOBLE_TURNO);
    expect(err).toHaveLength(1);
    expect(err[0].empleadoId).toBe('emp1');
    expect(err[0].gravedad).toBe('error');
  });

  test('no detecta error cuando dos empleados distintos tienen turno el mismo día', () => {
    const a1 = asig({ id: 'a1', empleadoId: 'emp1' });
    const a2 = asig({ id: 'a2', empleadoId: 'emp2' });
    const result = evaluar({ asignaciones: [a1, a2] });
    const err = result.violaciones.filter(v => v.codigo === CODIGOS.DOBLE_TURNO);
    expect(err).toHaveLength(0);
  });
});

// ─── CE002 — Descanso mínimo ──────────────────────────────────────────────────

describe('CE002 — Descanso mínimo', () => {
  test('no detecta error con descanso suficiente', () => {
    const a1 = asig({ id: 'a1', fechaInicio: '2026-08-01T06:00:00.000Z', fechaFin: '2026-08-01T14:00:00.000Z' });
    const a2 = asig({ id: 'a2', fechaInicio: '2026-08-02T06:00:00.000Z', fechaFin: '2026-08-02T14:00:00.000Z' });
    const result = evaluar({ asignaciones: [a1, a2] });
    const err = result.violaciones.filter(v => v.codigo === CODIGOS.DESCANSO_MINIMO);
    expect(err).toHaveLength(0);
  });

  test('detecta descanso insuficiente (< 8h entre fin y nuevo inicio)', () => {
    const a1 = asig({ id: 'a1', fechaInicio: '2026-08-01T06:00:00.000Z', fechaFin: '2026-08-01T22:00:00.000Z' });
    const a2 = asig({ id: 'a2', fechaInicio: '2026-08-02T04:00:00.000Z', fechaFin: '2026-08-02T12:00:00.000Z' });
    const result = evaluar({ asignaciones: [a1, a2] });
    const err = result.violaciones.filter(v => v.codigo === CODIGOS.DESCANSO_MINIMO);
    expect(err).toHaveLength(1);
    expect(err[0].gravedad).toBe('error');
    expect(err[0].detalle.horasDescanso).toBeLessThan(8);
  });

  test('respeta límite personalizado de horasDescansoMinimo', () => {
    const a1 = asig({ id: 'a1', fechaInicio: '2026-08-01T06:00:00.000Z', fechaFin: '2026-08-01T14:00:00.000Z' });
    const a2 = asig({ id: 'a2', fechaInicio: '2026-08-01T20:00:00.000Z', fechaFin: '2026-08-02T04:00:00.000Z' });
    const result = evaluar({ asignaciones: [a1, a2], limites: { horasDescansoMinimo: 12 } });
    const err = result.violaciones.filter(v => v.codigo === CODIGOS.DESCANSO_MINIMO);
    expect(err).toHaveLength(1);
  });
});

// ─── CE005 — Solapamiento ─────────────────────────────────────────────────────

describe('CE005 — Solapamiento de turnos', () => {
  test('detecta solapamiento entre dos turnos del mismo empleado', () => {
    const a1 = asig({ id: 'a1', fechaInicio: '2026-08-01T06:00:00.000Z', fechaFin: '2026-08-01T14:00:00.000Z' });
    const a2 = asig({ id: 'a2', fechaInicio: '2026-08-01T12:00:00.000Z', fechaFin: '2026-08-01T20:00:00.000Z' });
    const result = evaluar({ asignaciones: [a1, a2] });
    const err = result.violaciones.filter(v => v.codigo === CODIGOS.SOLAPAMIENTO);
    expect(err).toHaveLength(1);
  });

  test('no detecta solapamiento cuando los turnos son consecutivos exactos', () => {
    const a1 = asig({ id: 'a1', fechaInicio: '2026-08-01T06:00:00.000Z', fechaFin: '2026-08-01T14:00:00.000Z' });
    const a2 = asig({ id: 'a2', fechaInicio: '2026-08-01T14:00:00.000Z', fechaFin: '2026-08-01T22:00:00.000Z' });
    const result = evaluar({ asignaciones: [a1, a2] });
    const err = result.violaciones.filter(v => v.codigo === CODIGOS.SOLAPAMIENTO);
    expect(err).toHaveLength(0);
  });
});

// ─── CE006 — Empleado inactivo ────────────────────────────────────────────────

describe('CE006 — Empleados inactivos', () => {
  test('detecta empleado inactivo asignado a turno', () => {
    const result = evaluar({
      asignaciones:      [asig()],
      empleadosInactivos: new Set(['emp1']),
    });
    const err = result.violaciones.filter(v => v.codigo === CODIGOS.EMPLEADO_INACTIVO);
    expect(err).toHaveLength(1);
    expect(err[0].gravedad).toBe('error');
  });

  test('no reporta empleado activo', () => {
    const result = evaluar({
      asignaciones:      [asig()],
      empleadosInactivos: new Set(['emp99']),
    });
    const err = result.violaciones.filter(v => v.codigo === CODIGOS.EMPLEADO_INACTIVO);
    expect(err).toHaveLength(0);
  });
});

// ─── CE007 — Turno sin empleados ──────────────────────────────────────────────

describe('CE007 — Turno sin empleados', () => {
  test('detecta turno sin asignaciones', () => {
    const result = evaluar({
      turnos: [{ id: 't1', nombre: 'TURNO_A', area: 'PLANTA', fecha: '2026-08-01', asignaciones: [] }],
    });
    const adv = result.advertencias.filter(v => v.codigo === CODIGOS.TURNO_SIN_EMPLEADOS);
    expect(adv).toHaveLength(1);
    expect(adv[0].gravedad).toBe('advertencia');
  });

  test('no reporta turno con empleados', () => {
    const result = evaluar({
      turnos: [{ id: 't1', nombre: 'TURNO_A', area: 'PLANTA', fecha: '2026-08-01', asignaciones: [{ id: 'x' }] }],
    });
    const adv = result.advertencias.filter(v => v.codigo === CODIGOS.TURNO_SIN_EMPLEADOS);
    expect(adv).toHaveLength(0);
  });
});

// ─── CE009 — Área descubierta ─────────────────────────────────────────────────

describe('CE009 — Área descubierta', () => {
  test('detecta área con cobertura cero como error', () => {
    const result = evaluar({
      asignaciones:   [],
      areasRequeridas: [{ nombre: 'PLANTA', fecha: '2026-08-01', minimoPersonas: 2 }],
    });
    const err = result.violaciones.filter(v => v.codigo === CODIGOS.AREA_DESCUBIERTA);
    expect(err).toHaveLength(1);
    expect(err[0].gravedad).toBe('error');
  });

  test('detecta área con cobertura parcial como advertencia', () => {
    const result = evaluar({
      asignaciones:   [asig({ empleadoId: 'emp1', area: 'PLANTA' })],
      areasRequeridas: [{ nombre: 'PLANTA', fecha: '2026-08-01', minimoPersonas: 3 }],
    });
    const adv = result.advertencias.filter(v => v.codigo === CODIGOS.AREA_DESCUBIERTA);
    expect(adv).toHaveLength(1);
    expect(adv[0].gravedad).toBe('advertencia');
  });

  test('no reporta cuando la cobertura es suficiente', () => {
    const asigs = [
      asig({ id: 'a1', empleadoId: 'emp1', area: 'PLANTA' }),
      asig({ id: 'a2', empleadoId: 'emp2', area: 'PLANTA' }),
      asig({ id: 'a3', empleadoId: 'emp3', area: 'PLANTA' }),
    ];
    const result = evaluar({
      asignaciones:   asigs,
      areasRequeridas: [{ nombre: 'PLANTA', fecha: '2026-08-01', minimoPersonas: 3 }],
    });
    const issues = [...result.violaciones, ...result.advertencias].filter(v => v.codigo === CODIGOS.AREA_DESCUBIERTA);
    expect(issues).toHaveLength(0);
  });
});

// ─── calcularIndicadores ──────────────────────────────────────────────────────

describe('calcularIndicadores', () => {
  test('calcula correctamente con una asignación de 8h', () => {
    const ind = calcularIndicadores([asig()]);
    expect(ind.totalAsignaciones).toBe(1);
    expect(ind.empleadosUnicos).toBe(1);
    expect(ind.diasCubiertos).toBe(1);
    expect(ind.totalHoras).toBe(8);
    expect(ind.promedioHorasPorEmpleado).toBe(8);
  });

  test('calcula promedio con dos empleados', () => {
    const a1 = asig({ id: 'a1', empleadoId: 'emp1' });
    const a2 = asig({ id: 'a2', empleadoId: 'emp2' });
    const ind = calcularIndicadores([a1, a2]);
    expect(ind.empleadosUnicos).toBe(2);
    expect(ind.totalHoras).toBe(16);
    expect(ind.promedioHorasPorEmpleado).toBe(8);
  });

  test('retorna cero con lista vacía sin división por cero', () => {
    const ind = calcularIndicadores([]);
    expect(ind.totalHoras).toBe(0);
    expect(ind.promedioHorasPorEmpleado).toBe(0);
  });
});

// ─── evaluar — resumen integrado ──────────────────────────────────────────────

describe('evaluar — resumen', () => {
  test('valido=false cuando hay al menos un error', () => {
    const a1 = asig({ id: 'a1', fechaInicio: '2026-08-01T06:00:00.000Z', fechaFin: '2026-08-01T14:00:00.000Z' });
    const a2 = asig({ id: 'a2', fechaInicio: '2026-08-01T16:00:00.000Z', fechaFin: '2026-08-01T22:00:00.000Z' });
    const result = evaluar({ asignaciones: [a1, a2] });
    expect(result.valido).toBe(false);
    expect(result.resumen.totalErrores).toBeGreaterThan(0);
  });

  test('valido=true con solo advertencias (sin errores)', () => {
    const result = evaluar({
      turnos: [{ id: 't1', nombre: 'T', area: 'A', fecha: '2026-08-01', asignaciones: [] }],
    });
    expect(result.valido).toBe(true);
    expect(result.advertencias.length).toBeGreaterThan(0);
  });
});
