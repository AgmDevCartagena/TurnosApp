/**
 * Tests de integración — Módulo de Nómina Dinámica
 * Valida multiempresa, seguridad, cálculo real y persistencia.
 * Requiere MongoDB en MONGO_TEST_URI (por defecto: localhost:27018)
 */

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_TEST_URI || 'mongodb://localhost:27018/turnos_app_test';

const mongoose = require('mongoose');
const request  = require('supertest');
const dayjs    = require('dayjs');

let app, Empresa, Usuario, Empleado, Area, ParametroNomina, ConceptoNomina, LiquidacionNomina, Turno;

beforeAll(async () => {
  app = require('../../server');
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
    });
  }
  Empresa          = require('../../models/Empresa');
  Usuario          = require('../../models/Usuario');
  Empleado         = require('../../models/Empleado');
  Area             = require('../../models/Area');
  ParametroNomina  = require('../../models/ParametroNomina');
  ConceptoNomina   = require('../../models/ConceptoNomina');
  LiquidacionNomina = require('../../models/LiquidacionNomina');
  Turno            = require('../../models/Turno');

  const cols = mongoose.connection.collections;
  for (const k in cols) await cols[k].deleteMany({});
});

afterAll(async () => {
  const cols = mongoose.connection.collections;
  for (const k in cols) await cols[k].deleteMany({});
  await mongoose.disconnect();
});

// ── Fixtures ──────────────────────────────────────────────────────────────────
let empresaA, empresaB;
let adminA, adminB, gestorA;
let empleadoA1, empleadoB1;
let areaA, areaB;
let agentA, agentB, agentGestorA;

const FECHA_INICIO = '2025-01-02';
const FECHA_FIN    = '2025-01-15';
const VIGENCIA     = new Date('2025-01-01');

async function crearParametros(empresaId) {
  const params = [
    { codigo: 'SMLV',                        valor: 1750905,  tipoValor: 'valor_fijo' },
    { codigo: 'AUX_TRANSPORTE',              valor: 249095,   tipoValor: 'valor_fijo' },
    { codigo: 'PORCENTAJE_SALUD_EMPLEADO',   valor: 0.04,     tipoValor: 'porcentaje' },
    { codigo: 'PORCENTAJE_PENSION_EMPLEADO', valor: 0.04,     tipoValor: 'porcentaje' },
    { codigo: 'RECARGO_NOCTURNO',            valor: 0.35,     tipoValor: 'porcentaje' },
    { codigo: 'RECARGO_DOMINICAL_FESTIVO',   valor: 0.80,     tipoValor: 'porcentaje' },
    { codigo: 'HE_DIURNA',                   valor: 0.25,     tipoValor: 'porcentaje' },
    { codigo: 'HE_NOCTURNA',                 valor: 0.75,     tipoValor: 'porcentaje' },
    { codigo: 'HORAS_MES',                   valor: 220,      tipoValor: 'horas'      }
  ];
  return ParametroNomina.insertMany(
    params.map(p => ({ ...p, empresaId, vigenciaDesde: VIGENCIA, estado: 'activo', nombre: p.codigo }))
  );
}

async function crearConceptos(empresaId) {
  return ConceptoNomina.insertMany([
    { empresaId, codigo: 'SALARIO_BASE',      nombre: 'Salario Base',          tipo: 'devengado',  afectaTotal: true, orden: 1,  vigenciaDesde: VIGENCIA },
    { empresaId, codigo: 'AUX_TRANSPORTE',    nombre: 'Auxilio de Transporte', tipo: 'devengado',  afectaTotal: true, orden: 2,  vigenciaDesde: VIGENCIA },
    { empresaId, codigo: 'RECARGO_NOCTURNO',  nombre: 'Recargo Nocturno',      tipo: 'devengado',  afectaTotal: true, orden: 3,  vigenciaDesde: VIGENCIA, referenciaParametro: 'RECARGO_NOCTURNO' },
    { empresaId, codigo: 'RECARGO_DOMINICAL', nombre: 'Recargo Dominical',     tipo: 'devengado',  afectaTotal: true, orden: 4,  vigenciaDesde: VIGENCIA, referenciaParametro: 'RECARGO_DOMINICAL_FESTIVO' },
    { empresaId, codigo: 'DEDUCCION_SALUD',   nombre: 'Deducción Salud 4%',    tipo: 'deduccion',  afectaTotal: true, orden: 10, vigenciaDesde: VIGENCIA, referenciaParametro: 'PORCENTAJE_SALUD_EMPLEADO',   base: 'salarioBase' },
    { empresaId, codigo: 'DEDUCCION_PENSION', nombre: 'Deducción Pensión 4%',  tipo: 'deduccion',  afectaTotal: true, orden: 11, vigenciaDesde: VIGENCIA, referenciaParametro: 'PORCENTAJE_PENSION_EMPLEADO', base: 'salarioBase' }
  ]);
}

