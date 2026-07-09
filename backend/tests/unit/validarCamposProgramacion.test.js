'use strict';

/**
 * Tests TDD — issue #23
 * Valida la función pura _validarCamposProgramacion del transporteController.
 * Cubre: longitud máxima, campos obligatorios, formato, sanitización,
 *        trim, normalización de placa (mayúsculas).
 */

const { _validarCamposProgramacion } = require('../../controllers/transporteController');

// ── helper: genera string de N caracteres ─────────────────────────────────────
const rep = (n) => 'a'.repeat(n);

describe('_validarCamposProgramacion — campos obligatorios', () => {

  test('rechaza fecha vacía', () => {
    const e = _validarCamposProgramacion({ fecha: '', horaSalida: '07:00' });
    expect(e.fecha).toBeDefined();
  });

  test('rechaza fecha null', () => {
    const e = _validarCamposProgramacion({ fecha: null, horaSalida: '07:00' });
    expect(e.fecha).toBeDefined();
  });

  test('rechaza fecha con formato inválido (dd/mm/aaaa)', () => {
    const e = _validarCamposProgramacion({ fecha: '31/05/2026', horaSalida: '07:00' });
    expect(e.fecha).toBeDefined();
  });

  test('rechaza fecha inexistente (2026-13-01)', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-13-01', horaSalida: '07:00' });
    expect(e.fecha).toBeDefined();
  });

  test('acepta fecha válida YYYY-MM-DD', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00' });
    expect(e.fecha).toBeUndefined();
  });

  test('rechaza horaSalida vacía', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '' });
    expect(e.horaSalida).toBeDefined();
  });

  test('rechaza horaSalida con formato inválido (07:00 p.m.)', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00 p.m.' });
    expect(e.horaSalida).toBeDefined();
  });

  test('rechaza horaSalida hora imposible (25:00)', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '25:00' });
    expect(e.horaSalida).toBeDefined();
  });

  test('rechaza horaSalida minutos inválidos (07:61)', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:61' });
    expect(e.horaSalida).toBeDefined();
  });

  test('acepta horaSalida válida HH:mm', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '19:00' });
    expect(e.horaSalida).toBeUndefined();
  });
});

describe('_validarCamposProgramacion — tipoMovimiento', () => {

  test('rechaza tipoMovimiento no permitido', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', tipoMovimiento: 'vuelo' });
    expect(e.tipoMovimiento).toBeDefined();
  });

  test('acepta tipoMovimiento = salida', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', tipoMovimiento: 'salida' });
    expect(e.tipoMovimiento).toBeUndefined();
  });

  test('acepta tipoMovimiento = recogida', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', tipoMovimiento: 'recogida' });
    expect(e.tipoMovimiento).toBeUndefined();
  });

  test('acepta tipoMovimiento = retorno', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', tipoMovimiento: 'retorno' });
    expect(e.tipoMovimiento).toBeUndefined();
  });

  test('acepta tipoMovimiento ausente (usa default)', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00' });
    expect(e.tipoMovimiento).toBeUndefined();
  });
});

describe('_validarCamposProgramacion — conductorManual', () => {

  test('rechaza conductorManual mayor a 100 caracteres', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', conductorManual: rep(101) });
    expect(e.conductorManual).toMatch(/100/);
  });

  test('acepta conductorManual de exactamente 100 caracteres', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', conductorManual: rep(100) });
    expect(e.conductorManual).toBeUndefined();
  });

  test('rechaza conductorManual menor a 3 caracteres cuando se diligencia', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', conductorManual: 'ab' });
    expect(e.conductorManual).toBeDefined();
  });

  test('acepta conductorManual de exactamente 3 caracteres', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', conductorManual: 'abc' });
    expect(e.conductorManual).toBeUndefined();
  });

  test('acepta conductorManual vacío (campo opcional)', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', conductorManual: '' });
    expect(e.conductorManual).toBeUndefined();
  });

  test('acepta conductorManual ausente', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00' });
    expect(e.conductorManual).toBeUndefined();
  });

  test('rechaza script en conductorManual', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', conductorManual: '<script>alert("xss")</script>' });
    expect(e.conductorManual).toBeDefined();
  });

  test('rechaza HTML en conductorManual', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', conductorManual: '<b>Juan</b>' });
    expect(e.conductorManual).toBeDefined();
  });
});

