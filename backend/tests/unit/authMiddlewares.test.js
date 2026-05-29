'use strict';

/**
 * Tests unitarios: middlewares/auth.js
 *
 * Cubre todos los guards del sistema:
 *  requireAuth, requireAdmin, requireSuperAdmin,
 *  requireCompanyContext, requireModulo,
 *  requirePermiso, requirePermisoStrict, requireArea
 */

jest.mock('../../services/permisosService', () => ({
  tienePermiso: jest.fn(),
}));

const {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requireCompanyContext,
  requireModulo,
  requirePermiso,
  requirePermisoStrict,
  requireArea,
} = require('../../middlewares/auth');

const permisosService = require('../../services/permisosService');

// ── Helper: construir mocks de req/res/next ──────────────────────────────────
function makeReq(sessionOverrides = {}) {
  const usuario = sessionOverrides.usuario || null;
  return {
    session: {
      autenticado: !!usuario,
      usuario,
      ...sessionOverrides
    },
    xhr: false,
    headers: { accept: 'application/json' },
  };
}

function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn().mockReturnThis(),
    redirect: jest.fn(),
  };
  return res;
}

function makeNext() { return jest.fn(); }

beforeEach(() => jest.clearAllMocks());

// ────────────────────────────────────────────────────────────────────────────
describe('requireAuth', () => {

  test('llama next() si la sesión está autenticada', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'usuario' } });
    const res  = makeRes();
    const next = makeNext();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('retorna 401 JSON si no está autenticado y es petición API', () => {
    const req  = makeReq({});
    const res  = makeRes();
    const next = makeNext();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('redirige a login.html si es petición de navegador (no JSON)', () => {
    const req = makeReq({});
    req.headers.accept = 'text/html';
    const res  = makeRes();
    const next = makeNext();
    requireAuth(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/login.html');
    expect(next).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('requireAdmin', () => {

  test.each(['admin', 'super_admin'])('%s pasa el guard', (rol) => {
    const req  = makeReq({ autenticado: true, usuario: { rol } });
    const res  = makeRes();
    const next = makeNext();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test.each(['usuario', 'gestor_turnos', 'consulta'])('%s es rechazado con 403', (rol) => {
    const req  = makeReq({ autenticado: true, usuario: { rol } });
    const res  = makeRes();
    const next = makeNext();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 401 si no está autenticado', () => {
    const req  = makeReq({});
    const res  = makeRes();
    const next = makeNext();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('requireSuperAdmin', () => {

  test('super_admin pasa', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'super_admin' } });
    const res  = makeRes();
    const next = makeNext();
    requireSuperAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('admin es rechazado con 403', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'admin' } });
    const res  = makeRes();
    const next = makeNext();
    requireSuperAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('requireCompanyContext', () => {

  test('expone req.pgEmpresaId y req.esSuperAdmin = false para usuario normal', () => {
    const req = makeReq({
      autenticado: true,
      usuario: { rol: 'admin', pgEmpresaId: 'emp-uuid-1', pgId: 'usr-uuid-1' }
    });
    const res  = makeRes();
    const next = makeNext();
    requireCompanyContext(req, res, next);
    expect(req.pgEmpresaId).toBe('emp-uuid-1');
    expect(req.esSuperAdmin).toBe(false);
    expect(req.pgId).toBe('usr-uuid-1');
    expect(next).toHaveBeenCalled();
  });

  test('expone req.esSuperAdmin = true para super_admin', () => {
    const req = makeReq({
      autenticado: true,
      usuario: { rol: 'super_admin', esSuperAdmin: true, pgEmpresaId: null, pgId: 'sa-uuid' }
    });
    const res  = makeRes();
    const next = makeNext();
    requireCompanyContext(req, res, next);
    expect(req.esSuperAdmin).toBe(true);
    expect(req.pgEmpresaId).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  test('expone req.empresaId como alias de pgEmpresaId', () => {
    const req = makeReq({
      autenticado: true,
      usuario: { rol: 'admin', pgEmpresaId: 'emp-uuid-2', pgId: 'usr-uuid-2' }
    });
    const res  = makeRes();
    const next = makeNext();
    requireCompanyContext(req, res, next);
    expect(req.empresaId).toBe('emp-uuid-2');
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('requireModulo', () => {

  test('super_admin siempre pasa independiente del módulo', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'super_admin', esSuperAdmin: true, modulosPermitidos: [] } });
    const res  = makeRes();
    const next = makeNext();
    requireModulo('nomina')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('usuario con módulo asignado pasa', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'usuario', modulosPermitidos: ['turnos', 'nomina'] } });
    const res  = makeRes();
    const next = makeNext();
    requireModulo('nomina')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('usuario sin el módulo requerido recibe 403', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'usuario', modulosPermitidos: ['turnos'] } });
    const res  = makeRes();
    const next = makeNext();
    requireModulo('nomina')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('modulosPermitidos vacío retorna 403', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'usuario', modulosPermitidos: [] } });
    const res  = makeRes();
    const next = makeNext();
    requireModulo('turnos')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('requirePermiso', () => {

  test('super_admin siempre pasa', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'super_admin', esSuperAdmin: true, permisosEfectivos: [] } });
    const res  = makeRes();
    const next = makeNext();
    requirePermiso('nomina.calcular')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('usuario con el permiso en sesión pasa', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'admin', permisosEfectivos: ['turnos.ver', 'nomina.calcular'] } });
    const res  = makeRes();
    const next = makeNext();
    requirePermiso('nomina.calcular')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('usuario sin el permiso recibe 403', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'admin', permisosEfectivos: ['turnos.ver'] } });
    const res  = makeRes();
    const next = makeNext();
    requirePermiso('nomina.calcular')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('permisosEfectivos undefined equivale a lista vacía → 403', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'usuario' } });
    const res  = makeRes();
    const next = makeNext();
    requirePermiso('areas.crear')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('requirePermisoStrict', () => {

  test('super_admin siempre pasa sin consultar BD', async () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'super_admin', esSuperAdmin: true, pgId: 'sa', pgEmpresaId: 'e1' } });
    const res  = makeRes();
    const next = makeNext();
    await requirePermisoStrict('nomina.calcular')(req, res, next);
    expect(permisosService.tienePermiso).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  test('retorna 403 si no hay empresa activa en sesión', async () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'admin', pgId: 'usr-1', pgEmpresaId: null } });
    const res  = makeRes();
    const next = makeNext();
    await requirePermisoStrict('nomina.calcular')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('consulta BD y pasa si tienePermiso retorna true', async () => {
    permisosService.tienePermiso.mockResolvedValue(true);
    const req  = makeReq({ autenticado: true, usuario: { rol: 'admin', pgId: 'usr-1', pgEmpresaId: 'emp-1' } });
    const res  = makeRes();
    const next = makeNext();
    await requirePermisoStrict('nomina.calcular')(req, res, next);
    expect(permisosService.tienePermiso).toHaveBeenCalledWith('usr-1', 'emp-1', 'nomina.calcular');
    expect(next).toHaveBeenCalled();
  });

  test('consulta BD y retorna 403 si tienePermiso retorna false', async () => {
    permisosService.tienePermiso.mockResolvedValue(false);
    const req  = makeReq({ autenticado: true, usuario: { rol: 'admin', pgId: 'usr-1', pgEmpresaId: 'emp-1' } });
    const res  = makeRes();
    const next = makeNext();
    await requirePermisoStrict('nomina.calcular')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 500 si tienePermiso lanza excepción', async () => {
    permisosService.tienePermiso.mockRejectedValue(new Error('DB error'));
    const req  = makeReq({ autenticado: true, usuario: { rol: 'admin', pgId: 'usr-1', pgEmpresaId: 'emp-1' } });
    const res  = makeRes();
    const next = makeNext();
    await requirePermisoStrict('nomina.calcular')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('requireArea', () => {

  test('super_admin siempre pasa', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'super_admin', esSuperAdmin: true, areasPermitidas: [] } });
    const res  = makeRes();
    const next = makeNext();
    requireArea('Producción')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('usuario con el área asignada pasa', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'usuario', areasPermitidas: ['Producción', 'Ventas'] } });
    const res  = makeRes();
    const next = makeNext();
    requireArea('Producción')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('usuario sin el área recibe 403', () => {
    const req  = makeReq({ autenticado: true, usuario: { rol: 'usuario', areasPermitidas: ['Ventas'] } });
    const res  = makeRes();
    const next = makeNext();
    requireArea('Producción')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
