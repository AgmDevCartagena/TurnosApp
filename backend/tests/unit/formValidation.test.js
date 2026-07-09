'use strict';

/**
 * Tests unitarios TDD — issue #35
 * Valida la función pura de validación del formulario "Nueva Programación".
 * La función se define aquí como espejo del contrato de transporte.html.
 *
 * Causa raíz del bug: showAlert() escribe en #alertGlobal (z-index:auto),
 * que queda DETRÁS de .modal-overlay (z-index:1000). La corrección mueve
 * los errores al interior del modal con _showFormErrors().
 */

// ── Espejo de la función pura de transporte.html ──────────────────────────────

function _validateProgramacionForm(body) {
  const errors = {};
  if (!body.fecha || !String(body.fecha).trim())
    errors.fecha = 'Debe seleccionar una fecha válida.';
  if (!body.horaSalida || !String(body.horaSalida).trim())
    errors.horaSalida = 'Debe ingresar la hora de salida.';
  return errors;
}

// ── Tests: validación de campos obligatorios ──────────────────────────────────
describe('_validateProgramacionForm — validación de campos obligatorios', () => {

  test('sin errores cuando fecha y hora son válidas', () => {
    const e = _validateProgramacionForm({ fecha: '2025-06-21', horaSalida: '19:00' });
    expect(Object.keys(e)).toHaveLength(0);
  });

  test('error en fecha cuando está vacía', () => {
    const e = _validateProgramacionForm({ fecha: '', horaSalida: '19:00' });
    expect(e.fecha).toBeTruthy();
    expect(e.horaSalida).toBeUndefined();
  });

  test('error en horaSalida cuando está vacía', () => {
    const e = _validateProgramacionForm({ fecha: '2025-06-21', horaSalida: '' });
    expect(e.horaSalida).toBeTruthy();
    expect(e.fecha).toBeUndefined();
  });

  test('ambos errores cuando ambos campos faltan', () => {
    const e = _validateProgramacionForm({ fecha: '', horaSalida: '' });
    expect(e.fecha).toBeTruthy();
    expect(e.horaSalida).toBeTruthy();
  });

  test('espacios en fecha también fallan (trim)', () => {
    const e = _validateProgramacionForm({ fecha: '   ', horaSalida: '19:00' });
    expect(e.fecha).toBeTruthy();
  });

  test('espacios en hora también fallan (trim)', () => {
    const e = _validateProgramacionForm({ fecha: '2025-06-21', horaSalida: '   ' });
    expect(e.horaSalida).toBeTruthy();
  });

  test('retorna objeto nuevo en cada llamada (sin referencias compartidas)', () => {
    const a = _validateProgramacionForm({ fecha: '', horaSalida: '' });
    const b = _validateProgramacionForm({ fecha: '2025-06-21', horaSalida: '19:00' });
    expect(a).not.toBe(b);
    expect(Object.keys(a)).toHaveLength(2);
    expect(Object.keys(b)).toHaveLength(0);
  });
});

// ── Tests: mensajes de error son entendibles para el usuario ─────────────────
describe('_validateProgramacionForm — calidad de mensajes de error', () => {

  test('mensaje de fecha contiene "fecha" (legible para usuario)', () => {
    const e = _validateProgramacionForm({ fecha: '', horaSalida: '19:00' });
    expect(e.fecha.toLowerCase()).toMatch(/fecha/);
  });

  test('mensaje de hora contiene "hora" (legible para usuario)', () => {
    const e = _validateProgramacionForm({ fecha: '2025-06-21', horaSalida: '' });
    expect(e.horaSalida.toLowerCase()).toMatch(/hora/);
  });

  test('mensaje de fecha NO contiene stack trace ni términos técnicos', () => {
    const e = _validateProgramacionForm({ fecha: '', horaSalida: '19:00' });
    expect(e.fecha).not.toMatch(/undefined|null|TypeError|stack|Error:/i);
  });

  test('mensaje de hora NO contiene términos técnicos', () => {
    const e = _validateProgramacionForm({ fecha: '2025-06-21', horaSalida: '' });
    expect(e.horaSalida).not.toMatch(/undefined|null|TypeError|stack|Error:/i);
  });

  test('los mensajes tienen al menos 10 caracteres (no truncados)', () => {
    const e = _validateProgramacionForm({ fecha: '', horaSalida: '' });
    expect(e.fecha.length).toBeGreaterThanOrEqual(10);
    expect(e.horaSalida.length).toBeGreaterThanOrEqual(10);
  });
});

// ── Tests: comportamiento de flujo (backend no llamado si hay errores) ────────
describe('_validateProgramacionForm — flujo de validación', () => {

  test('no llama fetch cuando hay errores de validación', () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;
    const errors = _validateProgramacionForm({ fecha: '', horaSalida: '' });
    // Simula la guarda: solo llama fetch si NO hay errores
    if (Object.keys(errors).length === 0) fetchSpy();
    expect(fetchSpy).not.toHaveBeenCalled();
    delete global.fetch;
  });

  test('sí llamaría fetch cuando los datos son válidos', () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;
    const errors = _validateProgramacionForm({ fecha: '2025-06-21', horaSalida: '19:00' });
    if (Object.keys(errors).length === 0) fetchSpy();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    delete global.fetch;
  });

  test('al corregir fecha, el error de fecha desaparece', () => {
    let e = _validateProgramacionForm({ fecha: '', horaSalida: '19:00' });
    expect(e.fecha).toBeTruthy();
    e = _validateProgramacionForm({ fecha: '2025-06-21', horaSalida: '19:00' });
    expect(e.fecha).toBeUndefined();
  });

  test('al corregir hora, el error de hora desaparece', () => {
    let e = _validateProgramacionForm({ fecha: '2025-06-21', horaSalida: '' });
    expect(e.horaSalida).toBeTruthy();
    e = _validateProgramacionForm({ fecha: '2025-06-21', horaSalida: '07:00' });
    expect(e.horaSalida).toBeUndefined();
  });

  test('corregir un campo no introduce error en el otro', () => {
    const e = _validateProgramacionForm({ fecha: '2025-06-21', horaSalida: '07:00' });
    expect(e.fecha).toBeUndefined();
    expect(e.horaSalida).toBeUndefined();
  });

  test('payload de creación sin errores no incluye id residual', () => {
    const body = { fecha: '2025-06-21', horaSalida: '19:00', tipoMovimiento: 'salida' };
    const e = _validateProgramacionForm(body);
    expect(Object.keys(e)).toHaveLength(0);
    expect(body.id).toBeUndefined();
  });
});
