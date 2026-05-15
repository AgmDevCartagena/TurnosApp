/**
 * Middleware de aislamiento multiempresa (tenant)
 * 
 * Extrae empresaId del usuario autenticado en la sesión
 * y lo inyecta en req.empresaId para que controladores
 * y servicios lo usen para filtrar consultas.
 *
 * Reglas:
 * - super_admin: req.empresaId = null (acceso a todo)
 * - resto de roles: req.empresaId = usuario.empresaId (solo su empresa)
 * - usuario sin empresa asignada: 403 (bloqueo explícito)
 */

function requireTenant(req, res, next) {
  const usuario = req.session && req.session.usuario;

  if (!usuario) {
    return res.status(401).json({ success: false, error: 'No autenticado' });
  }

  if (usuario.rol === 'super_admin') {
    req.empresaId = null;
    req.esSuperAdmin = true;
    return next();
  }

  if (!usuario.empresaId) {
    return res.status(403).json({
      success: false,
      error: 'Tu usuario no tiene empresa asignada. Contacta al administrador.'
    });
  }

  req.empresaId = usuario.empresaId;
  req.esSuperAdmin = false;
  next();
}

/**
 * Construye el filtro de empresa para queries de Mongoose.
 * Super admin no filtra (devuelve {}), el resto filtra por empresaId.
 * 
 * @param {Request} req
 * @returns {Object} filtro mongoose
 */
function buildEmpresaFilter(req) {
  if (req.esSuperAdmin || !req.empresaId) return {};
  return { empresaId: req.empresaId };
}

/**
 * Valida que un recurso pertenece a la empresa del usuario.
 * Si el recurso tiene empresaId diferente al del usuario (y no es super_admin), devuelve 403.
 *
 * @param {Request} req
 * @param {Object|null} recurso - documento de Mongoose con .empresaId
 * @param {Response} res
 * @returns {boolean} true si el acceso está permitido
 */
function validarPropiedadEmpresa(req, recurso, res) {
  if (!recurso) {
    res.status(404).json({ success: false, error: 'Recurso no encontrado' });
    return false;
  }
  if (req.esSuperAdmin) return true;
  const recursoEmpresaId = recurso.empresaId ? recurso.empresaId.toString() : null;
  const usuarioEmpresaId = req.empresaId ? req.empresaId.toString() : null;
  if (recursoEmpresaId !== usuarioEmpresaId) {
    res.status(403).json({ success: false, error: 'Acceso denegado a recurso de otra empresa' });
    return false;
  }
  return true;
}

module.exports = { requireTenant, buildEmpresaFilter, validarPropiedadEmpresa };
