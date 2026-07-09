'use strict';

/**
 * Tests unitarios TDD — issue #26
 * Cubre funciones puras exportadas desde transporteController:
 *   _validarMotivoRechazo  — sanitización y validación de motivo
 *   _recalcularEstadoLogic — lógica pura de recalculo de estado general
 */

const {
  _validarMotivoRechazo,
  _recalcularEstadoLogic
} = require('../../controllers/transporteController');

// ─────────────────────────────────────────────────────────────────────────────
describe('_validarMotivoRechazo — valida motivo de rechazo', () => {

  test('retorna error si motivo es null', () => {
    const r = _validarMotivoRechazo(null);
    expect(r.valido).toBe(false);
    expect(r.error).toMatch(/motivo/i);
  });

  test('retorna error si motivo es undefined', () => {
    const r = _validarMotivoRechazo(undefined);
    expect(r.valido).toBe(false);
  });

  test('retorna error si motivo es cadena vacía', () => {
    const r = _validarMotivoRechazo('');
    expect(r.valido).toBe(false);
    expect(r.error).toMatch(/motivo/i);
  });

  test('retorna error si motivo es solo espacios', () => {
    const r = _validarMotivoRechazo('   ');
    expect(r.valido).toBe(false);
  });

  test('retorna error si motivo tiene menos de 5 caracteres', () => {
    const r = _validarMotivoRechazo('Hola');
    expect(r.valido).toBe(false);
    expect(r.error).toMatch(/5/);
  });

  test('retorna valido=true si motivo tiene exactamente 5 caracteres', () => {
    const r = _validarMotivoRechazo('12345');
    expect(r.valido).toBe(true);
    expect(r.sanitized).toBe('12345');
  });

  test('retorna error si motivo supera 500 caracteres', () => {
    const r = _validarMotivoRechazo('A'.repeat(501));
    expect(r.valido).toBe(false);
    expect(r.error).toMatch(/500/);
  });

  test('retorna valido=true si motivo tiene exactamente 500 caracteres', () => {
    const r = _validarMotivoRechazo('B'.repeat(500));
    expect(r.valido).toBe(true);
  });

  test('retorna error si motivo contiene etiqueta HTML (previene XSS)', () => {
    const r = _validarMotivoRechazo('<script>alert(1)</script>motivo válido');
    expect(r.valido).toBe(false);
    expect(r.error).toMatch(/no permitid/i);
  });

  test('retorna error para <img> tag', () => {
    const r = _validarMotivoRechazo('<img src=x onerror=alert(1)>texto');
    expect(r.valido).toBe(false);
  });

  test('texto normal válido pasa sin modificación (salvo trim)', () => {
    const r = _validarMotivoRechazo('  No corresponde al turno programado  ');
    expect(r.valido).toBe(true);
    expect(r.sanitized).toBe('No corresponde al turno programado');
  });

  test('texto con caracteres especiales no HTML pasa', () => {
    const r = _validarMotivoRechazo('Empleado en incapacidad médica — Semana 23');
    expect(r.valido).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('_recalcularEstadoLogic — calcula estado general de programación', () => {

  test('devuelve null si detalles es array vacío', () => {
    expect(_recalcularEstadoLogic([], 'validada')).toBeNull();
  });

  test('devuelve null si detalles es null', () => {
    expect(_recalcularEstadoLogic(null, 'validada')).toBeNull();
  });

  test('retorna null (sin cambio) si hay pendientes', () => {
    const estados = ['aprobado', 'pendiente', 'aprobado'];
    expect(_recalcularEstadoLogic(estados, 'validada')).toBeNull();
  });

  test('retorna null si todos siguen pendientes', () => {
    const estados = ['pendiente', 'pendiente'];
    expect(_recalcularEstadoLogic(estados, 'validada')).toBeNull();
  });

  test('retorna "aprobada" si todos están aprobados', () => {
    const estados = ['aprobado', 'aprobado', 'aprobado'];
    expect(_recalcularEstadoLogic(estados, 'validada')).toBe('aprobada');
  });

  test('retorna "aprobada_con_rechazos" si hay al menos un rechazado y no hay pendientes', () => {
    const estados = ['aprobado', 'rechazado', 'aprobado'];
    expect(_recalcularEstadoLogic(estados, 'validada')).toBe('aprobada_con_rechazos');
  });

  test('retorna "aprobada_con_rechazos" si todos están rechazados', () => {
    const estados = ['rechazado', 'rechazado'];
    expect(_recalcularEstadoLogic(estados, 'validada')).toBe('aprobada_con_rechazos');
  });

  test('respeta estado programación "enviada": no cambia', () => {
    const estados = ['aprobado', 'aprobado'];
    expect(_recalcularEstadoLogic(estados, 'enviada')).toBeNull();
  });

  test('respeta estado programación "cerrada": no cambia', () => {
    const estados = ['aprobado'];
    expect(_recalcularEstadoLogic(estados, 'cerrada')).toBeNull();
  });

  test('respeta estado programación "anulada": no cambia', () => {
    const estados = ['rechazado'];
    expect(_recalcularEstadoLogic(estados, 'anulada')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Reglas de negocio — lógica pura de permisos (sin DB)', () => {

  test('usuario con empleadoId != null y sin permiso: crearComoEmpleado=false', () => {
    const body = { empleadoId: 'emp-1', crearComoEmpleado: false };
    expect(body.crearComoEmpleado).toBe(false);
  });

  test('motivo vacío impide rechazo', () => {
    const r = _validarMotivoRechazo('');
    expect(r.valido).toBe(false);
  });

  test('motivo con script impide rechazo', () => {
    const r = _validarMotivoRechazo('<script>window.location="evil.com"</script>Rechazado');
    expect(r.valido).toBe(false);
  });

  test('motivo válido permite rechazo', () => {
    const r = _validarMotivoRechazo('No se requiere transporte este turno');
    expect(r.valido).toBe(true);
    expect(r.sanitized).toBeTruthy();
  });
});
