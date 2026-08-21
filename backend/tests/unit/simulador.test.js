'use strict';

const {
  simular,
  simularReemplazo,
  simularIntercambio,
  simularAgregarAsignacion,
  simularEliminarAsignacion,
  calcularDiff,
} = require('../../services/ia/simulador');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function mkAsig(overrides = {}) {
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

const BASE = [
  mkAsig({ id: 'a1', empleadoId: 'emp1', fechaInicio: '2026-08-01T06:00:00.000Z', fechaFin: '2026-08-01T14:00:00.000Z' }),
  mkAsig({ id: 'a2', empleadoId: 'emp2', fechaInicio: '2026-08-02T06:00:00.000Z', fechaFin: '2026-08-02T14:00:00.000Z' }),
];

// ─── simularReemplazo ─────────────────────────────────────────────────────────

describe('simularReemplazo', () => {
  test('reemplaza todas las asignaciones del empleado saliente', () => {
    const { asignacionesResultantes, asignacionesModificadas } = simularReemplazo(BASE, 'emp1', 'emp99');
    expect(asignacionesModificadas).toBe(1);
    expect(asignacionesResultantes.find(a => a.id === 'a1').empleadoId).toBe('emp99');
    expect(asignacionesResultantes.find(a => a.id === 'a2').empleadoId).toBe('emp2');
  });

  test('marca las asignaciones modificadas con _simulado=true', () => {
    const { asignacionesResultantes } = simularReemplazo(BASE, 'emp1', 'emp99');
    expect(asignacionesResultantes.find(a => a.id === 'a1')._simulado).toBe(true);
    expect(asignacionesResultantes.find(a => a.id === 'a2')._simulado).toBeUndefined();
  });

  test('no modifica si el empleado no tiene asignaciones en el período', () => {
    const { asignacionesModificadas } = simularReemplazo(BASE, 'emp1', 'emp99', '2026-08-05', '2026-08-10');
    expect(asignacionesModificadas).toBe(0);
  });

  test('no muta el array original', () => {
    const original = BASE.map(a => ({ ...a }));
    simularReemplazo(BASE, 'emp1', 'emp99');
    expect(BASE[0].empleadoId).toBe(original[0].empleadoId);
  });
});

// ─── simularIntercambio ───────────────────────────────────────────────────────

describe('simularIntercambio', () => {
  const ASIGS_DIA = [
    mkAsig({ id: 'a1', empleadoId: 'emp1', turno: 'TURNO_A', fechaInicio: '2026-08-01T06:00:00.000Z', fechaFin: '2026-08-01T14:00:00.000Z' }),
    mkAsig({ id: 'a2', empleadoId: 'emp2', turno: 'TURNO_B', fechaInicio: '2026-08-01T14:00:00.000Z', fechaFin: '2026-08-01T22:00:00.000Z' }),
  ];

  test('intercambia los empleadoId entre sí', () => {
    const { asignacionesResultantes } = simularIntercambio(ASIGS_DIA, 'emp1', 'emp2', '2026-08-01');
    expect(asignacionesResultantes.find(a => a.id === 'a1').empleadoId).toBe('emp2');
    expect(asignacionesResultantes.find(a => a.id === 'a2').empleadoId).toBe('emp1');
  });

  test('solo afecta el día especificado', () => {
    const conOtroDia = [
      ...ASIGS_DIA,
      mkAsig({ id: 'a3', empleadoId: 'emp1', fechaInicio: '2026-08-02T06:00:00.000Z', fechaFin: '2026-08-02T14:00:00.000Z' }),
    ];
    const { asignacionesResultantes } = simularIntercambio(conOtroDia, 'emp1', 'emp2', '2026-08-01');
    expect(asignacionesResultantes.find(a => a.id === 'a3').empleadoId).toBe('emp1');
  });

  test('retorna asignacionesModificadas=2 cuando ambos tienen turno ese día', () => {
    const { asignacionesModificadas } = simularIntercambio(ASIGS_DIA, 'emp1', 'emp2', '2026-08-01');
    expect(asignacionesModificadas).toBe(2);
  });
});

// ─── simularAgregarAsignacion ─────────────────────────────────────────────────

describe('simularAgregarAsignacion', () => {
  test('agrega una nueva asignación con _simulado=true', () => {
    const nueva = { empleadoId: 'emp99', turno: 'TURNO_C', area: 'ADMIN', fechaInicio: '2026-08-03T06:00:00.000Z', fechaFin: '2026-08-03T14:00:00.000Z' };
    const { asignacionesResultantes, asignacionesModificadas } = simularAgregarAsignacion(BASE, nueva);
    expect(asignacionesResultantes).toHaveLength(BASE.length + 1);
    expect(asignacionesModificadas).toBe(1);
    const agregada = asignacionesResultantes.find(a => a.empleadoId === 'emp99');
    expect(agregada._simulado).toBe(true);
    expect(agregada._cambio).toBe('agregar');
  });
});

// ─── simularEliminarAsignacion ────────────────────────────────────────────────

describe('simularEliminarAsignacion', () => {
  test('elimina asignaciones de un empleado en una fecha específica', () => {
    const { asignacionesResultantes, asignacionesModificadas } = simularEliminarAsignacion(BASE, 'emp1', '2026-08-01');
    expect(asignacionesModificadas).toBe(1);
    expect(asignacionesResultantes.find(a => a.id === 'a1')).toBeUndefined();
    expect(asignacionesResultantes.find(a => a.id === 'a2')).toBeDefined();
  });

  test('retorna 0 si el empleado no tiene asignaciones ese día', () => {
    const { asignacionesModificadas } = simularEliminarAsignacion(BASE, 'emp1', '2026-08-15');
    expect(asignacionesModificadas).toBe(0);
  });
});

// ─── calcularDiff ─────────────────────────────────────────────────────────────

describe('calcularDiff', () => {
  test('detecta asignación modificada', () => {
    const original   = [mkAsig({ id: 'a1', empleadoId: 'emp1' })];
    const resultante = [mkAsig({ id: 'a1', empleadoId: 'emp2' })];
    const diff = calcularDiff(original, resultante);
    expect(diff).toHaveLength(1);
    expect(diff[0].tipo).toBe('modificada');
    expect(diff[0].antes.empleadoId).toBe('emp1');
    expect(diff[0].despues.empleadoId).toBe('emp2');
  });

  test('detecta asignación agregada', () => {
    const original   = [mkAsig({ id: 'a1' })];
    const resultante = [mkAsig({ id: 'a1' }), mkAsig({ id: 'a2' })];
    const diff = calcularDiff(original, resultante);
    expect(diff.some(d => d.tipo === 'agregada' && d.id === 'a2')).toBe(true);
  });

  test('detecta asignación eliminada', () => {
    const original   = [mkAsig({ id: 'a1' }), mkAsig({ id: 'a2' })];
    const resultante = [mkAsig({ id: 'a1' })];
    const diff = calcularDiff(original, resultante);
    expect(diff.some(d => d.tipo === 'eliminada' && d.id === 'a2')).toBe(true);
  });

  test('no reporta diff cuando no hay cambios', () => {
    const original   = [mkAsig({ id: 'a1', empleadoId: 'emp1' })];
    const resultante = [mkAsig({ id: 'a1', empleadoId: 'emp1' })];
    const diff = calcularDiff(original, resultante);
    expect(diff).toHaveLength(0);
  });
});

// ─── simular (punto de entrada integrado) ─────────────────────────────────────

describe('simular — integración', () => {
  test('tipo reemplazo: retorna validaciones base y resultante', () => {
    const resultado = simular({
      tipo: 'reemplazo',
      asignacionesBase: BASE,
      parametros: { empleadoIdSaliente: 'emp1', empleadoIdEntrante: 'emp99' },
    });
    expect(resultado.tipo).toBe('reemplazo');
    expect(resultado.diff).toBeDefined();
    expect(resultado.validacionBase).toBeDefined();
    expect(resultado.validacionResultante).toBeDefined();
    expect(typeof resultado.resumen).toBe('string');
  });

  test('tipo intercambio retorna diff con 2 cambios', () => {
    const asigs = [
      mkAsig({ id: 'a1', empleadoId: 'emp1', fechaInicio: '2026-08-01T06:00:00.000Z', fechaFin: '2026-08-01T14:00:00.000Z' }),
      mkAsig({ id: 'a2', empleadoId: 'emp2', fechaInicio: '2026-08-01T14:00:00.000Z', fechaFin: '2026-08-01T22:00:00.000Z' }),
    ];
    const resultado = simular({
      tipo: 'intercambio',
      asignacionesBase: asigs,
      parametros: { empleadoIdA: 'emp1', empleadoIdB: 'emp2', fecha: '2026-08-01' },
    });
    expect(resultado.asignacionesModificadas).toBe(2);
  });

  test('tipo no reconocido lanza error', () => {
    expect(() => simular({ tipo: 'inventado', asignacionesBase: [], parametros: {} })).toThrow(/no reconocido/i);
  });

  test('mejora=null cuando no cambia el número de errores', () => {
    const resultado = simular({
      tipo: 'reemplazo',
      asignacionesBase: BASE,
      parametros: { empleadoIdSaliente: 'emp-inexistente', empleadoIdEntrante: 'emp99' },
    });
    expect(resultado.mejora).toBeNull();
  });
});
