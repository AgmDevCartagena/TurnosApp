/**
 * Tests unitarios: Middleware tenant.js
 */

const { requireTenant, buildEmpresaFilter, validarPropiedadEmpresa } = require('../../middlewares/tenant');

describe('requireTenant middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { session: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('debe retornar 401 si no hay sesión', () => {
    req.session = null;
    requireTenant(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('debe retornar 401 si no hay usuario en sesión', () => {
    req.session = {};
    requireTenant(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('super_admin: debe setear empresaId=null y esSuperAdmin=true', () => {
    req.session.usuario = { rol: 'super_admin' };
    requireTenant(req, res, next);
    expect(req.empresaId).toBeNull();
    expect(req.esSuperAdmin).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  test('admin sin empresaId: debe retornar 403', () => {
    req.session.usuario = { rol: 'admin', empresaId: null };
    requireTenant(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('admin con empresaId: debe setear req.empresaId correctamente', () => {
    const empresaId = '507f1f77bcf86cd799439011';
    req.session.usuario = { rol: 'admin', empresaId };
    requireTenant(req, res, next);
    expect(req.empresaId).toBe(empresaId);
    expect(req.esSuperAdmin).toBe(false);
    expect(next).toHaveBeenCalled();
  });

  test('usuario con empresaId: debe pasar correctamente', () => {
    const empresaId = '507f1f77bcf86cd799439012';
    req.session.usuario = { rol: 'usuario', empresaId };
    requireTenant(req, res, next);
    expect(req.empresaId).toBe(empresaId);
    expect(next).toHaveBeenCalled();
  });
});

describe('buildEmpresaFilter', () => {
  test('super_admin retorna filtro vacío', () => {
    const req = { esSuperAdmin: true, empresaId: null };
    expect(buildEmpresaFilter(req)).toEqual({});
  });

  test('usuario con empresaId retorna filtro con empresaId', () => {
    const empresaId = '507f1f77bcf86cd799439011';
    const req = { esSuperAdmin: false, empresaId };
    expect(buildEmpresaFilter(req)).toEqual({ empresaId });
  });

  test('empresaId null sin super_admin retorna filtro vacío', () => {
    const req = { esSuperAdmin: false, empresaId: null };
    expect(buildEmpresaFilter(req)).toEqual({});
  });
});

describe('validarPropiedadEmpresa', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('retorna false y 404 si recurso es null', () => {
    const req = { esSuperAdmin: false };
    const resultado = validarPropiedadEmpresa(req, null, res);
    expect(resultado).toBe(false);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('super_admin siempre puede acceder a cualquier recurso', () => {
    const req = { esSuperAdmin: true };
    const recurso = { empresaId: { toString: () => 'empresa-x' } };
    const resultado = validarPropiedadEmpresa(req, recurso, res);
    expect(resultado).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('usuario puede acceder a recurso de su empresa', () => {
    const id = '507f1f77bcf86cd799439011';
    const req = { esSuperAdmin: false, empresaId: id };
    const recurso = { empresaId: { toString: () => id } };
    const resultado = validarPropiedadEmpresa(req, recurso, res);
    expect(resultado).toBe(true);
  });

  test('usuario NO puede acceder a recurso de otra empresa', () => {
    const req = { esSuperAdmin: false, empresaId: 'empresa-a' };
    const recurso = { empresaId: { toString: () => 'empresa-b' } };
    const resultado = validarPropiedadEmpresa(req, recurso, res);
    expect(resultado).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
