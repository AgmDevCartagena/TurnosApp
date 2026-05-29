'use strict';

/**
 * Tests E2E — Sin mocks. Conecta a PostgreSQL y MongoDB reales.
 *
 * REQUISITOS para ejecutar:
 *   DATABASE_URL  → PostgreSQL real (mismo que producción o staging)
 *   MONGO_URI     → MongoDB real
 *   NODE_ENV=test → para que el servidor no cachee sesiones de producción
 *
 * Los datos creados tienen el prefijo `e2e_<timestamp>_` y se eliminan
 * en afterAll (incluso si los tests fallan).
 *
 * Ejecutar:
 *   pnpm test:e2e
 *   -- o --
 *   npx jest tests/e2e/full.e2e.test.js --forceExit --runInBand
 */

process.env.NODE_ENV = 'test';

const request = require('supertest');
const prisma  = require('../../lib/prisma');
const bcrypt  = require('bcryptjs');

// ── Prefijo único para esta ejecución ─────────────────────────────────────────
const P = `e2e_${Date.now()}_`;

// ── Datos de test que se irán completando durante el setup ────────────────────
let app;
let empA, empB;           // Empresas test
let areaA, areaB;         // Áreas test
let rolAdmin, rolConsulta; // Roles existentes en DB
let usrSA, usrAdminA, usrNormal; // Usuarios creados
let ueAdminA;             // UsuarioEmpresa: adminA → empresaA

// ────────────────────────────────────────────────────────────────────────────
// SETUP GLOBAL
// ────────────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  // Cargar app (conecta a ambas BDs)
  app = require('../../server');

  // Esperar a que Prisma esté listo haciendo una query trivial
  await prisma.$queryRaw`SELECT 1`;

  // ── 1. Roles existentes (creados por seed) ───────────────────────────────
  const roles = await prisma.rol.findMany({ where: { activo: true } });
  if (roles.length === 0) throw new Error('No hay roles en BD. Ejecuta: pnpm seed:pg');
  rolAdmin   = roles.find(r => /admin/i.test(r.codigo)) || roles[0];
  rolConsulta= roles.find(r => /consulta/i.test(r.codigo)) || roles[roles.length - 1];

  // ── 2. Empresas test ─────────────────────────────────────────────────────
  empA = await prisma.empresa.create({
    data: { nombre: `${P}Empresa A`, nit: `${P}111`, estado: 'activa' }
  });
  empB = await prisma.empresa.create({
    data: { nombre: `${P}Empresa B`, nit: `${P}222`, estado: 'activa' }
  });

  // ── 3. Habilitar módulos en ambas empresas ───────────────────────────────
  const modTurnos = await prisma.modulo.findFirst({ where: { codigo: 'turnos' } });
  const modNomina = await prisma.modulo.findFirst({ where: { codigo: 'nomina' } });
  if (modTurnos) {
    await prisma.empresaModulo.createMany({
      data: [
        { empresaId: empA.id, moduloId: modTurnos.id, habilitado: true },
        { empresaId: empB.id, moduloId: modTurnos.id, habilitado: true },
      ], skipDuplicates: true
    });
  }
  if (modNomina) {
    await prisma.empresaModulo.createMany({
      data: [
        { empresaId: empA.id, moduloId: modNomina.id, habilitado: true },
        { empresaId: empB.id, moduloId: modNomina.id, habilitado: true },
      ], skipDuplicates: true
    });
  }

  // ── 4. Áreas test ────────────────────────────────────────────────────────
  areaA = await prisma.area.create({
    data: { nombre: `${P}Area Produccion`, empresaId: empA.id, estado: 'activo' }
  });
  areaB = await prisma.area.create({
    data: { nombre: `${P}Area Ventas`, empresaId: empB.id, estado: 'activo' }
  });

  // ── 5. Usuarios test (directamente en PostgreSQL) ────────────────────────
  const hash = await bcrypt.hash('test1234', 10);

  usrSA = await prisma.usuario.create({
    data: {
      username:     `${P}sa`,
      passwordHash: hash,
      nombre:       `${P}Super Admin E2E`,
      rol:          'super_admin',
      activo:       true,
    }
  });

  usrAdminA = await prisma.usuario.create({
    data: {
      username:     `${P}admin_a`,
      passwordHash: hash,
      nombre:       `${P}Admin Empresa A`,
      rol:          'admin',
      empresaId:    empA.id,
      activo:       true,
    }
  });

  usrNormal = await prisma.usuario.create({
    data: {
      username:     `${P}normal`,
      passwordHash: hash,
      nombre:       `${P}Usuario Normal`,
      rol:          'usuario',
      empresaId:    empA.id,
      activo:       true,
    }
  });

  // ── 6. Asignar usrSA a empA (única empresa → auto-login sin selección) ───
  await prisma.usuarioEmpresa.create({
    data: {
      usuarioId: usrSA.id, empresaId: empA.id, rolId: rolAdmin.id,
      estado: 'activo', empresaActivaDefault: true
    }
  });

  // ── 7. Asignar usrAdminA a empA ──────────────────────────────────────────
  ueAdminA = await prisma.usuarioEmpresa.create({
    data: {
      usuarioId: usrAdminA.id, empresaId: empA.id, rolId: rolAdmin.id,
      estado: 'activo', empresaActivaDefault: true
    }
  });

}, 30000);

