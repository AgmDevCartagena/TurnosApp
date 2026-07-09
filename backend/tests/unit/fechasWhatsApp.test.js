/**
 * TDD — issue #27: Error fechas de salida mensaje en formato WhatsApp
 *
 * Tests escritos ANTES de implementar el fix.
 * Cubren:
 *   _parseFechaStr       — extracción UTC-segura de fecha desde Date/string
 *   _formatFechaConDia   — formato largo es-CO, sin desfase de zona horaria
 *   _formatFechaWhatsApp — formato MAYÚSCULAS sin coma para mensaje WhatsApp
 */
'use strict';

// ── Mock Prisma (no conexión real en tests unitarios) ─────────────────────────
jest.mock('../../lib/prisma', () => ({
  programacionTransporte: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  empresa: { findUnique: jest.fn() },
  $disconnect: jest.fn(),
}));
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue({}),
  connection: { readyState: 0, on: jest.fn(), once: jest.fn(), off: jest.fn(), collections: {} },
  model: jest.fn().mockReturnValue({ find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() }),
  Schema: function Schema() { return { plugin: jest.fn() }; },
  Types: { ObjectId: { isValid: () => true } },
}));

const {
  _formatFechaConDia,
  _formatFechaWhatsApp,
  _parseFechaStr,
} = require('../../controllers/transporteController');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — _parseFechaStr: extracción UTC-segura desde Date o string
// ─────────────────────────────────────────────────────────────────────────────
describe('_parseFechaStr — extracción UTC-segura de fecha', () => {

  test('extrae "2026-05-31" de Date UTC midnight 31 mayo', () => {
    expect(_parseFechaStr(new Date('2026-05-31T00:00:00.000Z'))).toBe('2026-05-31');
  });

  test('extrae "2026-05-30" de Date UTC midnight 30 mayo', () => {
    expect(_parseFechaStr(new Date('2026-05-30T00:00:00.000Z'))).toBe('2026-05-30');
  });

  test('extrae "2026-06-01" de Date UTC midnight 1 junio', () => {
    expect(_parseFechaStr(new Date('2026-06-01T00:00:00.000Z'))).toBe('2026-06-01');
  });

  test('Date UTC midnight 31 mayo NO debe extraer 1 de junio (regresión #27)', () => {
    const result = _parseFechaStr(new Date('2026-05-31T00:00:00.000Z'));
    expect(result).not.toBe('2026-06-01');
    expect(result).toBe('2026-05-31');
  });

  test('no pierde un día con UTC 05:00 (medianoche Colombia)', () => {
    // PostgreSQL DATE '2026-05-31' con TZ Colombia = 2026-05-31T05:00:00.000Z
    expect(_parseFechaStr(new Date('2026-05-31T05:00:00.000Z'))).toBe('2026-05-31');
  });

  test('extrae primeros 10 chars de string ISO', () => {
    expect(_parseFechaStr('2026-05-31T00:00:00.000Z')).toBe('2026-05-31');
  });

  test('extrae desde string simple YYYY-MM-DD', () => {
    expect(_parseFechaStr('2026-05-31')).toBe('2026-05-31');
  });

  test('null retorna null', () => {
    expect(_parseFechaStr(null)).toBeNull();
  });

  test('undefined retorna null', () => {
    expect(_parseFechaStr(undefined)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — _formatFechaConDia: sin desfase de zona horaria (regresión #27)
// ─────────────────────────────────────────────────────────────────────────────
describe('_formatFechaConDia — sin desfase de zona horaria', () => {

  // ── Fechas correctas ────────────────────────────────────────────────────────

  test('2026-05-31 contiene "domingo" — no debe mostrar lunes ni junio', () => {
    const r = _formatFechaConDia('2026-05-31');
    expect(r.toLowerCase()).toContain('domingo');
    expect(r.toLowerCase()).not.toContain('lunes');
    expect(r.toLowerCase()).not.toContain('junio');
  });

  test('2026-05-31 contiene día 31 — no debe mostrar 1', () => {
    const r = _formatFechaConDia('2026-05-31');
    expect(r).toMatch(/31/);
    expect(r).not.toMatch(/\b1\b/);
  });

  test('2026-05-30 contiene "sábado" y día 30', () => {
    const r = _formatFechaConDia('2026-05-30');
    expect(r.toLowerCase()).toMatch(/s[aá]bado/);
    expect(r).toContain('30');
  });

  test('2026-06-01 contiene "lunes" y "junio"', () => {
    const r = _formatFechaConDia('2026-06-01');
    expect(r.toLowerCase()).toContain('lunes');
    expect(r.toLowerCase()).toContain('junio');
  });

  test('2026-06-01 contiene día 1 — no contiene 31 ni mayo', () => {
    const r = _formatFechaConDia('2026-06-01');
    expect(r.toLowerCase()).not.toContain('mayo');
    expect(r).not.toContain('31');
  });

  test('2026-05-31 contiene "mayo" y año 2026', () => {
    const r = _formatFechaConDia('2026-05-31');
    expect(r.toLowerCase()).toContain('mayo');
    expect(r).toContain('2026');
  });

  // ── Manejo de casos especiales ──────────────────────────────────────────────

  test('null retorna string vacío', () => {
    expect(_formatFechaConDia(null)).toBe('');
  });

  test('undefined retorna string vacío', () => {
    expect(_formatFechaConDia(undefined)).toBe('');
  });

  test('string vacío retorna string vacío', () => {
    expect(_formatFechaConDia('')).toBe('');
  });

  test('mes inválido 13 retorna "Fecha no válida"', () => {
    expect(_formatFechaConDia('2026-13-01')).toBe('Fecha no válida');
  });

  test('primera letra capitalizada', () => {
    const r = _formatFechaConDia('2026-05-30');
    expect(r.length).toBeGreaterThan(0);
    expect(r.charAt(0)).toBe(r.charAt(0).toUpperCase());
  });

  // ── Regresión issue #27 explícita ──────────────────────────────────────────

  test('[REGRESIÓN #27] 31 mayo → NO debe producir "1 de junio"', () => {
    const r = _formatFechaConDia('2026-05-31');
    expect(r.toLowerCase()).not.toMatch(/1\s*de\s*junio/);
    expect(r.toLowerCase()).not.toMatch(/lunes/);
  });

  test('[REGRESIÓN #27] 30 mayo → NO debe producir "31 de mayo" ni junio', () => {
    const r = _formatFechaConDia('2026-05-30');
    expect(r.toLowerCase()).not.toContain('junio');
    expect(r).not.toMatch(/\b31\b/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — _formatFechaWhatsApp: formato MAYÚSCULAS para mensaje WhatsApp
// ─────────────────────────────────────────────────────────────────────────────
describe('_formatFechaWhatsApp — formato para mensaje WhatsApp', () => {

  test('2026-05-31 → contiene DOMINGO', () => {
    expect(_formatFechaWhatsApp('2026-05-31')).toContain('DOMINGO');
  });

  test('2026-05-31 → contiene 31', () => {
    expect(_formatFechaWhatsApp('2026-05-31')).toContain('31');
  });

  test('2026-05-31 → contiene MAYO', () => {
    expect(_formatFechaWhatsApp('2026-05-31')).toContain('MAYO');
  });

  test('2026-05-31 → contiene 2026', () => {
    expect(_formatFechaWhatsApp('2026-05-31')).toContain('2026');
  });

  test('2026-05-30 → contiene SÁBADO o SABADO (depende de ICU)', () => {
    const r = _formatFechaWhatsApp('2026-05-30');
    expect(r.includes('SÁBADO') || r.includes('SABADO')).toBe(true);
  });

  test('2026-06-01 → contiene LUNES', () => {
    expect(_formatFechaWhatsApp('2026-06-01')).toContain('LUNES');
  });

  test('2026-06-01 → contiene JUNIO', () => {
    expect(_formatFechaWhatsApp('2026-06-01')).toContain('JUNIO');
  });

  test('resultado está completamente en mayúsculas', () => {
    const r = _formatFechaWhatsApp('2026-05-31');
    expect(r).toBe(r.toUpperCase());
  });

  test('resultado NO contiene coma (formato WhatsApp sin puntuación de lista)', () => {
    expect(_formatFechaWhatsApp('2026-05-31')).not.toContain(',');
  });

  test('null retorna string vacío sin romper', () => {
    expect(_formatFechaWhatsApp(null)).toBe('');
  });

  test('undefined retorna string vacío sin romper', () => {
    expect(_formatFechaWhatsApp(undefined)).toBe('');
  });

  test('fecha inválida retorna "FECHA NO VÁLIDA"', () => {
    const r = _formatFechaWhatsApp('2026-13-01');
    expect(r.toUpperCase()).toContain('FECHA');
  });

  // ── Regresión issue #27 explícita ──────────────────────────────────────────

  test('[REGRESIÓN #27] 31 mayo → DOMINGO 31 DE MAYO, no LUNES 1 DE JUNIO', () => {
    const r = _formatFechaWhatsApp('2026-05-31');
    expect(r).toContain('DOMINGO');
    expect(r).toContain('31');
    expect(r).toContain('MAYO');
    expect(r).not.toContain('LUNES');
    expect(r).not.toContain('JUNIO');
    expect(r).not.toContain('1 DE JUNIO');
  });

  test('[REGRESIÓN #27] no debe existir texto de junio cuando la fecha es mayo', () => {
    const r = _formatFechaWhatsApp('2026-05-31');
    expect(r).not.toMatch(/LUNES/);
    expect(r).not.toMatch(/1\s*DE\s*JUNIO/);
  });
});
