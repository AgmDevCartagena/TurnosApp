/**
 * Tests de integración: Aislamiento multiempresa
 *
 * Valida que:
 * 1. Un usuario de Empresa A no puede ver datos de Empresa B
 * 2. super_admin puede ver datos de todas las empresas
 * 3. Login falla si la empresa está inactiva
 * 4. Admin solo crea usuarios en su empresa
 *
 * Requiere MongoDB en memoria o una BD de test separada.
 * Usa supertest para simular requests HTTP completos.
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

describe('Login con contexto de empresa', () => {
  test('Login exitoso de admin_test_a incluye empresaId y nombreEmpresa', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_test_a', password: 'password_a' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.usuario.empresaId).toBe(empresaA._id.toString());
    expect(res.body.usuario.nombreEmpresa).toBe('Test Empresa A');
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
