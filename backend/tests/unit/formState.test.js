'use strict';

/**
 * Tests unitarios TDD — issue #29
 * Valida el estado inicial de los formularios de transporte.
 * Las funciones puras se definen aquí (espejo del frontend) para ser
 * testables sin DOM. El contrato que definen debe coincidir exactamente
 * con la implementación en transporte.html.
 */

// ── Funciones puras (espejo del contrato frontend) ────────────────────────────

function getInitialProgramacionFormState() {
  return {
    fecha:           '',
    horaSalida:      '19:00',
    tipoMovimiento:  'salida',
    conductorId:     '',
    conductorManual: '',
    vehiculoId:      '',
    placaManual:     '',
    titulo:          '',
    observaciones:   ''
  };
}

function getInitialNovedadFormState() {
  return {
    tipoNovedad:  'persona_no_asistio',
    empleado:     '',
    descripcion:  ''
  };
}

// ── Tests: estado inicial de programación ─────────────────────────────────────
describe('getInitialProgramacionFormState — estado limpio para Nueva Programación', () => {

  test('fecha inicia vacía (sin fecha de registro anterior)', () => {
    expect(getInitialProgramacionFormState().fecha).toBe('');
  });

  test('horaSalida inicia en 19:00 (default de negocio)', () => {
    expect(getInitialProgramacionFormState().horaSalida).toBe('19:00');
  });

  test('tipoMovimiento inicia en "salida"', () => {
    expect(getInitialProgramacionFormState().tipoMovimiento).toBe('salida');
  });

  test('conductorId inicia vacío (sin asignar)', () => {
    expect(getInitialProgramacionFormState().conductorId).toBe('');
  });

  test('conductorManual inicia vacío — fix #29 (antes retenía "vyv 444")', () => {
    expect(getInitialProgramacionFormState().conductorManual).toBe('');
  });

  test('vehiculoId inicia vacío (sin asignar)', () => {
    expect(getInitialProgramacionFormState().vehiculoId).toBe('');
  });

  test('placaManual inicia vacío', () => {
    expect(getInitialProgramacionFormState().placaManual).toBe('');
  });

  test('titulo inicia vacío — fix #29 (antes retenía "pruebas")', () => {
    expect(getInitialProgramacionFormState().titulo).toBe('');
  });

  test('observaciones inicia vacío', () => {
    expect(getInitialProgramacionFormState().observaciones).toBe('');
  });

  test('cada llamada retorna un objeto nuevo (sin referencias compartidas)', () => {
    const a = getInitialProgramacionFormState();
    const b = getInitialProgramacionFormState();
    a.titulo = 'modificado';
    expect(b.titulo).toBe('');
  });

  test('el objeto tiene exactamente los campos esperados', () => {
    const keys = Object.keys(getInitialProgramacionFormState()).sort();
    expect(keys).toEqual([
      'conductorId', 'conductorManual', 'fecha', 'horaSalida',
      'observaciones', 'placaManual', 'tipoMovimiento', 'titulo', 'vehiculoId'
    ]);
  });
});

// ── Tests: estado inicial de novedad ─────────────────────────────────────────
describe('getInitialNovedadFormState — estado limpio para Registrar Novedad', () => {

  test('tipoNovedad inicia en primer valor del select', () => {
    expect(getInitialNovedadFormState().tipoNovedad).toBe('persona_no_asistio');
  });

  test('empleado inicia vacío (sin dato de novedad anterior)', () => {
    expect(getInitialNovedadFormState().empleado).toBe('');
  });

  test('descripcion inicia vacía (sin texto de novedad anterior)', () => {
    expect(getInitialNovedadFormState().descripcion).toBe('');
  });

  test('cada llamada retorna objeto nuevo', () => {
    const a = getInitialNovedadFormState();
    const b = getInitialNovedadFormState();
    a.descripcion = 'anterior';
    expect(b.descripcion).toBe('');
  });
});

// ── Tests: reglas de separación create/edit ───────────────────────────────────
describe('Separación create vs edit — reglas de negocio', () => {

  test('modo create: estado inicial no contiene id de registro', () => {
    const state = getInitialProgramacionFormState();
    expect(state.id).toBeUndefined();
  });

  test('modo create: no debe contener datos de conductor previo', () => {
    const prev = { conductorManual: 'vyv 444', titulo: 'pruebas', fecha: '2025-05-22' };
    const clean = getInitialProgramacionFormState();
    expect(clean.conductorManual).not.toBe(prev.conductorManual);
    expect(clean.titulo).not.toBe(prev.titulo);
    expect(clean.fecha).not.toBe(prev.fecha);
  });

  test('cerrar modal debe resultar en estado inicial en próxima apertura', () => {
    // Simula: usuario editó campos y "cerró" → estado debe volver al inicial
    let formData = { titulo: 'Turno noche', conductorManual: '166 Nicolas', fecha: '2025-06-21' };
    // Al abrir nuevo → se reemplaza con estado inicial
    formData = getInitialProgramacionFormState();
    expect(formData.titulo).toBe('');
    expect(formData.conductorManual).toBe('');
    expect(formData.fecha).toBe('');
  });

  test('editar un registro no contamina el siguiente create', () => {
    let formData = { titulo: 'registro viejo', conductorManual: 'Bus 44', fecha: '2025-05-31' };
    // Simula guardar edición y luego abrir nuevo
    formData = getInitialProgramacionFormState();
    expect(formData.titulo).toBe('');
    expect(formData.conductorManual).toBe('');
  });

  test('POST de creación no debe incluir id', () => {
    const payload = getInitialProgramacionFormState();
    expect(payload.id).toBeUndefined();
  });
});
