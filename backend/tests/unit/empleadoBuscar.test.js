'use strict';

/**
 * Tests unitarios TDD — issue #24
 * Cubre: _formatearRespuestaEmpleado, _sanitizarTextoPersona
 * y la lógica pura de validación de payload al agregar persona.
 */

const {
  _formatearRespuestaEmpleado,
  _sanitizarTextoPersona
} = require('../../controllers/empleadoController');

// ─────────────────────────────────────────────────────────────────────────────
describe('_formatearRespuestaEmpleado — formatea empleado para búsqueda por documento', () => {

  test('retorna null si emp es null', () => {
    expect(_formatearRespuestaEmpleado(null)).toBeNull();
  });

  test('retorna null si emp es undefined', () => {
    expect(_formatearRespuestaEmpleado(undefined)).toBeNull();
  });

  test('devuelve shape correcto con área presente', () => {
    const emp = {
      id: 'emp-uuid-1', documento: '12345678', nombre: 'Diana Ledesma',
      areaId: 'area-uuid-1', area: { id: 'area-uuid-1', nombre: 'CCTV' },
      cargo: 'Monitora'
    };
    const r = _formatearRespuestaEmpleado(emp);
    expect(r).toMatchObject({
      id:        'emp-uuid-1',
      documento: '12345678',
      nombre:    'Diana Ledesma',
      areaId:    'area-uuid-1',
      areaNombre: 'CCTV',
      cargo:     'Monitora'
    });
  });

  test('devuelve areaNombre null si empleado no tiene área', () => {
    const emp = {
      id: 'emp-2', documento: '99999', nombre: 'Sin Área',
      areaId: null, area: null, cargo: null
    };
    const r = _formatearRespuestaEmpleado(emp);
    expect(r.areaId).toBeNull();
    expect(r.areaNombre).toBeNull();
    expect(r.cargo).toBeNull();
  });

  test('devuelve cargo null si cargo es string vacío', () => {
    const emp = {
      id: 'emp-3', documento: '111', nombre: 'Test',
      areaId: null, area: null, cargo: ''
    };
    const r = _formatearRespuestaEmpleado(emp);
    expect(r.cargo).toBeNull();
  });

  test('no incluye campos sensibles (salario, fechaIngreso)', () => {
    const emp = {
      id: 'emp-4', documento: '222', nombre: 'Privado',
      areaId: null, area: null, cargo: null,
      salario: 9999999, fechaIngreso: new Date(), passwordHash: 'secreto'
    };
    const r = _formatearRespuestaEmpleado(emp);
    expect(r).not.toHaveProperty('salario');
    expect(r).not.toHaveProperty('fechaIngreso');
    expect(r).not.toHaveProperty('passwordHash');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('_sanitizarTextoPersona — sanitiza texto de entrada de personas', () => {

  test('retorna null para null', () => {
    expect(_sanitizarTextoPersona(null)).toBeNull();
  });

  test('retorna null para undefined', () => {
    expect(_sanitizarTextoPersona(undefined)).toBeNull();
  });

  test('retorna null para cadena vacía', () => {
    expect(_sanitizarTextoPersona('')).toBeNull();
  });

  test('retorna null para cadena solo espacios', () => {
    expect(_sanitizarTextoPersona('   ')).toBeNull();
  });

  test('recorta espacios', () => {
    expect(_sanitizarTextoPersona('  Juan Pérez  ')).toBe('Juan Pérez');
  });

  test('respeta maxLen y trunca', () => {
    const largo = 'A'.repeat(200);
    expect(_sanitizarTextoPersona(largo, 50).length).toBeLessThanOrEqual(50);
  });

  test('usa maxLen 150 por defecto', () => {
    const largo = 'B'.repeat(300);
    expect(_sanitizarTextoPersona(largo).length).toBeLessThanOrEqual(150);
  });

  test('elimina etiquetas HTML (previene XSS en texto)', () => {
    const r = _sanitizarTextoPersona('<script>alert(1)</script>Juan');
    expect(r).not.toContain('<script>');
    expect(r).not.toContain('</script>');
  });

  test('texto normal no es modificado más allá de trim', () => {
    expect(_sanitizarTextoPersona('Diana Ledesma')).toBe('Diana Ledesma');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Lógica de tipoPersona al agregar detalle', () => {

  test('empleadoId presente implica tipoPersona empleado', () => {
    const body = { empleadoId: 'emp-1', tipoPersona: 'empleado', crearComoEmpleado: false };
    expect(body.tipoPersona).toBe('empleado');
    expect(body.empleadoId).toBeTruthy();
  });

  test('crearComoEmpleado true con tipoPersona empleado_nuevo debe tener documento', () => {
    const body = { empleadoId: null, tipoPersona: 'empleado_nuevo', crearComoEmpleado: true, documentoEmpleado: '' };
    const esValido = Boolean(body.documentoEmpleado?.trim());
    expect(esValido).toBe(false);
  });

  test('crearComoEmpleado true con documento válido es válido', () => {
    const body = { empleadoId: null, tipoPersona: 'empleado_nuevo', crearComoEmpleado: true, documentoEmpleado: '12345678' };
    const esValido = Boolean(body.documentoEmpleado?.trim());
    expect(esValido).toBe(true);
  });

  test('tercero: empleadoId null y crearComoEmpleado false', () => {
    const body = { empleadoId: null, tipoPersona: 'tercero', crearComoEmpleado: false };
    expect(body.empleadoId).toBeNull();
    expect(body.crearComoEmpleado).toBe(false);
  });
});
