'use strict';

const {
  generarAlias,
  sanitizarAsignaciones,
  sanitizarEmpleado,
  sanitizarIndicadores,
  sanitizarTexto,
  validarRespuestaIA,
} = require('../../services/ia/sanitizer');

const EMP_ID   = 'emp-uuid-1234';
const EMP_ID_2 = 'emp-uuid-5678';
const EMPRESA  = 'empresa-uuid-abcd';

// ─── generarAlias ─────────────────────────────────────────────────────────────

describe('generarAlias', () => {
  test('genera alias con prefijo EMP_', () => {
    const alias = generarAlias(EMP_ID, EMPRESA);
    expect(alias).toMatch(/^EMP_[A-F0-9]{4}$/);
  });

  test('mismo input produce mismo alias (determinista)', () => {
    const a1 = generarAlias(EMP_ID, EMPRESA);
    const a2 = generarAlias(EMP_ID, EMPRESA);
    expect(a1).toBe(a2);
  });

  test('distintos empleadoId producen distintos alias', () => {
    const a1 = generarAlias(EMP_ID,   EMPRESA);
    const a2 = generarAlias(EMP_ID_2, EMPRESA);
    expect(a1).not.toBe(a2);
  });

  test('mismo empleado con diferente salt produce alias diferente', () => {
    const a1 = generarAlias(EMP_ID, 'empresa-A');
    const a2 = generarAlias(EMP_ID, 'empresa-B');
    expect(a1).not.toBe(a2);
  });
});

// ─── sanitizarAsignaciones ────────────────────────────────────────────────────

function mockAsig(overrides = {}) {
  return {
    id:              'a1',
    empleadoId:      EMP_ID,
    nombreEmpleado:  'Juan Pérez',
    turno:           'TURNO_A',
    area:            'PLANTA',
    fechaInicio:     '2026-08-01T06:00:00.000Z',
    fechaFin:        '2026-08-01T14:00:00.000Z',
    salarioMensual:  2500000,
    ...overrides,
  };
}

describe('sanitizarAsignaciones', () => {
  test('elimina empleadoId real del output', () => {
    const { asignacionesSanitizadas } = sanitizarAsignaciones([mockAsig()], EMPRESA);
    expect(asignacionesSanitizadas[0]).not.toHaveProperty('empleadoId');
    expect(asignacionesSanitizadas[0]).not.toHaveProperty('salarioMensual');
  });

  test('agrega alias en lugar del ID real', () => {
    const { asignacionesSanitizadas } = sanitizarAsignaciones([mockAsig()], EMPRESA);
    expect(asignacionesSanitizadas[0].alias).toMatch(/^EMP_/);
  });

  test('no incluye nombre por defecto (incluirNombres=false)', () => {
    const { asignacionesSanitizadas } = sanitizarAsignaciones([mockAsig()], EMPRESA, { incluirNombres: false });
    expect(asignacionesSanitizadas[0]).not.toHaveProperty('nombre');
  });

  test('incluye nombre cuando incluirNombres=true', () => {
    const { asignacionesSanitizadas } = sanitizarAsignaciones([mockAsig()], EMPRESA, { incluirNombres: true });
    expect(asignacionesSanitizadas[0].nombre).toBe('Juan Pérez');
  });

  test('conserva turno, area, fechas', () => {
    const { asignacionesSanitizadas } = sanitizarAsignaciones([mockAsig()], EMPRESA);
    const s = asignacionesSanitizadas[0];
    expect(s.turno).toBe('TURNO_A');
    expect(s.area).toBe('PLANTA');
    expect(s.fechaInicio).toBeDefined();
  });

  test('mapaAlias permite recuperar el ID original', () => {
    const { mapaAlias } = sanitizarAsignaciones([mockAsig()], EMPRESA);
    const alias = generarAlias(EMP_ID, EMPRESA);
    expect(mapaAlias[alias]).toBe(EMP_ID);
  });

  test('nunca expone salarios (incluso con incluirNombres=true)', () => {
    const { asignacionesSanitizadas } = sanitizarAsignaciones([mockAsig()], EMPRESA, { incluirNombres: true });
    const json = JSON.stringify(asignacionesSanitizadas);
    expect(json).not.toContain('2500000');
  });
});

