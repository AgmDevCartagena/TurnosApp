'use strict';

const permisosService = require('../services/permisosService');

// ─── Helper interno ────────────────────────────────────────────────────────────
function _noAuth(res, msg = 'No autenticado') {
  return res.status(401).json({ success: false, error: msg, redirect: '/login.html' });
}
function _forbidden(res, msg = 'Acceso denegado') {
  return res.status(403).json({ success: false, error: msg });
}

// ─── 1. AuthGuard ─────────────────────────────────────────────────────────────
/**
 * Verifica sesión activa. Redirige a login.html si es petición de navegador.
 */
function requireAuth(req, res, next) {
  if (req.session?.autenticado) return next();
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return _noAuth(res);
  }
  res.redirect('/login.html');
}

// ─── 2. requireAdmin ──────────────────────────────────────────────────────────
/**
 * Requiere rol admin o super_admin (global).
 */
function requireAdmin(req, res, next) {
  if (!req.session?.autenticado) return _noAuth(res);
  const rol = req.session.usuario.rol;
  if (!['admin', 'super_admin'].includes(rol)) {
    return _forbidden(res, 'Se requiere rol de administrador');
  }
  next();
}

// ─── 3. requireSuperAdmin ─────────────────────────────────────────────────────
function requireSuperAdmin(req, res, next) {
  if (!req.session?.autenticado) return _noAuth(res);
  if (req.session.usuario.rol !== 'super_admin') {
    return _forbidden(res, 'Se requiere rol super_admin');
  }
  next();
}

// ─── 4. CompanyContextGuard ───────────────────────────────────────────────────
/**
 * Valida que la sesión tenga empresa activa y que siga activa en BD.
 * super_admin sin empresa no es bloqueado (puede operar globalmente).
 * Expone: req.esSuperAdmin, req.pgEmpresaId
 */
function requireCompanyContext(req, res, next) {
  if (!req.session?.autenticado) return _noAuth(res);
  const s = req.session.usuario;
  req.esSuperAdmin = s.esSuperAdmin || s.rol === 'super_admin';
  req.pgEmpresaId  = s.pgEmpresaId || null;
  req.pgId         = s.pgId || s.id || null;
  req.empresaId    = s.pgEmpresaId || null; // alias para turnoController legacy
  next();
}

// ─── 5. requireModulo ─────────────────────────────────────────────────────────
/**
 * Verifica que el módulo esté en la lista de módulos permitidos de la sesión.
 * super_admin siempre pasa.
 */
function requireModulo(modulo) {
  return (req, res, next) => {
    if (!req.session?.autenticado) return _noAuth(res);
    const s = req.session.usuario;
    if (s.esSuperAdmin || s.rol === 'super_admin') return next();
    const permitidos = s.modulosPermitidos || [];
    if (!permitidos.includes(modulo)) {
      return _forbidden(res, `No tienes acceso al módulo de ${modulo}`);
    }
    next();
  };
}

// ─── 6. PermissionGuard ───────────────────────────────────────────────────────
/**
 * Verifica permiso granular contra la sesión (no consulta BD por performance).
 * Para validación estricta usa requirePermisoStrict.
 * super_admin siempre pasa.
 */
function requirePermiso(codigoPermiso) {
  return (req, res, next) => {
    if (!req.session?.autenticado) return _noAuth(res);
    const s = req.session.usuario;
    if (s.esSuperAdmin || s.rol === 'super_admin') return next();
    const permisos = s.permisosEfectivos || [];
    if (!permisos.includes(codigoPermiso)) {
      return _forbidden(res, `No tienes permiso: ${codigoPermiso}`);
    }
    next();
  };
}

/**
 * Versión estricta: recalcula permisos desde BD (más lento, para operaciones críticas).
 * super_admin siempre pasa.
 */
function requirePermisoStrict(codigoPermiso) {
  return async (req, res, next) => {
    if (!req.session?.autenticado) return _noAuth(res);
    const s = req.session.usuario;
    if (s.esSuperAdmin || s.rol === 'super_admin') return next();
    if (!s.pgId || !s.pgEmpresaId) return _forbidden(res, 'Sin empresa activa en sesión');
    try {
      const tiene = await permisosService.tienePermiso(s.pgId, s.pgEmpresaId, codigoPermiso);
      if (!tiene) return _forbidden(res, `No tienes permiso: ${codigoPermiso}`);
      next();
    } catch (err) {
      console.error('Error en requirePermisoStrict:', err);
      res.status(500).json({ success: false, error: 'Error validando permisos' });
    }
  };
}

// ─── 7. requireArea (legacy + nuevo) ─────────────────────────────────────────
/**
 * Verifica acceso a área por nombre (legacy) o por ID.
 */
function requireArea(area) {
  return (req, res, next) => {
    if (!req.session?.autenticado) return _noAuth(res);
    const s = req.session.usuario;
    if (s.esSuperAdmin || s.rol === 'super_admin') return next();
    const areas = s.areasPermitidas || [];
    if (!areas.includes(area)) {
      return _forbidden(res, `No tienes acceso al área de ${area}`);
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requireCompanyContext,
  requireModulo,
  requirePermiso,
  requirePermisoStrict,
  requireArea,
};