// ── Setup ─────────────────────────────────────────────────────────────────────
describe('Setup de datos', () => {
  test('crear empresas, áreas, usuarios, empleados, parámetros y conceptos', async () => {
    empresaA = await Empresa.create({ nombre: 'NominaTest Empresa A', estado: 'activa', modulosHabilitados: ['nomina', 'turnos'] });
    empresaB = await Empresa.create({ nombre: 'NominaTest Empresa B', estado: 'activa', modulosHabilitados: ['nomina', 'turnos'] });

    areaA = await Area.create({ empresaId: empresaA._id, nombre: 'OPERACIONES A', codigo: 'OPA', estado: 'activa' });
    areaB = await Area.create({ empresaId: empresaB._id, nombre: 'OPERACIONES B', codigo: 'OPB', estado: 'activa' });

    adminA = await Usuario.create({
      username: 'nom_admin_a', password: 'pass123', nombre: 'Admin Nomina A',
      rol: 'admin', empresaId: empresaA._id, activo: true, modulosPermitidos: ['nomina', 'turnos']
    });
    adminB = await Usuario.create({
      username: 'nom_admin_b', password: 'pass123', nombre: 'Admin Nomina B',
      rol: 'admin', empresaId: empresaB._id, activo: true, modulosPermitidos: ['nomina', 'turnos']
    });
    gestorA = await Usuario.create({
      username: 'nom_gestor_a', password: 'pass123', nombre: 'Gestor Nomina A',
      rol: 'gestor_nomina', empresaId: empresaA._id, activo: true, modulosPermitidos: ['nomina']
    });

    empleadoA1 = await Empleado.create({
      empresaId: empresaA._id, nombre: 'Carlos', apellidos: 'Rojas',
      documento: '11111111', cargo: 'Operario', area: 'OPERACIONES A',
      areaId: areaA._id, salario: 2100000, estado: 'activo', tipoContrato: 'indefinido'
    });
    empleadoB1 = await Empleado.create({
      empresaId: empresaB._id, nombre: 'Diana', apellidos: 'Torres',
      documento: '22222222', cargo: 'Operaria', area: 'OPERACIONES B',
      areaId: areaB._id, salario: 1900000, estado: 'activo', tipoContrato: 'indefinido'
    });

    await crearParametros(empresaA._id);
    await crearParametros(empresaB._id);
    await crearConceptos(empresaA._id);
    await crearConceptos(empresaB._id);

    // Crear turno para empleadoA1
    const cronograma = [];
    let d = dayjs(FECHA_INICIO);
    const fin = dayjs(FECHA_FIN);
    while (!d.isAfter(fin)) {
      cronograma.push({
        fecha: d.format('YYYY-MM-DD'),
        turno: 'MAÑANA',
        entrada: '06:00',
        salida: '14:00',
        esDescanso: d.day() === 0,
        esDomingo: d.day() === 0,
        esFestivo: false
      });
      d = d.add(1, 'day');
    }
    await Turno.create({
      empresaId: empresaA._id,
      documentoEmpleado: '11111111',
      nombreEmpleado: 'Carlos Rojas',
      area: 'OPERACIONES A',
      cronogramaDetallado: cronograma,
      fechaInicio: FECHA_INICIO,
      fechaFin: FECHA_FIN
    });

    expect(empresaA._id).toBeDefined();
    expect(empleadoA1._id).toBeDefined();
  });

  // Crear sesiones de supertest
  test('iniciar sesión empresa A admin', async () => {
    agentA = request.agent(app);
    const res = await agentA.post('/api/auth/login').send({ username: 'nom_admin_a', password: 'pass123' });
    expect(res.status).toBe(200);
    expect(res.body.autenticado).toBe(true);
  });

  test('iniciar sesión empresa B admin', async () => {
    agentB = request.agent(app);
    const res = await agentB.post('/api/auth/login').send({ username: 'nom_admin_b', password: 'pass123' });
    expect(res.status).toBe(200);
  });

  test('iniciar sesión gestor nómina empresa A', async () => {
    agentGestorA = request.agent(app);
    const res = await agentGestorA.post('/api/auth/login').send({ username: 'nom_gestor_a', password: 'pass123' });
    expect(res.status).toBe(200);
  });
});

// ── Parámetros de Nómina ──────────────────────────────────────────────────────
describe('GET /api/nomina/parametros', () => {
  test('admin empresa A obtiene sus parámetros', async () => {
    const res = await agentA.get('/api/nomina/parametros');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.parametros)).toBe(true);
    expect(res.body.parametros.length).toBeGreaterThan(0);
  });

  test('no incluye parámetros de empresa B', async () => {
    const resA = await agentA.get('/api/nomina/parametros');
    const resB = await agentB.get('/api/nomina/parametros');
    const idsA = resA.body.parametros.map(p => p._id);
    const idsB = resB.body.parametros.map(p => p._id);
    const interseccion = idsA.filter(id => idsB.includes(id));
    expect(interseccion.length).toBe(0);
  });

  test('usuario no autenticado recibe 401', async () => {
    const res = await request(app).get('/api/nomina/parametros');
    expect([401, 302]).toContain(res.status);
  });
});

