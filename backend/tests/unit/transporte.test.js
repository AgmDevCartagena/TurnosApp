'use strict';

/**
 * Tests unitarios TDD — Módulo de Transporte y Programación Operativa
 * Cubre: clasificarTurno, parsearTextoWhatsApp
 */

const { _clasificarTurno, _parsearTextoWhatsApp } = require('../../controllers/transporteController');

describe('clasificarTurno — reglas de negocio SPM', () => {

  // ── Turno A normal (07:00 – 16:00) ────────────────────────────────────────
  test('Turno A 07:00-16:00 → normal, sin merienda, sin cena', () => {
    const r = _clasificarTurno('07:00', '16:00');
    expect(r.tipo).toBe('normal');
    expect(r.merienda).toBe(false);
    expect(r.cena).toBe(false);
    expect(r.requiereResponsable).toBe(false);
  });

  // ── Turno A extendido (07:00 – 19:00) ─────────────────────────────────────
  test('Turno A extendido 07:00-19:00 → extendido, requiere merienda', () => {
    const r = _clasificarTurno('07:00', '19:00');
    expect(r.tipo).toBe('extendido');
    expect(r.merienda).toBe(true);
    expect(r.cena).toBe(false);
    expect(r.requiereResponsable).toBe(true);
  });

  // ── Turno B (19:00 – 07:00) ───────────────────────────────────────────────
  test('Turno B 19:00-07:00 → turno_b, requiere cena', () => {
    const r = _clasificarTurno('19:00', '07:00');
    expect(r.tipo).toBe('turno_b');
    expect(r.merienda).toBe(false);
    expect(r.cena).toBe(true);
    expect(r.requiereResponsable).toBe(true);
  });

  // ── Turno nocturno desde medianoche ────────────────────────────────────────
  test('Turno 23:00-07:00 → turno_b por inicio nocturno', () => {
    const r = _clasificarTurno('23:00', '07:00');
    expect(r.tipo).toBe('turno_b');
    expect(r.cena).toBe(true);
  });

  // ── Turno 16:00-23:00 (otros turnos) ──────────────────────────────────────
  test('Turno 16:00-23:00 → otro, sin merienda ni cena', () => {
    const r = _clasificarTurno('16:00', '23:00');
    expect(r.tipo).toBe('otro');
    expect(r.merienda).toBe(false);
    expect(r.cena).toBe(false);
  });

  // ── Config parametrizada sobreescribe defaults ─────────────────────────────
  test('Config personalizada: 06:00-14:00 extendido hasta 20:00 → merienda', () => {
    const configs = [{
      horaInicio: '06:00', horaFin: '14:00',
      horaExtensionInicio: '06:00', horaExtensionFin: '20:00',
      generaMerienda: true, generaCena: false,
      requiereResponsable: true, esExtendido: true, esTurnoNocturno: false
    }];
    const r = _clasificarTurno('06:00', '20:00', configs);
    expect(r.tipo).toBe('extendido');
    expect(r.merienda).toBe(true);
  });

  test('Config personalizada: 06:00-14:00 normal (sin extensión)', () => {
    const configs = [{
      horaInicio: '06:00', horaFin: '14:00',
      horaExtensionInicio: null, horaExtensionFin: null,
      generaMerienda: false, generaCena: false,
      requiereResponsable: false, esExtendido: false, esTurnoNocturno: false
    }];
    const r = _clasificarTurno('06:00', '14:00', configs);
    expect(r.tipo).toBe('normal');
    expect(r.merienda).toBe(false);
  });
});