// ────────────────────────────────────────────────────────────────────────────
// TEARDOWN GLOBAL — se ejecuta siempre, incluso si fallan los tests
// ────────────────────────────────────────────────────────────────────────────
afterAll(async () => {
  try {
    // El orden importa por las FK: primero registros dependientes
    const userIds = [usrSA?.id, usrAdminA?.id, usrNormal?.id].filter(Boolean);

    // Buscar usuarios creados durante los tests (${P}nuevo_*)
    const extrasDb = await prisma.usuario.findMany({
      where: { username: { startsWith: P } },
      select: { id: true }
    });
    const todosIds = [...new Set([...userIds, ...extrasDb.map(u => u.id)])];

    if (todosIds.length > 0) {
      await prisma.usuarioEmpresaPermiso.deleteMany({ where: { usuarioEmpresa: { usuarioId: { in: todosIds } } } });
      await prisma.usuarioEmpresaArea.deleteMany({    where: { usuarioEmpresa: { usuarioId: { in: todosIds } } } });
      await prisma.usuarioEmpresaModulo.deleteMany({  where: { usuarioEmpresa: { usuarioId: { in: todosIds } } } });
      await prisma.usuarioEmpresa.deleteMany({        where: { usuarioId: { in: todosIds } } });
      await prisma.usuarioModulo.deleteMany({         where: { usuarioId: { in: todosIds } } });
      await prisma.usuarioArea.deleteMany({           where: { usuarioId: { in: todosIds } } });
      await prisma.usuario.deleteMany({               where: { id: { in: todosIds } } });
    }

    // Empresas (cascade elimina áreas, modulos, etc.)
    if (areaA?.id) await prisma.area.deleteMany({ where: { id: { in: [areaA.id, areaB?.id].filter(Boolean) } } });
    if (empA?.id)  await prisma.empresa.deleteMany({ where: { id: { in: [empA.id, empB?.id].filter(Boolean) } } });

  } catch (cleanErr) {
    console.warn('⚠️ Cleanup E2E parcialmente fallido:', cleanErr.message);
  } finally {
    await prisma.$disconnect();
  }
}, 30000);

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────
function agent() { return request.agent(app); }

async function loginAs(ag, username) {
  return ag.post('/api/auth/login').send({ username, password: 'test1234' });
}

