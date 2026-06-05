'use strict';

const mockPrisma = {
  rol: {
    findMany:  jest.fn(),
    findUnique: jest.fn(),
    create:    jest.fn(),
    update:    jest.fn(),
    delete:    jest.fn(),
  },
  permiso: {
    findMany: jest.fn(),
  },
  rolPermiso: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  usuarioEmpresa: {
    count: jest.fn(),
  },
  $transaction: jest.fn(async cb => cb(mockPrisma)),
};

jest.mock('../../lib/prisma', () => mockPrisma);

const ctrl = require('../../controllers/rolesController');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mockReq(overrides = {}) {
  return {
    params:  {},
    body:    {},
    query:   {},
    session: { autenticado: true, usuario: { rol: 'super_admin', esSuperAdmin: true, pgId: 'u1', pgEmpresaId: 'e1', permisosEfectivos: [] } },
    ...overrides
  };
}
function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json   = jest.fn(() => res);
  return res;
}

const ROL_BASE = {
  id: 'rol-1', codigo: 'ADMIN_EMPRESA', nombre: 'Administrador de Empresa',
  descripcion: 'Acceso completo', tipo: 'empresa', estado: 'activo',
  createdAt: new Date(), updatedAt: new Date(),
  permisos: [{ permiso: { id: 'p1', codigo: 'usuarios.ver', nombre: 'Ver usuarios', descripcion: 'Desc', modulo: 'usuarios', recurso: 'usuario', accion: 'ver', orden: 10 } }]
};

beforeEach(() => { jest.clearAllMocks(); });