// ── Conceptos de Nómina ───────────────────────────────────────────────────────
describe('GET /api/nomina/conceptos', () => {
  test('admin empresa A obtiene sus conceptos', async () => {
    const res = await agentA.get('/api/nomina/conceptos');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.conceptos)).toBe(true);
  });

  test('conceptos empresa A ≠ conceptos empresa B', async () => {
    const resA = await agentA.get('/api/nomina/conceptos');
    const resB = await agentB.get('/api/nomina/conceptos');
    const idsA = resA.body.conceptos.map(c => c._id);
    const idsB = resB.body.conceptos.map(c => c._id);
    expect(idsA.filter(id => idsB.includes(id)).length).toBe(0);
  });
});

// ── Cálculo individual ────────────────────────────────────────────────────────
describe('POST /api/nomina/calcular-individual', () => {
  test('calcula nómina de empleado propio con resultado válido', async () => {
    const res = await agentA.post('/api/nomina/calcular-individual').send({
      documentoEmpleado: '11111111',
      fechaInicio: FECHA_INICIO,
      fechaFin: FECHA_FIN
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.liquidacion).toBeDefined();
    expect(res.body.liquidacion.totalDevengado).toBeGreaterThan(0);
    expect(res.body.liquidacion.netoPagar).toBeGreaterThan(0);
    expect(res.body.liquidacion.totalDeducciones).toBeGreaterThan(0);
    expect(Array.isArray(res.body.liquidacion.detalles)).toBe(true);
  });

  test('neto = devengado - deducciones', async () => {
    const res = await agentA.post('/api/nomina/calcular-individual').send({
      documentoEmpleado: '11111111', fechaInicio: FECHA_INICIO, fechaFin: FECHA_FIN
    });
    const { totalDevengado, totalDeducciones, netoPagar } = res.body.liquidacion;
    expect(Math.abs(netoPagar - (totalDevengado - totalDeducciones))).toBeLessThan(1);
  });

  test('empresa A NO puede calcular nómina de empleado de empresa B', async () => {
    const res = await agentA.post('/api/nomina/calcular-individual').send({
      documentoEmpleado: '22222222',
      fechaInicio: FECHA_INICIO,
      fechaFin: FECHA_FIN
    });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('rechaza empleado inexistente', async () => {
    const res = await agentA.post('/api/nomina/calcular-individual').send({
      documentoEmpleado: '00000000', fechaInicio: FECHA_INICIO, fechaFin: FECHA_FIN
    });
    expect(res.status).toBe(404);
  });

  test('rechaza fecha inicio > fecha fin', async () => {
    const res = await agentA.post('/api/nomina/calcular-individual').send({
      documentoEmpleado: '11111111', fechaInicio: '2025-01-31', fechaFin: '2025-01-01'
    });
    expect(res.status).toBe(400);
  });

  test('rechaza sin documento', async () => {
    const res = await agentA.post('/api/nomina/calcular-individual').send({
      fechaInicio: FECHA_INICIO, fechaFin: FECHA_FIN
    });
    expect(res.status).toBe(400);
  });

  test('usuario no autenticado recibe 401', async () => {
    const res = await request(app).post('/api/nomina/calcular-individual').send({
      documentoEmpleado: '11111111', fechaInicio: FECHA_INICIO, fechaFin: FECHA_FIN
    });
    expect([401, 302]).toContain(res.status);
  });
});

// ── Cálculo por área ──────────────────────────────────────────────────────────
describe('POST /api/nomina/calcular-por-area', () => {
  test('calcula nómina de área propia con resultado válido', async () => {
    const res = await agentA.post('/api/nomina/calcular-por-area').send({
      areaId: areaA._id.toString(),
      fechaInicio: FECHA_INICIO,
      fechaFin: FECHA_FIN
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.resultados)).toBe(true);
  });

  test('empresa A NO puede usar areaId de empresa B', async () => {
    const res = await agentA.post('/api/nomina/calcular-por-area').send({
      areaId: areaB._id.toString(),
      fechaInicio: FECHA_INICIO,
      fechaFin: FECHA_FIN
    });
    expect([403, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

// ── Liquidaciones ─────────────────────────────────────────────────────────────
describe('GET /api/nomina/liquidaciones', () => {
  test('lista liquidaciones de empresa A', async () => {
    const res = await agentA.get('/api/nomina/liquidaciones');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.liquidaciones)).toBe(true);
  });

  test('empresa A no ve liquidaciones de empresa B', async () => {
    const resA = await agentA.get('/api/nomina/liquidaciones');
    const resB = await agentB.get('/api/nomina/liquidaciones');
    if (resA.body.liquidaciones.length > 0) {
      const empIdsA = resA.body.liquidaciones.map(l => l.empresaId?.toString());
      const empIdB  = empresaB._id.toString();
      expect(empIdsA.includes(empIdB)).toBe(false);
    }
    expect(resB.status).toBe(200);
  });
});