// ════════════════════════════════════════════════════════════════════════════
// SUITE 1: Login — PostgreSQL path (sin fallback MongoDB)
// ════════════════════════════════════════════════════════════════════════════
describe('1. Login — PostgreSQL path', () => {
  test('super_admin con una empresa → login directo sin selección', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: `${P}sa`, password: 'test1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const u = res.body.usuario;
    expect(u.pgId).toBe(usrSA.id);
    expect(u.rol).toBe('super_admin');
    expect(u.esSuperAdmin).toBe(true);
    expect(u._legacy).toBeFalsy();
    expect(u.nombreEmpresa).toBe(`${P}Empresa A`);
    expect(u.permisosEfectivos).toBeDefined();
    expect(Array.isArray(u.permisosEfectivos)).toBe(true);
    expect(u.requiereSeleccionEmpresa).toBeFalsy();
  });

  test('admin de empresa A → login directo con contexto de empresa A', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: `${P}admin_a`, password: 'test1234' });

    expect(res.status).toBe(200);
    const u = res.body.usuario;
    expect(u.pgId).toBe(usrAdminA.id);
    expect(u.rol).toBe('admin');
    expect(u.pgEmpresaId).toBe(empA.id);
    expect(u.nombreEmpresa).toBe(`${P}Empresa A`);
    expect(u._legacy).toBeFalsy();
  });

  test('credenciales inválidas → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: `${P}sa`, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('usuario inexistente → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'no_existe_nunca_jamas', password: 'x' });
    expect(res.status).toBe(401);
  });

  test('usuario inactivo → 403', async () => {
    await prisma.usuario.update({ where: { id: usrNormal.id }, data: { activo: false } });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: `${P}normal`, password: 'test1234' });
    expect(res.status).toBe(403);
    // Reactivar
    await prisma.usuario.update({ where: { id: usrNormal.id }, data: { activo: true } });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SUITE 2: /me y /verificar-sesion