// ═══════════════════════════════════════════════════════════════════════════════
describe('listarRoles', () => {
  it('devuelve roles con permisos y totales', async () => {
    mockPrisma.rol.findMany.mockResolvedValue([ROL_BASE]);
    mockPrisma.usuarioEmpresa.count.mockResolvedValue(3);

    const req = mockReq();
    const res = mockRes();
    await ctrl.listarRoles(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const { roles } = res.json.mock.calls[0][0];
    expect(roles).toHaveLength(1);
    expect(roles[0].permisos).toHaveLength(1);
    expect(roles[0].totalUsuarios).toBe(3);
  });

  it('maneja error de BD con 500', async () => {
    mockPrisma.rol.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ctrl.listarRoles(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('obtenerRol', () => {
  it('devuelve el rol con permisos cuando existe', async () => {
    mockPrisma.rol.findUnique.mockResolvedValue(ROL_BASE);
    mockPrisma.usuarioEmpresa.count.mockResolvedValue(1);

    const res = mockRes();
    await ctrl.obtenerRol(mockReq({ params: { id: 'rol-1' } }), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
    expect(res.json.mock.calls[0][0].rol.permisos).toHaveLength(1);
  });

  it('devuelve 404 si no existe', async () => {
    mockPrisma.rol.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await ctrl.obtenerRol(mockReq({ params: { id: 'no-existe' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('crearRol', () => {
  it('crea un rol sin permisos', async () => {
    mockPrisma.rol.findUnique.mockResolvedValue(null); // no existe código duplicado
    const nuevoRol = { ...ROL_BASE, id: 'rol-2', codigo: 'NUEVO', permisos: [] };
    mockPrisma.rol.create.mockResolvedValue(nuevoRol);
    // findUnique al final del $transaction
    mockPrisma.rol.findUnique.mockResolvedValueOnce(null).mockResolvedValue(nuevoRol);

    const req = mockReq({ body: { codigo: 'NUEVO', nombre: 'Nuevo Rol' } });
    const res = mockRes();
    await ctrl.crearRol(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rechaza si falta el nombre', async () => {
    const res = mockRes();
    await ctrl.crearRol(mockReq({ body: { codigo: 'X' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/nombre/i);
  });

  it('rechaza si falta el código', async () => {
    const res = mockRes();
    await ctrl.crearRol(mockReq({ body: { nombre: 'Rol' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/código/i);
  });

  it('rechaza código duplicado', async () => {
    mockPrisma.rol.findUnique.mockResolvedValue(ROL_BASE);
    const res = mockRes();
    await ctrl.crearRol(mockReq({ body: { codigo: 'ADMIN_EMPRESA', nombre: 'Dup' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/ADMIN_EMPRESA/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('editarRol', () => {
  it('actualiza nombre y descripción', async () => {
    const rolActualizado = { ...ROL_BASE, nombre: 'Nuevo nombre', permisos: [] };
    mockPrisma.rol.findUnique.mockResolvedValue(ROL_BASE);
    mockPrisma.rol.update.mockResolvedValue(rolActualizado);

    const res = mockRes();
    await ctrl.editarRol(mockReq({ params: { id: 'rol-1' }, body: { nombre: 'Nuevo nombre' } }), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
    expect(mockPrisma.rol.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'rol-1' }, data: expect.objectContaining({ nombre: 'Nuevo nombre' })
    }));
  });

  it('devuelve 404 si rol no existe', async () => {
    mockPrisma.rol.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await ctrl.editarRol(mockReq({ params: { id: 'x' }, body: { nombre: 'Y' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devuelve 400 si no hay campos para actualizar', async () => {
    mockPrisma.rol.findUnique.mockResolvedValue(ROL_BASE);
    const res = mockRes();
    await ctrl.editarRol(mockReq({ params: { id: 'rol-1' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('toggleEstadoRol', () => {
  it('desactiva un rol activo sin usuarios', async () => {
    mockPrisma.rol.findUnique.mockResolvedValue(ROL_BASE);
    mockPrisma.usuarioEmpresa.count.mockResolvedValue(0);
    mockPrisma.rol.update.mockResolvedValue({ ...ROL_BASE, estado: 'inactivo' });

    const res = mockRes();
    await ctrl.toggleEstadoRol(mockReq({ params: { id: 'rol-1' } }), res);
    expect(res.json.mock.calls[0][0].estado).toBe('inactivo');
  });

  it('rechaza desactivar un rol con usuarios activos', async () => {
    mockPrisma.rol.findUnique.mockResolvedValue(ROL_BASE);
    mockPrisma.usuarioEmpresa.count.mockResolvedValue(5);

    const res = mockRes();
    await ctrl.toggleEstadoRol(mockReq({ params: { id: 'rol-1' } }), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].error).toMatch(/5 usuario/);
  });

  it('activa un rol inactivo sin verificar usuarios', async () => {
    const rolInactivo = { ...ROL_BASE, estado: 'inactivo' };
    mockPrisma.rol.findUnique.mockResolvedValue(rolInactivo);
    mockPrisma.rol.update.mockResolvedValue({ ...rolInactivo, estado: 'activo' });

    const res = mockRes();
    await ctrl.toggleEstadoRol(mockReq({ params: { id: 'rol-1' } }), res);
    expect(res.json.mock.calls[0][0].estado).toBe('activo');
    expect(mockPrisma.usuarioEmpresa.count).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('eliminarRol', () => {
  it('elimina un rol sin usuarios asignados', async () => {
    mockPrisma.rol.findUnique.mockResolvedValue(ROL_BASE);
    mockPrisma.usuarioEmpresa.count.mockResolvedValue(0);
    mockPrisma.rolPermiso.deleteMany.mockResolvedValue({});
    mockPrisma.rol.delete.mockResolvedValue({});

    const res = mockRes();
    await ctrl.eliminarRol(mockReq({ params: { id: 'rol-1' } }), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('rechaza eliminar si hay usuarios asignados', async () => {
    mockPrisma.rol.findUnique.mockResolvedValue(ROL_BASE);
    mockPrisma.usuarioEmpresa.count.mockResolvedValue(2);

    const res = mockRes();
    await ctrl.eliminarRol(mockReq({ params: { id: 'rol-1' } }), res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('actualizarPermisosDeRol', () => {
  const PERMS = [
    { id: 'p1', codigo: 'usuarios.ver', estado: 'activo' },
    { id: 'p2', codigo: 'areas.ver',    estado: 'activo' },
  ];

  it('reemplaza permisos del rol correctamente', async () => {
    mockPrisma.rol.findUnique.mockResolvedValue({ ...ROL_BASE, permisos: [] });
    mockPrisma.permiso.findMany.mockResolvedValue(PERMS);
    mockPrisma.rolPermiso.deleteMany.mockResolvedValue({});
    mockPrisma.rolPermiso.createMany.mockResolvedValue({});
    // findUnique al final para retornar el rol actualizado
    mockPrisma.rol.findUnique
      .mockResolvedValueOnce({ ...ROL_BASE, permisos: [] })
      .mockResolvedValue({ ...ROL_BASE, permisos: PERMS.map(p => ({ permiso: p })) });

    const req = mockReq({ params: { id: 'rol-1' }, body: { permisos: ['usuarios.ver', 'areas.ver'] } });
    const res = mockRes();
    await ctrl.actualizarPermisosDeRol(req, res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
    expect(mockPrisma.rolPermiso.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        { rolId: 'rol-1', permisoId: 'p1' },
        { rolId: 'rol-1', permisoId: 'p2' },
      ])
    }));
  });

  it('rechaza si permisos no es array', async () => {
    const res = mockRes();
    await ctrl.actualizarPermisosDeRol(mockReq({ params: { id: 'rol-1' }, body: { permisos: 'texto' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rechaza permisos duplicados', async () => {
    mockPrisma.rol.findUnique.mockResolvedValue(ROL_BASE);
    mockPrisma.permiso.findMany.mockResolvedValue(PERMS);
    const req = mockReq({ params: { id: 'rol-1' }, body: { permisos: ['usuarios.ver', 'usuarios.ver'] } });
    const res = mockRes();
    await ctrl.actualizarPermisosDeRol(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/duplicado/i);
  });

  it('acepta array vacío (quita todos los permisos)', async () => {
    mockPrisma.rol.findUnique.mockResolvedValue(ROL_BASE);
    mockPrisma.permiso.findMany.mockResolvedValue([]);
    mockPrisma.rolPermiso.deleteMany.mockResolvedValue({});
    mockPrisma.rol.findUnique
      .mockResolvedValueOnce(ROL_BASE)
      .mockResolvedValue({ ...ROL_BASE, permisos: [] });

    const req = mockReq({ params: { id: 'rol-1' }, body: { permisos: [] } });
    const res = mockRes();
    await ctrl.actualizarPermisosDeRol(req, res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
    expect(mockPrisma.rolPermiso.createMany).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('listarPermisos', () => {
  const PERMISOS_MOCK = [
    { id: 'p1', codigo: 'usuarios.ver', nombre: 'Ver usuarios', descripcion: 'Desc', modulo: 'usuarios', recurso: 'usuario', accion: 'ver', orden: 10, estado: 'activo' },
    { id: 'p2', codigo: 'areas.ver',    nombre: 'Ver áreas',    descripcion: 'Desc', modulo: 'areas',    recurso: 'area',    accion: 'ver', orden: 40, estado: 'activo' },
  ];

  it('lista permisos agrupados por módulo', async () => {
    mockPrisma.permiso.findMany.mockResolvedValue(PERMISOS_MOCK);
    const req = mockReq({ query: {} });
    const res = mockRes();
    await ctrl.listarPermisos(req, res);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.total).toBe(2);
    expect(body.agrupados).toHaveProperty('usuarios');
    expect(body.agrupados).toHaveProperty('areas');
  });

  it('filtra por módulo', async () => {
    mockPrisma.permiso.findMany.mockResolvedValue([PERMISOS_MOCK[0]]);
    const req = mockReq({ query: { modulo: 'usuarios' } });
    const res = mockRes();
    await ctrl.listarPermisos(req, res);
    expect(mockPrisma.permiso.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ modulo: 'usuarios' }) })
    );
  });
});
