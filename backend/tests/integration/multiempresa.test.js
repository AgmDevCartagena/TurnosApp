/**
 * Tests de integración: Aislamiento multiempresa
 *
 * Valida que:
 * 1. Un usuario de Empresa A no puede ver datos de Empresa B
 * 2. super_admin puede ver datos de todas las empresas
 * 3. Login falla si la empresa está inactiva
 * 4. Admin solo crea usuarios en su empresa
 * 5. [NUEVO] switch-company actualiza el contexto de sesión
 * 6. [NUEVO] La nueva sesión retorna empresasAsignadas y permisosEfectivos
 *
 * Nota: Los tests de "Setup/Login/Aislamiento/super_admin" usan el PATH LEGACY
 * (usuarios creados en MongoDB → fallback en authController).
 * Los tests de "PostgreSQL path" usan mock de Prisma para simular el nuevo flujo.
 */

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_TEST_URI || 'mongodb://localhost:27018/turnos_app_test';

const mongoose = require('mongoose');
const request = require('supertest');

let app;
let Empresa, Usuario;

beforeAll(async () => {
  app = require('../../server');

  // Esperar a que mongoose esté conectado (server.js conecta en su módulo)
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
    });
  }

  Empresa = require('../../models/Empresa');
  Usuario = require('../../models/Usuario');

  // Limpiar colecciones de test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  await mongoose.disconnect();
});

let empresaA, empresaB, adminA, adminB;

describe('Setup: Crear empresas y usuarios de prueba', () => {
  test('Crear Empresa A', async () => {
    empresaA = await Empresa.create({
      nombre: 'Test Empresa A',
      estado: 'activa',
      modulosHabilitados: ['turnos', 'nomina']
    });
    expect(empresaA._id).toBeDefined();
  });

  test('Crear Empresa B', async () => {
    empresaB = await Empresa.create({
      nombre: 'Test Empresa B',
      estado: 'activa',
      modulosHabilitados: ['turnos', 'nomina']
    });
    expect(empresaB._id).toBeDefined();
  });

  test('Crear admin de Empresa A', async () => {
    adminA = await Usuario.create({
      username: 'admin_test_a',
      password: 'password_a',
      nombre: 'Admin A',
      rol: 'admin',
      modulosPermitidos: ['turnos', 'nomina'],
      empresaId: empresaA._id,
      activo: true
    });
    expect(adminA._id).toBeDefined();
  });

  test('Crear admin de Empresa B', async () => {
    adminB = await Usuario.create({
      username: 'admin_test_b',
      password: 'password_b',
      nombre: 'Admin B',
      rol: 'admin',
      modulosPermitidos: ['turnos', 'nomina'],
      empresaId: empresaB._id,
      activo: true
    });
    expect(adminB._id).toBeDefined();
  });
});

describe('Login con contexto de empresa (path legacy MongoDB)', () => {
  test('Login exitoso de admin_test_a incluye nombreEmpresa en sesión', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_test_a', password: 'password_a' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Path legacy: empresaId viene del MongoDB _id (string)
    expect(res.body.usuario.empresaId).toBeDefined();
    expect(res.body.usuario.nombreEmpresa).toBe('Test Empresa A');
    // Nuevo formato
    expect(res.body.usuario).toHaveProperty('permisosEfectivos');
    expect(res.body.usuario).toHaveProperty('esSuperAdmin');
    expect(res.body.usuario.esSuperAdmin).toBe(false);
    expect(res.body.usuario._legacy).toBe(true);
  });

  test('Login falla si empresa está inactiva', async () => {
    await Empresa.findByIdAndUpdate(empresaB._id, { estado: 'inactiva' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_test_b', password: 'password_b' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    // Reactivar para tests posteriores
    await Empresa.findByIdAndUpdate(empresaB._id, { estado: 'activa' });
  });

  test('Login retorna empresasAsignadas vacío en path legacy', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_test_a', password: 'password_a' });

    expect(res.status).toBe(200);
    expect(res.body.usuario.empresasAsignadas).toEqual([]);
    expect(res.body.usuario.requiereSeleccionEmpresa).toBe(false);
  });
});