// ─── sanitizarEmpleado ────────────────────────────────────────────────────────

describe('sanitizarEmpleado', () => {
  const empleado = { id: EMP_ID, nombre: 'Maria García', documento: '12345678', area: 'PLANTA', cargo: 'Operario', tipoContrato: 'FIJO', estado: 'activo', salario: 1800000 };

  test('elimina documento y salario', () => {
    const s = sanitizarEmpleado(empleado, EMPRESA);
    expect(s).not.toHaveProperty('documento');
    expect(s).not.toHaveProperty('salario');
    expect(s).not.toHaveProperty('nombre');
  });

  test('conserva cargo, area, tipoContrato', () => {
    const s = sanitizarEmpleado(empleado, EMPRESA);
    expect(s.cargo).toBe('Operario');
    expect(s.area).toBe('PLANTA');
    expect(s.tipoContrato).toBe('FIJO');
  });

  test('incluye nombre si incluirNombres=true', () => {
    const s = sanitizarEmpleado(empleado, EMPRESA, { incluirNombres: true });
    expect(s.nombre).toBe('Maria García');
  });
});

// ─── sanitizarIndicadores ─────────────────────────────────────────────────────

describe('sanitizarIndicadores', () => {
  test('elimina campos con costos monetarios', () => {
    const indicadores = {
      totalHoras: 160,
      empleadosUnicos: 10,
      costoTotal: 5000000,
      salarioPromedio: 2000000,
      costoPorHora: 12000,
    };
    const s = sanitizarIndicadores(indicadores);
    expect(s).not.toHaveProperty('costoTotal');
    expect(s).not.toHaveProperty('salarioPromedio');
    expect(s).not.toHaveProperty('costoPorHora');
  });

  test('conserva métricas de cobertura', () => {
    const indicadores = { totalHoras: 160, empleadosUnicos: 10, diasCubiertos: 20 };
    const s = sanitizarIndicadores(indicadores);
    expect(s.totalHoras).toBe(160);
    expect(s.empleadosUnicos).toBe(10);
    expect(s.diasCubiertos).toBe(20);
  });
});

// ─── sanitizarTexto ───────────────────────────────────────────────────────────

describe('sanitizarTexto', () => {
  test('oculta cédulas (números de 6+ dígitos)', () => {
    const resultado = sanitizarTexto('El empleado 12345678 tiene turno');
    expect(resultado).not.toContain('12345678');
    expect(resultado).toContain('[ID_OMITIDO]');
  });

  test('oculta emails', () => {
    const resultado = sanitizarTexto('Contactar a juan@empresa.com para confirmar');
    expect(resultado).not.toContain('juan@empresa.com');
    expect(resultado).toContain('[EMAIL_OMITIDO]');
  });

  test('oculta valores monetarios con $', () => {
    const resultado = sanitizarTexto('El salario es $2.500.000 mensuales');
    expect(resultado).not.toContain('2.500.000');
    expect(resultado).toContain('[VALOR_OMITIDO]');
  });

  test('no altera texto sin datos sensibles', () => {
    const texto = 'El turno TURNO_A cubre el área PLANTA los lunes';
    expect(sanitizarTexto(texto)).toBe(texto);
  });

  test('retorna el mismo valor si no es string', () => {
    expect(sanitizarTexto(null)).toBeNull();
    expect(sanitizarTexto(42)).toBe(42);
  });
});

// ─── validarRespuestaIA ───────────────────────────────────────────────────────

describe('validarRespuestaIA', () => {
  test('pasa cuando la respuesta no contiene IDs reales', () => {
    expect(() => validarRespuestaIA('El análisis muestra cobertura normal', new Set(['emp-uuid-1234']))).not.toThrow();
  });

  test('lanza error cuando la respuesta contiene un ID real', () => {
    expect(() => validarRespuestaIA('El empleado emp-uuid-1234 tiene conflicto', new Set(['emp-uuid-1234']))).toThrow(/sensible/i);
  });

  test('pasa con idsReales vacío', () => {
    expect(() => validarRespuestaIA('Cualquier texto', new Set())).not.toThrow();
  });

  test('retorna true cuando pasa la validación', () => {
    const resultado = validarRespuestaIA('texto normal', new Set(['id-secreto']));
    expect(resultado).toBe(true);
  });
});