// ════════════════════════════════════════════════════════════════════════════
describe('2. /me y /verificar-sesion', () => {
  let ag;
  beforeAll(async () => { ag = agent(); await loginAs(ag, `${P}sa`); });

  test('GET /api/auth/verificar-sesion → autenticado', async () => {
    const res = await ag.get('/api/auth/verificar-sesion');
    expect(res.status).toBe(200);
    expect(res.body.autenticado).toBe(true);
    expect(res.body.usuario.username).toBe(`${P}sa`);
  });

  test('GET /api/auth/me → datos completos', async () => {
    const res = await ag.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const u = res.body.usuario;
    expect(u.username).toBe(`${P}sa`);
    expect(u.permisosEfectivos).toBeDefined();
    expect(u.modulosActivos).toBeDefined();
    expect(u.empresa).toBeDefined();
    expect(Array.isArray(u.empresasAsignadas)).toBe(true);
  });

  test('GET /api/auth/me → 401 sin sesión', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/verificar-sesion → false tras logout', async () => {
    const agLogout = agent();
    await loginAs(agLogout, `${P}sa`);
    await agLogout.post('/api/auth/logout');
    const res = await agLogout.get('/api/auth/verificar-sesion');
    expect(res.body.autenticado).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SUITE 3: switch-company
// ════════════════════════════════════════════════════════════════════════════
describe('3. switch-company', () => {
  let ag;

  beforeAll(async () => {
    // Asignar SA también a empB para poder hacer switch
    await prisma.usuarioEmpresa.upsert({
      where:  { usuarioId_empresaId: { usuarioId: usrSA.id, empresaId: empB.id } },
      create: { usuarioId: usrSA.id, empresaId: empB.id, rolId: rolAdmin.id, estado: 'activo' },
      update: { rolId: rolAdmin.id, estado: 'activo' }
    });
    ag = agent();
    await loginAs(ag, `${P}sa`);
  });

  afterAll(async () => {
    await prisma.usuarioEmpresaModulo.deleteMany({ where: { usuarioEmpresa: { usuarioId: usrSA.id, empresaId: empB.id } } });
    await prisma.usuarioEmpresaArea.deleteMany({ where: { usuarioEmpresa: { usuarioId: usrSA.id, empresaId: empB.id } } });
    await prisma.usuarioEmpresa.deleteMany({ where: { usuarioId: usrSA.id, empresaId: empB.id } });
  });

  test('cambiar a empresa B actualiza el contexto de sesión', async () => {
    const res = await ag
      .post('/api/auth/switch-company')
      .send({ empresaId: empB.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const u = res.body.usuario;
    expect(u.pgEmpresaId).toBe(empB.id);
    expect(u.nombreEmpresa).toBe(`${P}Empresa B`);
  });

  test('después del switch /me muestra empresa B', async () => {
    await ag.post('/api/auth/switch-company').send({ empresaId: empB.id });
    const res = await ag.get('/api/auth/me');
    expect(res.body.usuario.empresa.id).toBe(empB.id);
  });

  test('switch a empresa no asignada → 403 o 404', async () => {
    const res = await ag
      .post('/api/auth/switch-company')
      .send({ empresaId: '00000000-0000-0000-0000-000000000099' });
    expect([403, 404]).toContain(res.status);
  });

  test('switch sin empresaId → 400', async () => {
    const res = await ag.post('/api/auth/switch-company').send({});
    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SUITE 4: Catálogos — roles y permisos
// ════════════════════════════════════════════════════════════════════════════
describe('4. Catálogos roles y permisos', () => {
  let ag;
  beforeAll(async () => { ag = agent(); await loginAs(ag, `${P}sa`); });

  test('GET /api/auth/roles → lista de roles con id/codigo/nombre', async () => {
    const res = await ag.get('/api/auth/roles');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.roles)).toBe(true);
    expect(res.body.roles.length).toBeGreaterThan(0);
    const rol = res.body.roles[0];
    expect(rol).toHaveProperty('id');
    expect(rol).toHaveProperty('codigo');
    expect(rol).toHaveProperty('nombre');
  });

  test('GET /api/auth/permisos → lista plana y agrupados', async () => {
    const res = await ag.get('/api/auth/permisos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.permisos)).toBe(true);
    expect(typeof res.body.agrupados).toBe('object');
  });

  test('GET /api/auth/roles → 401 sin sesión', async () => {
    const res = await request(app).get('/api/auth/roles');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/permisos → 401 sin sesión', async () => {
    const res = await request(app).get('/api/auth/permisos');
    expect(res.status).toBe(401);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SUITE 5: CRUD Usuarios
// ════════════════════════════════════════════════════════════════════════════
describe('5. CRUD Usuarios', () => {
  let agSA, agAdminA, nuevoUserId;

  beforeAll(async () => {
    agSA     = agent(); await loginAs(agSA, `${P}sa`);
    agAdminA = agent(); await loginAs(agAdminA, `${P}admin_a`);
  });

  test('super_admin puede listar todos los usuarios', async () => {
    const res = await agSA.get('/api/auth/usuarios');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.usuarios)).toBe(true);
    const usernames = res.body.usuarios.map(u => u.username);
    expect(usernames).toContain(`${P}sa`);
    expect(usernames).toContain(`${P}admin_a`);
  });

  test('admin_a solo ve usuarios de su empresa', async () => {
    const res = await agAdminA.get('/api/auth/usuarios');
    expect(res.status).toBe(200);
    // Todos los usuarios retornados deben estar en empresa A
    res.body.usuarios.forEach(u => {
      if (u.empresaId) expect(u.empresaId).toBe(empA.id);
    });
  });

  test('crear usuario con empresa asignada', async () => {
    const res = await agSA.post('/api/auth/usuarios').send({
      username:  `${P}nuevo`,
      password:  'test1234',
      nombre:    `${P}Nuevo Usuario`,
      rol:       'usuario',
      empresas: [{
        empresaId: empA.id,
        rolId:     rolAdmin.id,
        modulos:   ['turnos'],
        areas:     [areaA.id],
        permisos:  []
      }]
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    nuevoUserId = res.body.usuario.id;
    expect(nuevoUserId).toBeDefined();
  });

  test('el usuario creado existe en PostgreSQL con empresa asignada', async () => {
    const u = await prisma.usuario.findUnique({
      where: { username: `${P}nuevo` },
      include: { empresas: { include: { empresa: true, rol: true } } }
    });
    expect(u).not.toBeNull();
    expect(u.empresas).toHaveLength(1);
    expect(u.empresas[0].empresa.nombre).toBe(`${P}Empresa A`);
  });

  test('crear usuario duplicado → 400', async () => {
    const res = await agSA.post('/api/auth/usuarios').send({
      username: `${P}nuevo`, password: 'test1234', nombre: 'Duplicado'
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('editar nombre y correo del usuario creado', async () => {
    const res = await agSA.put(`/api/auth/usuarios/${nuevoUserId}`).send({
      nombre: `${P}Nuevo Editado`,
      correo: 'nuevo@test.com',
      rol:    'usuario'
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('toggle estado del usuario → activo/inactivo', async () => {
    const r1 = await agSA.patch(`/api/auth/usuarios/${nuevoUserId}/estado`);
    expect(r1.status).toBe(200);
    const nuevoActivo = r1.body.activo;
    expect(typeof nuevoActivo).toBe('boolean');

    const r2 = await agSA.patch(`/api/auth/usuarios/${nuevoUserId}/estado`);
    expect(r2.body.activo).toBe(!nuevoActivo);
  });

  test('listar usuarios incluye empresasAsignadas para el nuevo usuario', async () => {
    const res = await agSA.get('/api/auth/usuarios');
    const nuevo = res.body.usuarios.find(u => u.id === nuevoUserId);
    expect(nuevo).toBeDefined();
    expect(Array.isArray(nuevo.empresasAsignadas)).toBe(true);
    expect(nuevo.empresasAsignadas[0].empresaId).toBe(empA.id);
  });

  test('eliminar el usuario nuevo', async () => {
    const res = await agSA.delete(`/api/auth/usuarios/${nuevoUserId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    nuevoUserId = null;
  });

  test('usuario eliminado ya no aparece en la lista', async () => {
    const res = await agSA.get('/api/auth/usuarios');
    const ids = res.body.usuarios.map(u => u.username);
    expect(ids).not.toContain(`${P}nuevo`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SUITE 6: Asignación multiempresa (PUT /empresas)
// ════════════════════════════════════════════════════════════════════════════
describe('6. Asignación multiempresa vía API', () => {
  let agSA;

  beforeAll(async () => { agSA = agent(); await loginAs(agSA, `${P}sa`); });

  test('asignar usrAdminA a empresaB con rol consulta', async () => {
    const res = await agSA
      .put(`/api/auth/usuarios/${usrAdminA.id}/empresas`)
      .send({
        empresas: [
          { empresaId: empA.id, rolId: rolAdmin.id,   modulos: ['turnos'], areas: [], permisos: [] },
          { empresaId: empB.id, rolId: rolConsulta.id, modulos: ['turnos'], areas: [], permisos: [] }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('adminA ahora tiene 2 empresas asignadas en BD', async () => {
    const empresas = await prisma.usuarioEmpresa.findMany({
      where: { usuarioId: usrAdminA.id, estado: 'activo' }
    });
    expect(empresas).toHaveLength(2);
    const empIds = empresas.map(e => e.empresaId);
    expect(empIds).toContain(empA.id);
    expect(empIds).toContain(empB.id);
  });

  test('la API lista las 2 empresas asignadas', async () => {
    const res = await agSA.get('/api/auth/usuarios');
    const admin = res.body.usuarios.find(u => u.id === usrAdminA.id);
    expect(admin.empresasAsignadas).toHaveLength(2);
  });

  test('asignar con empresaId inválido (no UUID) → 500 con mensaje', async () => {
    const res = await agSA
      .put(`/api/auth/usuarios/${usrAdminA.id}/empresas`)
      .send({ empresas: [{ empresaId: 'no-es-uuid', rolId: rolAdmin.id }] });
    expect([400, 500]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('asignar a empresa inactiva → error', async () => {
    // Desactivar empB temporalmente
    await prisma.empresa.update({ where: { id: empB.id }, data: { estado: 'inactiva' } });
    const res = await agSA
      .put(`/api/auth/usuarios/${usrAdminA.id}/empresas`)
      .send({ empresas: [{ empresaId: empB.id, rolId: rolAdmin.id }] });
    expect([400, 500]).toContain(res.status);
    // Reactivar
    await prisma.empresa.update({ where: { id: empB.id }, data: { estado: 'activa' } });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SUITE 7: RBAC — control de acceso
// ════════════════════════════════════════════════════════════════════════════
describe('7. RBAC — control de acceso por rol', () => {
  let agNormal;

  beforeAll(async () => { agNormal = agent(); await loginAs(agNormal, `${P}normal`); });

  test('usuario con rol "usuario" no puede crear usuarios → 403', async () => {
    const res = await agNormal.post('/api/auth/usuarios').send({
      username: `${P}hack`, password: '1234', nombre: 'Hack'
    });
    expect(res.status).toBe(403);
  });

  test('usuario con rol "usuario" no puede listar usuarios → 403', async () => {
    const res = await agNormal.get('/api/auth/usuarios');
    expect(res.status).toBe(403);
  });

  test('usuario con rol "usuario" no puede eliminar usuarios → 403', async () => {
    const res = await agNormal.delete(`/api/auth/usuarios/${usrAdminA.id}`);
    expect(res.status).toBe(403);
  });

  test('usuario con rol "usuario" no puede editar usuarios → 403', async () => {
    const res = await agNormal
      .put(`/api/auth/usuarios/${usrAdminA.id}`)
      .send({ nombre: 'Hack Edit' });
    expect(res.status).toBe(403);
  });

  test('sin sesión → endpoints protegidos retornan 401 o 403', async () => {
    const unauthApp = request(app);
    const [r1, r2, r3] = await Promise.all([
      unauthApp.get('/api/auth/usuarios'),
      unauthApp.post('/api/auth/usuarios').send({ username: 'x', password: 'x', nombre: 'x' }),
      unauthApp.get('/api/auth/me'),
    ]);
    expect([401, 403]).toContain(r1.status);
    expect([401, 403]).toContain(r2.status);
    expect(r3.status).toBe(401);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SUITE 8: Contraseñas
// ════════════════════════════════════════════════════════════════════════════
describe('8. Gestión de contraseñas', () => {
  let agSA;

  beforeAll(async () => { agSA = agent(); await loginAs(agSA, `${P}sa`); });

  test('admin puede cambiar contraseña de otro usuario', async () => {
    const res = await agSA
      .put(`/api/auth/usuarios/${usrNormal.id}/password`)
      .send({ password: 'nueva1234' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('el nuevo password funciona para login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: `${P}normal`, password: 'nueva1234' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('cambiar mi contraseña — flujo completo', async () => {
    const agUser = agent();
    // Login con nueva contraseña
    await agUser.post('/api/auth/login').send({ username: `${P}normal`, password: 'nueva1234' });
    const res = await agUser.put('/api/auth/mi-password').send({
      passwordActual:   'nueva1234',
      passwordNueva:    'test1234',
      confirmarPassword:'test1234'
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('cambiar mi contraseña con password actual incorrecta → 401', async () => {
    const agUser = agent();
    await agUser.post('/api/auth/login').send({ username: `${P}normal`, password: 'test1234' });
    const res = await agUser.put('/api/auth/mi-password').send({
      passwordActual:   'equivocada',
      passwordNueva:    'test1234',
      confirmarPassword:'test1234'
    });
    expect(res.status).toBe(401);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SUITE 9: Empresa inactiva bloquea login
// ════════════════════════════════════════════════════════════════════════════
describe('9. Empresa inactiva bloquea login', () => {
  test('login falla si la única empresa del usuario está inactiva', async () => {
    await prisma.empresa.update({ where: { id: empA.id }, data: { estado: 'inactiva' } });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: `${P}admin_a`, password: 'test1234' });

    // Empresa inactiva → 403 o acceso sin empresa
    expect([403, 200]).toContain(res.status);
    if (res.status === 200) {
      // Si el servidor permite login sin empresa activa, al menos no debe tener contexto
      expect(res.body.usuario.pgEmpresaId).toBeFalsy();
    }

    // Reactivar para no afectar otros tests
    await prisma.empresa.update({ where: { id: empA.id }, data: { estado: 'activa' } });
  });
});
