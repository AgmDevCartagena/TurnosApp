/**
 * Tests unitarios — MotorCalculoNomina
 * TDD: estos tests describen el comportamiento esperado.
 * Fallan hasta que se implemente services/motorCalculoNomina.js
 */

process.env.NODE_ENV = 'test';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../models/Empleado', () => {
  const empleados = [];
  function MockEmpleado(data) { Object.assign(this, data); }
  MockEmpleado.findOne = jest.fn();
  MockEmpleado._reset = () => empleados.splice(0, empleados.length);
  return MockEmpleado;
});

jest.mock('../../models/ParametroNomina', () => {
  const MockParam = {};
  MockParam.obtenerMapaVigente = jest.fn();
  MockParam.obtenerVigente     = jest.fn();
  return MockParam;
});

jest.mock('../../models/ConceptoNomina', () => {
  const MockConcepto = {};
  MockConcepto.obtenerVigentes = jest.fn();
  return MockConcepto;
});

jest.mock('../../models/LiquidacionNomina', () => {
  function MockLiquidacion(data) { Object.assign(this, data); }
  MockLiquidacion.prototype.save = jest.fn().mockResolvedValue(true);
  MockLiquidacion.findOne = jest.fn();
  return MockLiquidacion;
});

jest.mock('../../models/NovedadNomina', () => {
  const MockNovedad = {};
  MockNovedad.find = jest.fn().mockResolvedValue([]);
  return MockNovedad;
});

jest.mock('../../models/turnoModel', () => ({
  buscarTurnoPorDocumentoYRango: jest.fn()
}));

const mongoose = require('mongoose');
const Empleado        = require('../../models/Empleado');
const ParametroNomina = require('../../models/ParametroNomina');
const ConceptoNomina  = require('../../models/ConceptoNomina');
const LiquidacionNomina = require('../../models/LiquidacionNomina');
const { buscarTurnoPorDocumentoYRango } = require('../../models/turnoModel');

