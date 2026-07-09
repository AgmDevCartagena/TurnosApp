/**
 * TDD — issue #30: El sistema no toma el horario configurado en los turnos
 *
 * Documenta y protege el comportamiento correcto de `clasificarTurno`
 * cuando la empresa tiene configuraciones no estándar (ej: TURNO_B = 14:46-22:48).
 *
 * SIN config  → 14:46-22:48 cae en fallback como 'otro'.
 * CON config  → 14:46-22:48 debe retornar tipo configurado en la empresa.
 */
'use strict';

jest.mock('../../lib/prisma', () => ({
  $disconnect: jest.fn(),
}));
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue({}),
  connection: { readyState: 0, on: jest.fn(), once: jest.fn(), off: jest.fn(), collections: {} },
  model: jest.fn().mockReturnValue({}),
  Schema: function Schema() { return { plugin: jest.fn() }; },
  Types: { ObjectId: { isValid: () => true } },
}));

const { _clasificarTurno } = require('../../controllers/transporteController');

// ─── Fixtures: configs que coinciden con el screenshot del issue #30 ──────────

const CONFIG_TURNO_A_SCREENSHOT = {
  id: 'cfg-a-123', codigo: 'TURNO_A', nombreTurno: 'turno normal',
  horaInicio: '13:39', horaFin: '17:42',
  horaExtensionInicio: null, horaExtensionFin: null,
  generaMerienda: false, generaCena: false,
  requiereResponsable: false, esExtendido: false, esTurnoNocturno: false, activo: true
};

const CONFIG_TURNO_B_SCREENSHOT = {
  id: 'cfg-b-456', codigo: 'TURNO_B', nombreTurno: 'TURNO EXTRA',
  horaInicio: '14:46', horaFin: '22:48',
  horaExtensionInicio: null, horaExtensionFin: null,
  generaMerienda: false, generaCena: false,
  requiereResponsable: false, esExtendido: false, esTurnoNocturno: true, activo: true
};