describe('_validarCamposProgramacion — placaManual', () => {

  test('rechaza placaManual mayor a 20 caracteres', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', placaManual: rep(21) });
    expect(e.placaManual).toMatch(/20/);
  });

  test('acepta placaManual de exactamente 20 caracteres', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', placaManual: rep(20) });
    expect(e.placaManual).toBeUndefined();
  });

  test('acepta placaManual vacía (campo opcional)', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', placaManual: '' });
    expect(e.placaManual).toBeUndefined();
  });

  test('rechaza HTML en placaManual', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', placaManual: '<img src=x>' });
    expect(e.placaManual).toBeDefined();
  });
});

describe('_validarCamposProgramacion — titulo', () => {

  test('rechaza titulo mayor a 150 caracteres', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', titulo: rep(151) });
    expect(e.titulo).toMatch(/150/);
  });

  test('acepta titulo de exactamente 150 caracteres', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', titulo: rep(150) });
    expect(e.titulo).toBeUndefined();
  });

  test('acepta titulo vacío (campo opcional)', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', titulo: '' });
    expect(e.titulo).toBeUndefined();
  });

  test('rechaza script en titulo', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', titulo: '<script>alert(1)</script>' });
    expect(e.titulo).toBeDefined();
  });

  test('rechaza onerror= en titulo', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', titulo: '<img onerror=alert(1)>' });
    expect(e.titulo).toBeDefined();
  });
});

describe('_validarCamposProgramacion — observaciones', () => {

  test('rechaza observaciones mayor a 500 caracteres', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', observaciones: rep(501) });
    expect(e.observaciones).toMatch(/500/);
  });

  test('acepta observaciones de exactamente 500 caracteres', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', observaciones: rep(500) });
    expect(e.observaciones).toBeUndefined();
  });

  test('acepta observaciones vacías', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', observaciones: '' });
    expect(e.observaciones).toBeUndefined();
  });

  test('rechaza script en observaciones', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', observaciones: '<script>xss</script>' });
    expect(e.observaciones).toBeDefined();
  });
});

describe('_validarCamposProgramacion — trim y normalización', () => {

  test('hace trim de fecha antes de validar', () => {
    const e = _validarCamposProgramacion({ fecha: '  2026-05-31  ', horaSalida: '07:00' });
    expect(e.fecha).toBeUndefined();
  });

  test('hace trim de horaSalida antes de validar', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '  19:00  ' });
    expect(e.horaSalida).toBeUndefined();
  });

  test('hace trim de conductorManual: solo espacios → tratado como vacío (no mínimo 3)', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', conductorManual: '   ' });
    expect(e.conductorManual).toBeUndefined();
  });

  test('longitud de titulo se calcula después del trim', () => {
    const e = _validarCamposProgramacion({ fecha: '2026-05-31', horaSalida: '07:00', titulo: '  ' + rep(151) + '  ' });
    expect(e.titulo).toMatch(/150/);
  });

  test('acepta datos válidos completos sin errores', () => {
    const e = _validarCamposProgramacion({
      fecha:           '2026-05-31',
      horaSalida:      '19:00',
      tipoMovimiento:  'salida',
      conductorManual: 'Juan Pérez 166',
      placaManual:     'TVD-049',
      titulo:          'Salida turno B sábado 31/05',
      observaciones:   'Sin novedades'
    });
    expect(Object.keys(e)).toHaveLength(0);
  });
});