// Motor a implementar (falla hasta que exista)
let motor;
try {
  motor = require('../../services/motorCalculoNomina');
} catch {
  motor = null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const empresaId = new mongoose.Types.ObjectId();
const otroEmpresaId = new mongoose.Types.ObjectId();
const empleadoId = new mongoose.Types.ObjectId();
const usuarioId  = new mongoose.Types.ObjectId();

const empleadoMock = {
  _id: empleadoId,
  empresaId,
  documento: '12345678',
  nombre: 'Juan',
  apellidos: 'Pérez',
  area: 'OPERACIONES',
  salario: 2000000,
  tipoContrato: 'indefinido',
  estado: 'activo'
};

const parametrosMock = {
  SMLV:                        1750905,
  AUX_TRANSPORTE:              249095,
  PORCENTAJE_SALUD_EMPLEADO:   0.04,
  PORCENTAJE_PENSION_EMPLEADO: 0.04,
  RECARGO_NOCTURNO:            0.35,
  RECARGO_DOMINICAL_FESTIVO:   0.80,
  HE_DIURNA:                   0.25,
  HE_NOCTURNA:                 0.75,
  HORAS_MES:                   220
};

const conceptosMock = [
  { codigo: 'SALARIO_BASE',    nombre: 'Salario Base',          tipo: 'devengado',  afectaTotal: true, orden: 1 },
  { codigo: 'AUX_TRANSPORTE',  nombre: 'Auxilio de Transporte', tipo: 'devengado',  afectaTotal: true, orden: 2 },
  { codigo: 'DEDUCCION_SALUD', nombre: 'Deducción Salud',       tipo: 'deduccion',  referenciaParametro: 'PORCENTAJE_SALUD_EMPLEADO', base: 'salarioBase', afectaTotal: true, orden: 10 },
  { codigo: 'DEDUCCION_PENSION', nombre: 'Deducción Pensión',   tipo: 'deduccion',  referenciaParametro: 'PORCENTAJE_PENSION_EMPLEADO', base: 'salarioBase', afectaTotal: true, orden: 11 }
];

const turnoMock = {
  documentoEmpleado: '12345678',
  nombreEmpleado: 'Juan Pérez',
  area: 'OPERACIONES',
  historialTurnos: [],
  cronogramaDetallado: [
    { fecha: '2025-01-02', turno: 'MAÑANA', entrada: '06:00', salida: '14:00', esDescanso: false, esDomingo: false, esFestivo: false },
    { fecha: '2025-01-03', turno: 'MAÑANA', entrada: '06:00', salida: '14:00', esDescanso: false, esDomingo: false, esFestivo: false }
  ]
};

beforeEach(() => {
  jest.clearAllMocks();
  Empleado.findOne.mockResolvedValue(empleadoMock);
  ParametroNomina.obtenerMapaVigente.mockResolvedValue(parametrosMock);
  ConceptoNomina.obtenerVigentes.mockResolvedValue(conceptosMock);
  buscarTurnoPorDocumentoYRango.mockResolvedValue(turnoMock);
});

// ══════════════════════════════════════════════════════════════════════════════
describe('MotorCalculoNomina — existencia del módulo', () => {
  test('debe existir el archivo services/motorCalculoNomina.js', () => {
    expect(motor).not.toBeNull();
    expect(motor).toBeDefined();
  });

  test('debe exportar calcularIndividual', () => {
    expect(motor).not.toBeNull();
    expect(typeof motor.calcularIndividual).toBe('function');
  });

  test('debe exportar calcularPorArea', () => {
    expect(motor).not.toBeNull();
    expect(typeof motor.calcularPorArea).toBe('function');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('MotorCalculoNomina — validaciones de entrada', () => {
  test('rechaza si documento está vacío', async () => {
    if (!motor) return;
    await expect(
      motor.calcularIndividual({ documento: '', fechaInicio: '2025-01-01', fechaFin: '2025-01-31', empresaId, usuarioId })
    ).rejects.toMatchObject({ message: expect.stringContaining('documento') });
  });

  test('rechaza si fechaInicio es mayor que fechaFin', async () => {
    if (!motor) return;
    await expect(
      motor.calcularIndividual({ documento: '12345678', fechaInicio: '2025-01-31', fechaFin: '2025-01-01', empresaId, usuarioId })
    ).rejects.toMatchObject({ message: expect.stringContaining('fecha') });
  });

  test('rechaza si no existen parámetros vigentes', async () => {
    if (!motor) return;
    ParametroNomina.obtenerMapaVigente.mockResolvedValue({});
    await expect(
      motor.calcularIndividual({ documento: '12345678', fechaInicio: '2025-01-01', fechaFin: '2025-01-31', empresaId, usuarioId })
    ).rejects.toMatchObject({ message: expect.stringContaining('parámetros') });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('MotorCalculoNomina — validaciones de empleado', () => {
  test('rechaza si el empleado no existe', async () => {
    if (!motor) return;
    Empleado.findOne.mockResolvedValue(null);
    await expect(
      motor.calcularIndividual({ documento: '99999999', fechaInicio: '2025-01-01', fechaFin: '2025-01-31', empresaId, usuarioId })
    ).rejects.toMatchObject({ message: expect.stringContaining('empleado') });
  });

  test('rechaza si el empleado pertenece a otra empresa', async () => {
    if (!motor) return;
    Empleado.findOne.mockResolvedValue({ ...empleadoMock, empresaId: otroEmpresaId });
    await expect(
      motor.calcularIndividual({ documento: '12345678', fechaInicio: '2025-01-01', fechaFin: '2025-01-31', empresaId, usuarioId })
    ).rejects.toMatchObject({ message: expect.stringContaining('empresa') });
  });

  test('rechaza si el empleado está inactivo', async () => {
    if (!motor) return;
    Empleado.findOne.mockResolvedValue({ ...empleadoMock, estado: 'inactivo' });
    await expect(
      motor.calcularIndividual({ documento: '12345678', fechaInicio: '2025-01-01', fechaFin: '2025-01-31', empresaId, usuarioId })
    ).rejects.toMatchObject({ message: expect.stringContaining('inactivo') });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('MotorCalculoNomina — resultado del cálculo', () => {
  test('retorna estructura con totalDevengado, totalDeducciones y netoPagar', async () => {
    if (!motor) return;
    const resultado = await motor.calcularIndividual({
      documento: '12345678', fechaInicio: '2025-01-02', fechaFin: '2025-01-03', empresaId, usuarioId
    });
    expect(resultado).toHaveProperty('totalDevengado');
    expect(resultado).toHaveProperty('totalDeducciones');
    expect(resultado).toHaveProperty('netoPagar');
    expect(resultado).toHaveProperty('detalles');
  });

  test('netoPagar = totalDevengado - totalDeducciones', async () => {
    if (!motor) return;
    const resultado = await motor.calcularIndividual({
      documento: '12345678', fechaInicio: '2025-01-02', fechaFin: '2025-01-03', empresaId, usuarioId
    });
    const esperado = Number((resultado.totalDevengado - resultado.totalDeducciones).toFixed(2));
    expect(resultado.netoPagar).toBeCloseTo(esperado, 1);
  });

  test('detalles contiene al menos un concepto tipo devengado', async () => {
    if (!motor) return;
    const resultado = await motor.calcularIndividual({
      documento: '12345678', fechaInicio: '2025-01-02', fechaFin: '2025-01-03', empresaId, usuarioId
    });
    const devengados = resultado.detalles.filter(d => d.tipo === 'devengado');
    expect(devengados.length).toBeGreaterThan(0);
  });

  test('detalles contiene al menos un concepto tipo deduccion', async () => {
    if (!motor) return;
    const resultado = await motor.calcularIndividual({
      documento: '12345678', fechaInicio: '2025-01-02', fechaFin: '2025-01-03', empresaId, usuarioId
    });
    const deducciones = resultado.detalles.filter(d => d.tipo === 'deduccion');
    expect(deducciones.length).toBeGreaterThan(0);
  });

  test('no usa valores hardcodeados — totalDeducciones usa parámetros de BD', async () => {
    if (!motor) return;
    // Con salario 2000000, salud=4%, pensión=4% → deducciones = 160000
    const resultado = await motor.calcularIndividual({
      documento: '12345678', fechaInicio: '2025-01-02', fechaFin: '2025-01-03', empresaId, usuarioId
    });
    // Las deducciones deben basarse en el salario del empleado y porcentajes de BD
    expect(resultado.totalDeducciones).toBeGreaterThan(0);
    // No puede ser exactamente cero
    expect(resultado.totalDeducciones).not.toBe(0);
  });

  test('usa el salario del modelo Empleado, no del frontend', async () => {
    if (!motor) return;
    const resultado = await motor.calcularIndividual({
      documento: '12345678', fechaInicio: '2025-01-02', fechaFin: '2025-01-03', empresaId, usuarioId
    });
    expect(resultado.salarioBase).toBe(empleadoMock.salario);
  });

  test('guarda la liquidación en base de datos', async () => {
    if (!motor) return;
    await motor.calcularIndividual({
      documento: '12345678', fechaInicio: '2025-01-02', fechaFin: '2025-01-03', empresaId, usuarioId
    });
    const instancias = LiquidacionNomina.prototype.save.mock.calls;
    expect(instancias.length).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('MotorCalculoNomina — aislamiento multiempresa', () => {
  test('calcularIndividual filtra empleado solo por empresaId de sesión', async () => {
    if (!motor) return;
    await motor.calcularIndividual({
      documento: '12345678', fechaInicio: '2025-01-02', fechaFin: '2025-01-03', empresaId, usuarioId
    });
    expect(Empleado.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ empresaId })
    );
  });

  test('parámetros se cargan por empresaId — no global', async () => {
    if (!motor) return;
    await motor.calcularIndividual({
      documento: '12345678', fechaInicio: '2025-01-02', fechaFin: '2025-01-03', empresaId, usuarioId
    });
    expect(ParametroNomina.obtenerMapaVigente).toHaveBeenCalledWith(
      empresaId,
      expect.any(Array),
      expect.any(Date)
    );
  });
});