const CONFIG_TURNO_B_SPM = {
  id: 'cfg-b-spm', codigo: 'TURNO_B', nombreTurno: 'Turno B SPM',
  horaInicio: '19:00', horaFin: '07:00',
  horaExtensionInicio: null, horaExtensionFin: null,
  generaMerienda: false, generaCena: true,
  requiereResponsable: true, esExtendido: false, esTurnoNocturno: true, activo: true
};

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Empresa con horarios no estándar (caso del screenshot)
// ─────────────────────────────────────────────────────────────────────────────
describe('clasificarTurno con configuración no estándar — issue #30', () => {

  const configsEmpresa = [CONFIG_TURNO_A_SCREENSHOT, CONFIG_TURNO_B_SCREENSHOT];

  // ── TURNO_B = 14:46-22:48 ────────────────────────────────────────────────

  test('[REGRESIÓN #30] TURNO_B 14:46-22:48 con config → tipo turno_b', () => {
    const r = _clasificarTurno('14:46', '22:48', configsEmpresa);
    expect(r.tipo).toBe('turno_b');
  });

  test('[REGRESIÓN #30] TURNO_B 14:46-22:48 SIN config → tipo otro (fallback)', () => {
    const r = _clasificarTurno('14:46', '22:48', []);
    expect(r.tipo).toBe('otro');
  });

  test('[REGRESIÓN #30] diferencia con/sin config demuestra necesidad del selector UI', () => {
    const sinConfig = _clasificarTurno('14:46', '22:48', []);
    const conConfig = _clasificarTurno('14:46', '22:48', configsEmpresa);
    expect(sinConfig.tipo).not.toBe(conConfig.tipo);
    expect(conConfig.tipo).toBe('turno_b');
  });

  // ── TURNO_A = 13:39-17:42 ────────────────────────────────────────────────

  test('[REGRESIÓN #30] TURNO_A 13:39-17:42 con config → tipo normal', () => {
    const r = _clasificarTurno('13:39', '17:42', configsEmpresa);
    expect(r.tipo).toBe('normal');
  });

  test('[REGRESIÓN #30] TURNO_A 13:39-17:42 SIN config → tipo otro (fallback)', () => {
    const r = _clasificarTurno('13:39', '17:42', []);
    expect(r.tipo).toBe('otro');
  });

  // ── Merienda/cena vienen de la config, no hardcodeados ────────────────────

  test('merienda viene de config.generaMerienda, no de regla hardcodeada', () => {
    const configConMerienda = [{
      ...CONFIG_TURNO_B_SCREENSHOT, generaMerienda: true, generaCena: false
    }];
    const r = _clasificarTurno('14:46', '22:48', configConMerienda);
    expect(r.merienda).toBe(true);
    expect(r.cena).toBe(false);
  });

  test('cena viene de config.generaCena, no de regla hardcodeada', () => {
    const configConCena = [{
      ...CONFIG_TURNO_B_SCREENSHOT, generaMerienda: false, generaCena: true
    }];
    const r = _clasificarTurno('14:46', '22:48', configConCena);
    expect(r.merienda).toBe(false);
    expect(r.cena).toBe(true);
  });

  test('requiereResponsable viene de config, no de regla hardcodeada', () => {
    const configConResp = [{
      ...CONFIG_TURNO_B_SCREENSHOT, requiereResponsable: true
    }];
    const r = _clasificarTurno('14:46', '22:48', configConResp);
    expect(r.requiereResponsable).toBe(true);
  });

  test('TURNO_A 13:39-17:42 → sin merienda ni cena según config', () => {
    const r = _clasificarTurno('13:39', '17:42', configsEmpresa);
    expect(r.merienda).toBe(false);
    expect(r.cena).toBe(false);
    expect(r.requiereResponsable).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Aislamiento multiempresa
// ─────────────────────────────────────────────────────────────────────────────
describe('clasificarTurno multiempresa — issue #30', () => {

  test('empresa A con TURNO_B=14:46-22:48 y empresa B con TURNO_B=19:00-07:00 son independientes', () => {
    const configsA = [CONFIG_TURNO_B_SCREENSHOT];
    const configsB = [CONFIG_TURNO_B_SPM];

    const rA = _clasificarTurno('14:46', '22:48', configsA);
    const rB = _clasificarTurno('19:00', '07:00', configsB);

    expect(rA.tipo).toBe('turno_b');
    expect(rB.tipo).toBe('turno_b');
  });

  test('horas de empresa A NO hacen match con config de empresa B', () => {
    const configsB = [CONFIG_TURNO_B_SPM];
    const r = _clasificarTurno('14:46', '22:48', configsB);
    expect(r.tipo).toBe('otro');
  });

  test('horas de empresa B (19:00-07:00) NO hacen match con config de empresa A → otro', () => {
    // empresa A solo tiene TURNO_B=14:46-22:48; 19:00-07:00 no debe clasificarse
    // como turno_b vía fallback SPM cuando la empresa ya tiene su propia config
    const configsA = [CONFIG_TURNO_B_SCREENSHOT];
    const r = _clasificarTurno('19:00', '07:00', configsA);
    expect(r.tipo).toBe('otro');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Fallback hardcodeado SPM cuando no hay config
// ─────────────────────────────────────────────────────────────────────────────
describe('clasificarTurno fallback SPM cuando no hay config', () => {

  test('sin config, 19:00-07:00 → turno_b (fallback SPM)', () => {
    const r = _clasificarTurno('19:00', '07:00', []);
    expect(r.tipo).toBe('turno_b');
    expect(r.cena).toBe(true);
  });

  test('sin config, 07:00-16:00 → normal (fallback SPM)', () => {
    const r = _clasificarTurno('07:00', '16:00', []);
    expect(r.tipo).toBe('normal');
  });

  test('sin config, 07:00-19:00 → extendido (fallback SPM)', () => {
    const r = _clasificarTurno('07:00', '19:00', []);
    expect(r.tipo).toBe('extendido');
  });

  test('sin config, 14:46-22:48 → otro (no encaja en fallback SPM)', () => {
    const r = _clasificarTurno('14:46', '22:48', []);
    expect(r.tipo).toBe('otro');
  });

  test('sin config, 13:39-17:42 → otro (no encaja en fallback SPM)', () => {
    const r = _clasificarTurno('13:39', '17:42', []);
    expect(r.tipo).toBe('otro');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Horario extendido con config
// ─────────────────────────────────────────────────────────────────────────────
describe('clasificarTurno turno extendido con config', () => {

  const CONFIG_EXTENDIDO = {
    id: 'cfg-ext', codigo: 'TURNO_EXT', nombreTurno: 'Extendido',
    horaInicio: '07:00', horaFin: '16:00',
    horaExtensionInicio: '07:00', horaExtensionFin: '19:00',
    generaMerienda: true, generaCena: false,
    requiereResponsable: true, esExtendido: true, esTurnoNocturno: false, activo: true
  };

  test('extensión 07:00-19:00 → extendido con merienda', () => {
    const r = _clasificarTurno('07:00', '19:00', [CONFIG_EXTENDIDO]);
    expect(r.tipo).toBe('extendido');
    expect(r.merienda).toBe(true);
    expect(r.requiereResponsable).toBe(true);
  });

  test('base 07:00-16:00 con config sin merienda → normal sin merienda', () => {
    // Fixture con generaMerienda=false para el turno base
    const configBase = { ...CONFIG_EXTENDIDO, generaMerienda: false, requiereResponsable: false };
    const r = _clasificarTurno('07:00', '16:00', [configBase]);
    expect(r.tipo).toBe('normal');
    expect(r.merienda).toBe(false);
  });

  test('base 07:00-16:00 con config que tiene generaMerienda=true → merienda:true', () => {
    // Si la empresa configuró generaMerienda=true para ese horario base, debe respetarse
    const r = _clasificarTurno('07:00', '16:00', [CONFIG_EXTENDIDO]);
    expect(r.tipo).toBe('normal');
    expect(r.merienda).toBe(true);
  });
});
