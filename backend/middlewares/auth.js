/**
 * Middleware para verificar acceso a área específica
 */
function requireArea(area) {
  return (req, res, next) => {
    if (!req.session || !req.session.autenticado) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }
    const areasPermitidas = req.session.usuario.areasPermitidas || [];
    if (!areasPermitidas.includes(area)) {
      return res.status(403).json({
        success: false,
        error: `No tienes acceso al área de ${area}`
      });
    }
    next();
  };
}
/**
 * Middleware de autenticación
 * Verifica que el usuario esté autenticado antes de acceder a rutas protegidas
 */

function requireAuth(req, res, next) {
  console.log('🔐 Middleware requireAuth - URL:', req.url);
  console.log('🔐 Autenticado:', !!req.session?.autenticado);
  
  if (req.session && req.session.autenticado) {
    return next();
  }

  console.log('❌ Autenticación fallida');
  
  // Si la petición es AJAX/API, devolver JSON
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ 
      success: false,
      error: 'No autenticado',
      redirect: '/login.html'
    });
  }

  // Si es petición del navegador, redirigir
  res.redirect('/login.html');
}

/**
 * Middleware para verificar rol de administrador
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.autenticado) {
    return res.status(401).json({ 
      success: false,
      error: 'No autenticado'
    });
  }

  const rolesAdmin = ['admin', 'super_admin'];
  if (!rolesAdmin.includes(req.session.usuario.rol)) {
    return res.status(403).json({ 
      success: false,
      error: 'Acceso denegado: Se requiere rol de administrador'
    });
  }

  next();
}

/**
 * Middleware para verificar acceso a módulo específico
 */
function requireModulo(modulo) {
  return (req, res, next) => {
    console.log('📋 Middleware requireModulo - Módulo requerido:', modulo);
    console.log('📋 Usuario:', req.session?.usuario?.usuario);
    console.log('📋 Módulos permitidos:', req.session?.usuario?.modulosPermitidos);
    
    if (!req.session || !req.session.autenticado) {
      console.log('❌ No autenticado en requireModulo');
      return res.status(401).json({ 
        success: false,
        error: 'No autenticado'
      });
    }

    const modulosPermitidos = req.session.usuario.modulosPermitidos || [];
    
    if (!modulosPermitidos.includes(modulo)) {
      console.log('❌ No tiene acceso al módulo:', modulo);
      return res.status(403).json({ 
        success: false,
        error: `No tienes acceso al módulo de ${modulo}`
      });
    }

    console.log('✅ Acceso permitido al módulo:', modulo);
    next();
  };
}

/**
 * Middleware para verificar rol de super administrador global
 */
function requireSuperAdmin(req, res, next) {
  if (!req.session || !req.session.autenticado) {
    return res.status(401).json({ success: false, error: 'No autenticado' });
  }
  if (req.session.usuario.rol !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Se requiere rol super_admin' });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireModulo,
  requireArea,
  requireSuperAdmin
};
