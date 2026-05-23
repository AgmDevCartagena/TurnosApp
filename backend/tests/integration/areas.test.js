/**
 * Tests de integración — CRUD de Áreas
 * Valida multitenancy, CRUD completo y seguridad.
 */

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_TEST_URI || 'mongodb://localhost:27018/turnos_app_test';

const mongoose = require('mongoose');
const request = require('supertest');

let app, Empresa, Usuario, Area;

beforeAll(async () => {
  app = require('../../server');
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
    });
  }
  Empresa = require('../../models/Empresa');
  Usuario = require('../../models/Usuario');
  Area    = require('../../models/Area');

  const cols = mongoose.connection.collections;
  for (const k in cols) await cols[k].deleteMany({});
});

afterAll(async () => {
  const cols = mongoose.connection.collections;
  for (const k in cols) await cols[k].deleteMany({});
  await mongoose.disconnect();
});

// ── Fixtures ─────────────────────────────────────────────────────────────────
let empresaA, empresaB, adminA, adminB, superAdmin;
let agentA, agentB, agentSuper;

describe('Setup', () => {
  test('crear empresas y usuarios', async () => {
    empresaA = await Empresa.create({ nombre: 'EmpresaA Test', estado: 'activa', modulosHabilitados: ['turnos'] });
    empresaB = await Empresa.create({ nombre: 'EmpresaB Test', estado: 'activa', modulosHabilitados: ['turnos'] });

    adminA = await Usuario.create({
      username: 'area_admin_a', password: 'pass123', nombre: 'Admin A',
      rol: 'admin', empresaId: empresaA._id, activo: true
    });
    adminB = await Usuario.create({
      username: 'area_admin_b', password: 'pass123', nombre: 'Admin B',
      rol: 'admin', empresaId: empresaB._id, activo: true
    });
    superAdmin = await Usuario.create({
      username: 'area_super', password: 'pass123', nombre: 'Super',
      rol: 'super_admin', empresaId: null, activo: true
    });

    agentA     = request.agent(app);
    agentB     = request.agent(app);
    agentSuper = request.agent(app);

    await agentA.post('/api/auth/login').send({ username: 'area_admin_a', password: 'pass123' });
    await agentB.post('/api/auth/login').send({ username: 'area_admin_b', password: 'pass123' });
    await agentSuper.post('/api/auth/login').send({ username: 'area_super', password: 'pass123' });

    expect(empresaA._id).toBeDefined();
    expect(adminA._id).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/areas — crear área', () => {
  test('admin crea área en su empresa', async () => {
    const res = await agentA.post('/api/areas').send({ nombre: 'Operaciones' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.area.nombre).toBe('OPERACIONES');
    expect(res.body.area.empresaId).toBe(empresaA._id.toString());
  });

  test('rechaza área sin nombre', async () => {
    const res = await agentA.post('/api/areas').send({ nombre: '' });
    expect(res.status).toBe(400);
  });

  test('rechaza nombre duplicado activo en la misma empresa', async () => {
    await agentA.post('/api/areas').send({ nombre: 'Conductores' });
    const res = await agentA.post('/api/areas').send({ nombre: 'CONDUCTORES' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ya existe/i);
  });

  test('permite mismo nombre en otra empresa', async () => {
    const res = await agentB.post('/api/areas').send({ nombre: 'Conductores' });
    expect(res.status).toBe(201);
    expect(res.body.area.empresaId).toBe(empresaB._id.toString());
  });

  test('rechaza usuario no autenticado', async () => {
    const res = await request(app).post('/api/areas').send({ nombre: 'Test' });
    expect(res.status).toBe(401);
  });

  test('super_admin puede crear área especificando empresaId', async () => {
    const res = await agentSuper.post('/api/areas').send({
      nombre: 'Control Global',
      empresaId: empresaA._id.toString()
    });
    expect(res.status).toBe(201);
    expect(res.body.area.empresaId).toBe(empresaA._id.toString());
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/areas — listar áreas', () => {
  test('admin A solo ve áreas de su empresa', async () => {
    const res = await agentA.get('/api/areas');
    expect(res.status).toBe(200);
    expect(res.body.areas.every(a => a.empresaId === empresaA._id.toString())).toBe(true);
    expect(res.body.areas.find(a => a.empresaId === empresaB._id.toString())).toBeUndefined();
  });

  test('admin B solo ve áreas de su empresa', async () => {
    const res = await agentB.get('/api/areas');
    expect(res.status).toBe(200);
    expect(res.body.areas.every(a => a.empresaId === empresaB._id.toString())).toBe(true);
  });

  test('super_admin puede filtrar por empresaId', async () => {
    const res = await agentSuper.get(`/api/areas?empresaId=${empresaA._id}`);
    expect(res.status).toBe(200);
    expect(res.body.areas.every(a => a.empresaId === empresaA._id.toString())).toBe(true);
  });

  test('filtra por estado=activa', async () => {
    // inactivar una área primero
    const created = await agentA.post('/api/areas').send({ nombre: 'Area Para Inactivar' });
    await agentA.patch(`/api/areas/${created.body.area._id}/estado`).send({ estado: 'inactiva' });

    const res = await agentA.get('/api/areas?estado=activa');
    expect(res.body.areas.every(a => a.estado === 'activa')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('PUT /api/areas/:id — editar área', () => {
  let areaA;

  beforeAll(async () => {
    const r = await agentA.post('/api/areas').send({ nombre: 'Area Editable', descripcion: 'Antes' });
    areaA = r.body.area;
  });

  test('admin edita nombre y descripción de su propia área', async () => {
    const res = await agentA.put(`/api/areas/${areaA._id}`).send({ descripcion: 'Actualizada' });
    expect(res.status).toBe(200);
    expect(res.body.area.descripcion).toBe('Actualizada');
  });

  test('admin B no puede editar área de empresa A', async () => {
    const res = await agentB.put(`/api/areas/${areaA._id}`).send({ descripcion: 'Hack' });
    expect(res.status).toBe(403);
  });

  test('rechaza nombre vacío en edición', async () => {
    const res = await agentA.put(`/api/areas/${areaA._id}`).send({ nombre: '' });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('PATCH /api/areas/:id/estado — activar/inactivar', () => {
  let areaTest;

  beforeAll(async () => {
    const r = await agentA.post('/api/areas').send({ nombre: 'Area Toggle' });
    areaTest = r.body.area;
  });

  test('inactiva un área', async () => {
    const res = await agentA.patch(`/api/areas/${areaTest._id}/estado`).send({ estado: 'inactiva' });
    expect(res.status).toBe(200);
    expect(res.body.area.estado).toBe('inactiva');
  });

  test('reactiva un área', async () => {
    const res = await agentA.patch(`/api/areas/${areaTest._id}/estado`).send({ estado: 'activa' });
    expect(res.status).toBe(200);
    expect(res.body.area.estado).toBe('activa');
  });

  test('admin B no puede cambiar estado de área de empresa A', async () => {
    const res = await agentB.patch(`/api/areas/${areaTest._id}/estado`).send({ estado: 'inactiva' });
    expect(res.status).toBe(403);
  });

  test('rechaza estado inválido', async () => {
    const res = await agentA.patch(`/api/areas/${areaTest._id}/estado`).send({ estado: 'suspendida' });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('DELETE /api/areas/:id — eliminar área', () => {
  test('elimina área sin dependencias', async () => {
    const r = await agentA.post('/api/areas').send({ nombre: 'Area Eliminable' });
    const res = await agentA.delete(`/api/areas/${r.body.area._id}`);
    expect(res.status).toBe(200);
  });

  test('bloquea eliminación si tiene usuarios asignados', async () => {
    const r = await agentA.post('/api/areas').send({ nombre: 'Area Con Usuarios' });
    const areaConUsuario = r.body.area;

    await Usuario.create({
      username: 'user_con_area', password: 'pass123', nombre: 'User Area',
      rol: 'usuario', empresaId: empresaA._id, activo: true,
      areasPermitidas: ['AREA CON USUARIOS']
    });

    const res = await agentA.delete(`/api/areas/${areaConUsuario._id}`);
    expect(res.status).toBe(409);
    expect(res.body.dependencias.usuarios).toBeGreaterThan(0);
  });

  test('admin B no puede eliminar área de empresa A', async () => {
    const r = await agentA.post('/api/areas').send({ nombre: 'Area Solo A' });
    const res = await agentB.delete(`/api/areas/${r.body.area._id}`);
    expect(res.status).toBe(403);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('Aislamiento multiempresa — áreas en usuarios', () => {
  test('crear usuario con áreas reales de su empresa', async () => {
    const ra = await agentA.post('/api/areas').send({ nombre: 'Mantenimiento' });
    const areaName = ra.body.area.nombre;

    const res = await agentA.post('/api/auth/usuarios').send({
      username: 'user_mant_test', password: 'pass123', nombre: 'User Mant',
      rol: 'usuario', areasPermitidas: [areaName]
    });
    expect(res.status).toBe(201);
  });

  test('área de empresa A no aparece en listado de empresa B', async () => {
    await agentA.post('/api/areas').send({ nombre: 'Area Exclusiva Empresa A' });
    const res = await agentB.get('/api/areas');
    const nombres = res.body.areas.map(a => a.nombre);
    expect(nombres).not.toContain('AREA EXCLUSIVA EMPRESA A');
  });
});