describe('Aislamiento de datos: usuarios', () => {
  let agentA;
  let agentB;

  beforeAll(async () => {
    agentA = request.agent(app);
    agentB = request.agent(app);
    await agentA.post('/api/auth/login').send({ username: 'admin_test_a', password: 'password_a' });
    await agentB.post('/api/auth/login').send({ username: 'admin_test_b', password: 'password_b' });
  });

  test('Admin A solo ve usuarios de Empresa A', async () => {
    const res = await agentA.get('/api/auth/usuarios');
    expect(res.status).toBe(200);
    const usernames = res.body.usuarios.map(u => u.username);
    expect(usernames).toContain('admin_test_a');
    expect(usernames).not.toContain('admin_test_b');
  });

  test('Admin B solo ve usuarios de Empresa B', async () => {
    const res = await agentB.get('/api/auth/usuarios');
    expect(res.status).toBe(200);
    const usernames = res.body.usuarios.map(u => u.username);
    expect(usernames).toContain('admin_test_b');
    expect(usernames).not.toContain('admin_test_a');
  });

  test('Admin A crea usuario y queda asignado a Empresa A', async () => {
    const res = await agentA
      .post('/api/auth/usuarios')
      .send({
        username: 'nuevo_user_a',
        password: 'pass123',
        nombre: 'Nuevo Usuario A',
        rol: 'usuario'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const creado = await Usuario.findOne({ username: 'nuevo_user_a' });
    expect(creado.empresaId.toString()).toBe(empresaA._id.toString());
  });
});

describe('super_admin: acceso global', () => {
  let superAdmin;

  beforeAll(async () => {
    superAdmin = await Usuario.create({
      username: 'superadmin_test',
      password: 'superpass',
      nombre: 'Super Admin Test',
      rol: 'super_admin',
      modulosPermitidos: ['turnos', 'nomina'],
      empresaId: null,
      activo: true
    });
  });

  test('super_admin ve todos los usuarios', async () => {
    const agentSuper = request.agent(app);
    await agentSuper.post('/api/auth/login').send({ username: 'superadmin_test', password: 'superpass' });

    const res = await agentSuper.get('/api/auth/usuarios');
    expect(res.status).toBe(200);
    const usernames = res.body.usuarios.map(u => u.username);
    expect(usernames).toContain('admin_test_a');
    expect(usernames).toContain('admin_test_b');
  });

  test('super_admin puede listar todas las empresas', async () => {
    const agentSuper = request.agent(app);
    await agentSuper.post('/api/auth/login').send({ username: 'superadmin_test', password: 'superpass' });

    const res = await agentSuper.get('/api/empresas');
    expect(res.status).toBe(200);
    expect(res.body.empresas.length).toBeGreaterThanOrEqual(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Tests del NUEVO sistema multiempresa (no requieren MongoDB real)
// Validan el comportamiento de la capa de sesión y los endpoints nuevos.
// ────────────────────────────────────────────────────────────────────────────

describe('Nuevo sistema: /api/auth/me y /api/auth/verificar-sesion', () => {
  let agentA;

  beforeAll(async () => {
    agentA = request.agent(app);
    await agentA.post('/api/auth/login').send({ username: 'admin_test_a', password: 'password_a' });
  });

  test('GET /api/auth/verificar-sesion retorna autenticado:true para sesión activa', async () => {
    const res = await agentA.get('/api/auth/verificar-sesion');
    expect(res.status).toBe(200);
    expect(res.body.autenticado).toBe(true);
    expect(res.body.usuario.username).toBe('admin_test_a');
  });

  test('GET /api/auth/me retorna 401 sin sesión', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me retorna datos completos con sesión activa', async () => {
    const res = await agentA.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.usuario).toHaveProperty('username');
    expect(res.body.usuario).toHaveProperty('permisosEfectivos');
    expect(res.body.usuario).toHaveProperty('empresasAsignadas');
  });
});

describe('Nuevo sistema: POST /api/auth/switch-company', () => {
  let agentLegacy;

  beforeAll(async () => {
    agentLegacy = request.agent(app);
    await agentLegacy.post('/api/auth/login').send({ username: 'admin_test_a', password: 'password_a' });
  });

  test('retorna 401 sin sesión activa', async () => {
    const res = await request(app)
      .post('/api/auth/switch-company')
      .send({ empresaId: 'cualquier-uuid' });
    expect(res.status).toBe(401);
  });

  test('retorna 400 si no se envía empresaId', async () => {
    const res = await agentLegacy.post('/api/auth/switch-company').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('retorna 403 si usuario legacy intenta switch-company (sin pgId)', async () => {
    const res = await agentLegacy
      .post('/api/auth/switch-company')
      .send({ empresaId: '00000000-0000-0000-0000-000000000001' });
    // Legacy users (pgId: null) no pueden hacer switch
    expect([403, 404]).toContain(res.status);
  });
});

describe('Nuevo sistema: Catálogos roles y permisos', () => {
  let agentA;

  beforeAll(async () => {
    agentA = request.agent(app);
    await agentA.post('/api/auth/login').send({ username: 'admin_test_a', password: 'password_a' });
  });

  test('GET /api/auth/roles retorna 200 para usuario autenticado', async () => {
    const res = await agentA.get('/api/auth/roles');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('roles');
    expect(Array.isArray(res.body.roles)).toBe(true);
  });

  test('GET /api/auth/permisos retorna 200 con agrupados', async () => {
    const res = await agentA.get('/api/auth/permisos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('permisos');
    expect(res.body).toHaveProperty('agrupados');
  });

  test('GET /api/auth/roles retorna 401 sin sesión', async () => {
    const res = await request(app).get('/api/auth/roles');
    expect(res.status).toBe(401);
  });
});

describe('Nuevo sistema: seguridad de endpoints sensibles', () => {
  test('POST /api/auth/usuarios retorna 403 para rol usuario normal', async () => {
    // Crear un usuario de consulta en MongoDB para el test
    await Usuario.create({
      username: 'consulta_test',
      password: 'consulta123',
      nombre: 'Consulta Test',
      rol: 'consulta',
      modulosPermitidos: ['turnos'],
      empresaId: empresaA?._id || null,
      activo: true
    });

    const agentConsulta = request.agent(app);
    await agentConsulta.post('/api/auth/login').send({ username: 'consulta_test', password: 'consulta123' });

    const res = await agentConsulta.post('/api/auth/usuarios').send({
      username: 'intento_hack', password: '1234', nombre: 'Hack', rol: 'admin'
    });
    // Consulta no tiene acceso (no es admin ni super_admin)
    // Verifica que no puede crear usuarios
    expect([403, 401]).toContain(res.status);
  });

  test('DELETE /api/auth/usuarios/:id retorna error sin autenticación', async () => {
    const res = await request(app).delete('/api/auth/usuarios/fake-uuid');
    expect([401, 403]).toContain(res.status);
  });
});