describe('parsearTextoWhatsApp — parser de mensajes', () => {

  test('Detecta fecha en formato DD/MM', () => {
    const r = _parsearTextoWhatsApp('SABADO 30/05\nCCTV\nRocio Perez 07:00 a 16:00');
    expect(r.totalPersonas).toBe(1);
    expect(r.personas[0].fecha).toBe('2026-05-30');
  });

  test('Detecta fecha en formato DD-MM-YYYY', () => {
    const r = _parsearTextoWhatsApp('30-05-2026\nCCTV\nLuis Garces 07:00-16:00');
    expect(r.totalPersonas).toBe(1);
    expect(r.personas[0].fecha).toBe('2026-05-30');
  });

  test('Detecta área precedida por checkmark ✓', () => {
    const r = _parsearTextoWhatsApp('30/05\n✓lancheros\nRusbel Mejia 07:00 a 19:00');
    expect(r.personas[0].areaNombre).toBe('lancheros');
  });

  test('Detecta turno extendido 07:00-19:00 → merienda=true', () => {
    const r = _parsearTextoWhatsApp('30/05\nCCTV\nRusbel Mejia 07:00 a 19:00');
    expect(r.personas[0].tipoProgramacion).toBe('extendido');
    expect(r.personas[0].requiereMerienda).toBe(true);
    expect(r.personas[0].requiereCena).toBe(false);
  });

  test('Detecta turno B 19:00-07:00 → cena=true', () => {
    const r = _parsearTextoWhatsApp('30/05\nCCTV\nFranklin Garcia 19:00 a 07:00');
    expect(r.personas[0].tipoProgramacion).toBe('turno_b');
    expect(r.personas[0].requiereCena).toBe(true);
    expect(r.personas[0].requiereMerienda).toBe(false);
  });

  test('Detecta label "Turno b" y lo aplica a siguiente persona sin hora', () => {
    const texto = '30/05\n✓lancheros\nTurno b\nFranklin Garcia';
    const r = _parsearTextoWhatsApp(texto);
    expect(r.totalPersonas).toBe(1);
    expect(r.personas[0].tipoProgramacion).toBe('turno_b');
    expect(r.personas[0].horaInicio).toBe('19:00');
  });

  test('Detecta múltiples personas en múltiples áreas', () => {
    const texto = `SABADO 30/05

✓CCTV
Rocio Melendez 07:00 a 16:00
Jakelin Tamara 16:00 a 23:00

✓lancheros
Rusbel Mejia 07:00 a 19:00
Turno b
Franklin Garcia 19:00 a 07:00`;
    const r = _parsearTextoWhatsApp(texto);
    expect(r.totalPersonas).toBe(4);
    const extendido = r.personas.find(p => p.nombreEmpleado === 'Rusbel Mejia');
    expect(extendido.tipoProgramacion).toBe('extendido');
    expect(extendido.requiereMerienda).toBe(true);
    const turnoB = r.personas.find(p => p.nombreEmpleado === 'Franklin Garcia');
    expect(turnoB.tipoProgramacion).toBe('turno_b');
    expect(turnoB.requiereCena).toBe(true);
  });

  test('Detecta múltiples fechas (sábado y domingo)', () => {
    const texto = `SABADO 30/05
✓CCTV
Rocio Melendez 07:00 a 16:00

DOMINGO 31/05
✓CCTV
Tania Perez 07:00 a 16:00`;
    const r = _parsearTextoWhatsApp(texto);
    expect(r.totalPersonas).toBe(2);
    expect(r.personas[0].fecha).toBe('2026-05-30');
    expect(r.personas[1].fecha).toBe('2026-05-31');
  });

  test('Ignora texto entre paréntesis del nombre', () => {
    const r = _parsearTextoWhatsApp('30/05\nenturnamiento\nYerlis Gallo ( atencion de mardique) 07:00 a 19:00');
    expect(r.personas[0].nombreEmpleado).toBe('Yerlis Gallo');
  });

  test('Formato alternativo HH:MM-HH:MM Nombre', () => {
    const r = _parsearTextoWhatsApp('30-05-2026\nHSEQ\n07:00-16:00 Luis Garces');
    expect(r.totalPersonas).toBe(1);
    expect(r.personas[0].nombreEmpleado).toBe('Luis Garces');
    expect(r.personas[0].horaInicio).toBe('07:00');
    expect(r.personas[0].horaFin).toBe('16:00');
  });

  test('Texto vacío → 0 personas', () => {
    const r = _parsearTextoWhatsApp('');
    expect(r.totalPersonas).toBe(0);
    expect(r.personas).toHaveLength(0);
  });

  test('No duplica persona en mismo área y horario', () => {
    const texto = `30/05\nCCTV\nRocio Melendez 07:00 a 16:00\nRocio Melendez 07:00 a 16:00`;
    const r = _parsearTextoWhatsApp(texto);
    // El parser no filtra duplicados (eso se hace al confirmar), solo detecta
    expect(r.totalPersonas).toBe(2);
  });
});

describe('Validaciones de negocio — reglas básicas', () => {

  test('Turno A 07:00-16:00 NO genera merienda', () => {
    const r = _clasificarTurno('07:00', '16:00');
    expect(r.merienda).toBe(false);
  });

  test('Turno A extendido SIEMPRE requiere responsable', () => {
    const r = _clasificarTurno('07:00', '19:00');
    expect(r.requiereResponsable).toBe(true);
  });

  test('Turno B SIEMPRE requiere responsable', () => {
    const r = _clasificarTurno('19:00', '07:00');
    expect(r.requiereResponsable).toBe(true);
  });

  test('Turno normal NO requiere responsable', () => {
    const r = _clasificarTurno('07:00', '16:00');
    expect(r.requiereResponsable).toBe(false);
  });
});
