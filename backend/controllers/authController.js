'use strict';

const bcrypt          = require('bcryptjs');
const prisma          = require('../lib/prisma');
const permisosService = require('../services/permisosService');
// MongoDB — solo para turnoController legacy (NO para autenticación)
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');

// ─── Helper: ordenamiento de usuarios (fix #32) ────────────────────────────────
const _SORT_WHITELIST = new Set(['nombre', 'username', 'correo', 'rol', 'activo', 'createdAt']);

function _validarSortBy(campo) {
  return _SORT_WHITELIST.has(campo) ? campo : 'nombre';
}
exports._validarSortBy = _validarSortBy;

// ─── Helper: construir sesión base ────────────────────────────────────────────
function _buildSession(pgUser, empresaId, ctx) {
  return {
    pgId:              pgUser.id,
    id:                pgUser.id,
    username:          pgUser.username,
    nombre:            pgUser.nombre,
    correo:            pgUser.correo || null,
    rol:               pgUser.rol,
    activo:            pgUser.activo,
    pgEmpresaId:       empresaId || null,
    nombreEmpresa:     ctx?.empresa?.nombre   || null,
    logoUrl:           ctx?.empresa?.logoUrl  || null,
    colorTema:         ctx?.empresa?.colorTema || '#667eea',
    rolEmpresa:        ctx?.rol?.codigo        || null,
    modulosPermitidos: pgUser.rol === 'super_admin'
      ? ['turnos', 'nomina', 'usuarios', 'parametros', 'reportes', 'empresas', 'areas', 'transporte', 'ia']
      : (ctx?.modulosActivos || []),
    areasPermitidas:   (ctx?.areasPermitidas   || []).map(a => a.nombre),
    areasPermitidasIds:(ctx?.areasPermitidas   || []).map(a => a.id),
    permisosEfectivos: ctx?.permisosEfectivos  || [],
    esSuperAdmin:      pgUser.rol === 'super_admin',
  };
}

/**
 * POST /api/auth/login
 * Autentica contra PostgreSQL. Soporta usuarios con una o varias empresas.
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Usuario y contraseña son requeridos' });
    }

    // ── Fuente de verdad: PostgreSQL ──────────────────────────────────────────
    const pgUser = await prisma.usuario.findUnique({
      where: { username: username.toLowerCase().trim() }
    });

    if (!pgUser || !pgUser.activo) {
      // Fallback a MongoDB para usuarios legacy no migrados aún
      return await _loginMongoDB(req, res, username, password);
    }

    const passwordValida = await bcrypt.compare(password, pgUser.passwordHash);
    if (!passwordValida) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
    }

    await prisma.usuario.update({ where: { id: pgUser.id }, data: { ultimoAcceso: new Date() } });

    // ── Obtener empresas asignadas ─────────────────────────────────────────────
    const empresasAsignadas = await permisosService.listarEmpresasDeUsuario(pgUser.id);

    // super_admin: sin restricción de empresa
    if (pgUser.rol === 'super_admin') {
      const sesionData = _buildSession(pgUser, pgUser.empresaId, null);
      req.session.usuario   = sesionData;
      req.session.autenticado = true;
      return res.json({
        success: true,
        usuario: { ...sesionData, empresasAsignadas, requiereSeleccionEmpresa: false }
      });
    }

    // Usuario sin UsuarioEmpresa — intentar fallback con empresaId legacy en Usuario
    if (empresasAsignadas.length === 0) {
      if (pgUser.empresaId) {
        const empresa = await prisma.empresa.findUnique({ where: { id: pgUser.empresaId } });
        if (empresa && empresa.estado === 'activa') {
          const [userMods, userAreas] = await Promise.all([
            prisma.usuarioModulo.findMany({ where: { usuarioId: pgUser.id } }),
            prisma.usuarioArea.findMany({
              where: { usuarioId: pgUser.id },
              include: { area: { select: { id: true, nombre: true } } }
            })
          ]);
          const ctxLegacy = {
            empresa,
            rol: null,
            modulosActivos:   userMods.map(m => m.modulo),
            areasPermitidas:  userAreas.map(ua => ({ id: ua.areaId, nombre: ua.area.nombre })),
            permisosEfectivos: []
          };
          const sesionData = _buildSession(pgUser, pgUser.empresaId, ctxLegacy);
          req.session.usuario     = sesionData;
          req.session.autenticado = true;
          return res.json({
            success: true,
            usuario: { ...sesionData, empresasAsignadas: [], requiereSeleccionEmpresa: false }
          });
        }
      }
      return res.status(403).json({
        success: false,
        error: 'Su usuario no tiene empresas activas asignadas. Contacte al administrador.'
      });
    }

    // Si tiene exactamente una empresa → auto-seleccionar
    let empresaActiva = empresasAsignadas.find(e => e.esDefault) || empresasAsignadas[0];
    const ctx = await permisosService.obtenerContextoEmpresa(pgUser.id, empresaActiva.id);

    const sesionData = _buildSession(pgUser, empresaActiva.id, ctx);
    req.session.usuario   = sesionData;
    req.session.autenticado = true;

    res.json({
      success: true,
      usuario: {
        ...sesionData,
        empresasAsignadas,
        requiereSeleccionEmpresa: empresasAsignadas.length > 1
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, error: 'Error al iniciar sesión' });
  }
};

/**
 * Fallback MongoDB para usuarios legacy aún no migrados a PostgreSQL.
 * @private
 */
async function _loginMongoDB(req, res, username, password) {
  try {
    const usuario = await Usuario.findOne({ username: username.toLowerCase().trim(), activo: true });
    if (!usuario) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
    }
    const passwordValida = await usuario.comparePassword(password);
    if (!passwordValida) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
    }

    let empresa = null;
    if (usuario.rol !== 'super_admin' && usuario.empresaId) {
      empresa = await Empresa.findById(usuario.empresaId);
      if (!empresa || empresa.estado === 'inactiva') {
        return res.status(403).json({
          success: false,
          error: 'La empresa asignada está inactiva o no existe. Contacta al administrador.'
        });
      }
    }
    usuario.ultimoAcceso = new Date();
    await usuario.save();

    // Try to enrich session with PostgreSQL empresa data (logoUrl + current modules)
    let pgEmpresaId = null;
    let logoUrl = null;
    let modulosPermitidos = usuario.modulosPermitidos || [];
    if (empresa) {
      try {
        const pgEmpresa = await prisma.empresa.findFirst({
          where: { nombre: empresa.nombre },
          select: { id: true, logoUrl: true }
        });
        if (pgEmpresa) {
          pgEmpresaId = pgEmpresa.id;
          logoUrl = pgEmpresa.logoUrl || null;
          const empresaMods = await prisma.empresaModulo.findMany({
            where:   { empresaId: pgEmpresa.id, habilitado: true },
            include: { modulo: { select: { codigo: true } } }
          });
          if (empresaMods.length > 0) {
            const pgMods = empresaMods.map(m => m.modulo.codigo);
            // admin inherits all empresa modules + siempre gestión de usuarios/áreas
            modulosPermitidos = usuario.rol === 'admin'
              ? [...new Set([...pgMods, 'usuarios', 'areas'])]
              : pgMods.filter(m => (usuario.modulosPermitidos || []).includes(m));
          }
        }
      } catch (pgErr) {
        console.error('[_loginMongoDB] Error enriching from PG:', pgErr.message);
      }
    }

    req.session.usuario = {
      id: usuario._id.toString(),
      pgId: null,
      username: usuario.username,
      nombre: usuario.nombre,
      rol: usuario.rol,
      modulosPermitidos,
      areasPermitidas: usuario.areasPermitidas || [],
      areasPermitidasIds: [],
      permisosEfectivos: [],
      empresaId: usuario.empresaId?.toString() || null,
      pgEmpresaId,
      nombreEmpresa: empresa?.nombre || null,
      logoUrl,
      esSuperAdmin: usuario.rol === 'super_admin',
      _legacy: true
    };
    req.session.autenticado = true;

    return res.json({
      success: true,
      usuario: { ...req.session.usuario, empresasAsignadas: [], requiereSeleccionEmpresa: false }
    });
  } catch (err) {
    console.error('Error login MongoDB fallback:', err);
    return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
  }
}

/**
 * Logout de usuario
 */
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ success: false, error: 'Error al cerrar sesión' });
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Sesión cerrada' });
  });
};

/**
 * GET /api/auth/verificar-sesion
 */
exports.verificarSesion = async (req, res) => {
  if (req.session && req.session.autenticado) {
    const usuario = req.session.usuario;
    // For non-super_admin with a known empresa, refresh logo + modules from DB on every check
    if (usuario.pgEmpresaId && usuario.rol !== 'super_admin') {
      try {
        const [empresa, empresaMods] = await Promise.all([
          prisma.empresa.findUnique({
            where:  { id: usuario.pgEmpresaId },
            select: { logoUrl: true }
          }),
          prisma.empresaModulo.findMany({
            where:   { empresaId: usuario.pgEmpresaId, habilitado: true },
            include: { modulo: { select: { codigo: true } } }
          })
        ]);
        console.log('[verificarSesion] usuario:', usuario.username, '| pgEmpresaId:', usuario.pgEmpresaId, '| rol:', usuario.rol);
        console.log('[verificarSesion] logoUrl DB:', empresa?.logoUrl);
        console.log('[verificarSesion] empresaMods habilitados:', empresaMods?.map(m => m.modulo.codigo));
        if (empresa) {
          usuario.logoUrl = empresa.logoUrl || null;
          req.session.usuario.logoUrl = empresa.logoUrl || null;
        }
        if (empresaMods && empresaMods.length > 0) {
          const modCodes = empresaMods.map(m => m.modulo.codigo);
          if (usuario.rol === 'admin') {
            // Admin: use user-specific modules (EmpresaUsuarioModulo) as source of truth;
            // fall back to company-level only when none are configured at user level.
            let adminMods = modCodes;
            if (usuario.pgId) {
              const ue = await prisma.usuarioEmpresa.findUnique({
                where: { usuarioId_empresaId: { usuarioId: usuario.pgId, empresaId: usuario.pgEmpresaId } },
                include: { modulos: { where: { activo: true }, include: { modulo: { select: { codigo: true } } } } }
              });
              if (ue?.modulos?.length > 0) {
                adminMods = ue.modulos.map(m => m.modulo.codigo);
              }
            }
            usuario.modulosPermitidos = [...new Set(adminMods)];
            req.session.usuario.modulosPermitidos = usuario.modulosPermitidos;
          } else {
            // Other roles: keep only the intersection with empresa modules
            const modSet = new Set(modCodes);
            const filtrados = (usuario.modulosPermitidos || []).filter(m => modSet.has(m));
            usuario.modulosPermitidos = filtrados;
            req.session.usuario.modulosPermitidos = filtrados;
          }
        }
        console.log('[verificarSesion] modulosPermitidos final:', usuario.modulosPermitidos);

        // Refrescar permisosEfectivos desde BD para que nuevos permisos (ej. IA)
        // se propaguen automáticamente sin necesidad de hacer logout.
        if (usuario.pgId) {
          const ctx = await permisosService.obtenerContextoEmpresa(usuario.pgId, usuario.pgEmpresaId);
          if (ctx) {
            usuario.permisosEfectivos          = ctx.permisosEfectivos;
            req.session.usuario.permisosEfectivos = ctx.permisosEfectivos;
          }
        }
      } catch (err) {
        console.error('[verificarSesion] ERROR al refrescar datos de empresa:', err.message);
      }
    } else {
      console.log('[verificarSesion] SIN refresh — pgEmpresaId:', usuario.pgEmpresaId, '| rol:', usuario.rol);
    }
    res.json({ success: true, autenticado: true, usuario });
  } else {
    res.json({ success: true, autenticado: false });
  }
};

/**
 * GET /api/auth/me
 * Retorna perfil completo con contexto de empresa activa.
 */
exports.me = async (req, res) => {
  try {
    if (!req.session?.autenticado) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }
    const sesion = req.session.usuario;

    // Empresas asignadas (para mostrar selector)
    let empresasAsignadas = [];
    if (sesion.pgId) {
      empresasAsignadas = await permisosService.listarEmpresasDeUsuario(sesion.pgId);
    }

    res.json({
      success: true,
      usuario: {
        ...sesion,
        empresasAsignadas,
        requiereSeleccionEmpresa: empresasAsignadas.length > 1
      }
    });
  } catch (error) {
    console.error('Error en /me:', error);
    res.status(500).json({ success: false, error: 'Error al obtener perfil' });
  }
};

/**
 * POST /api/auth/switch-company
 * Cambia la empresa activa en sesión y recalcula permisos.
 * Body: { empresaId: string }
 */
exports.switchCompany = async (req, res) => {
  try {
    if (!req.session?.autenticado) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }
    const sesion   = req.session.usuario;
    const { empresaId } = req.body;

    if (!empresaId) {
      return res.status(400).json({ success: false, error: 'empresaId es requerido' });
    }

    // super_admin puede cambiar a cualquier empresa activa
    if (sesion.esSuperAdmin) {
      const empresa = await prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { id: true, nombre: true, estado: true, logoUrl: true, colorTema: true }
      });
      if (!empresa || empresa.estado !== 'activa') {
        return res.status(404).json({ success: false, error: 'Empresa no encontrada o inactiva' });
      }
      req.session.usuario = {
        ...sesion,
        pgEmpresaId:   empresa.id,
        nombreEmpresa: empresa.nombre,
        logoUrl:       empresa.logoUrl || null,
        colorTema:     empresa.colorTema,
      };
      req.session.autenticado = true;
      return res.json({
        success: true,
        usuario: req.session.usuario,
        empresasAsignadas: await permisosService.listarEmpresasDeUsuario(sesion.pgId)
      });
    }

    // Usuario normal: validar que la empresa esté asignada
    if (!sesion.pgId) {
      return res.status(403).json({ success: false, error: 'No se puede cambiar empresa en cuenta legacy' });
    }

    const ctx = await permisosService.obtenerContextoEmpresa(sesion.pgId, empresaId);
    if (!ctx) {
      return res.status(403).json({
        success: false,
        error: 'No tiene acceso a esa empresa o está inactiva'
      });
    }

    const pgUser = await prisma.usuario.findUnique({ where: { id: sesion.pgId } });
    const nuevaSesion = _buildSession(pgUser, empresaId, ctx);
    req.session.usuario   = nuevaSesion;
    req.session.autenticado = true;

    const empresasAsignadas = await permisosService.listarEmpresasDeUsuario(sesion.pgId);

    res.json({
      success: true,
      usuario: { ...nuevaSesion, empresasAsignadas, requiereSeleccionEmpresa: false }
    });
  } catch (error) {
    console.error('Error en switch-company:', error);
    res.status(500).json({ success: false, error: 'Error al cambiar empresa' });
  }
};

/**
 * Crear usuario (admin o super_admin)
 * Soporta payload multiempresa: { ..., empresas: [{ empresaId, rolId, modulos?, areas?, permisos? }] }
 * Mantiene compatibilidad con payload legacy: { ..., empresaId, modulosPermitidos, areasPermitidas }
 */
exports.crearUsuario = async (req, res) => {
  try {
    const sesion = req.session.usuario;
    if (!sesion || !['admin', 'super_admin'].includes(sesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para crear usuarios' });
    }

    const { username, password, nombre, correo, rol, empresas, modulosPermitidos, areasPermitidas, empresaId } = req.body;
    if (!username || !password || !nombre) {
      return res.status(400).json({ success: false, error: 'Datos incompletos: username, password y nombre son requeridos' });
    }

    const usernameNorm = username.toLowerCase().trim();
    const existe = await prisma.usuario.findUnique({ where: { username: usernameNorm } });
    if (existe) return res.status(400).json({ success: false, error: 'El usuario ya existe' });

    const passwordHash = await bcrypt.hash(password, 12);
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // ── Determinar empresa legacy para backward compat ──────────────────────
    const pgEmpresaIdLegacy = sesion.rol === 'super_admin'
      ? (empresaId || (empresas?.[0]?.empresaId) || null)
      : (sesion.pgEmpresaId || null);

    // ── Crear usuario base ──────────────────────────────────────────────────
    const pgUser = await prisma.usuario.create({
      data: {
        username:     usernameNorm,
        passwordHash,
        nombre,
        correo:       correo || null,
        rol:          rol || 'usuario',
        empresaId:    pgEmpresaIdLegacy,
        activo:       true,
        modulosPermitidos: {
          create: (modulosPermitidos || ['turnos', 'nomina']).map(m => ({ modulo: m }))
        }
      }
    });

    // ── Asignar empresas multiempresa (nuevo modelo) ────────────────────────
    const empresasPayload = empresas && empresas.length > 0
      ? empresas
      : (pgEmpresaIdLegacy ? [{ empresaId: pgEmpresaIdLegacy, rolId: null, modulos: modulosPermitidos || [], areas: areasPermitidas || [], permisos: [] }] : []);

    for (const cfg of empresasPayload) {
      const { empresaId: eId, rolId, modulos = [], areas = [], permisos = [] } = cfg;
      if (!eId || !UUID_RE.test(eId)) continue;
      if (!rolId || !UUID_RE.test(rolId)) continue;

      const ue = await prisma.usuarioEmpresa.create({
        data: { usuarioId: pgUser.id, empresaId: eId, rolId, estado: 'activo' }
      });

      if (modulos.length > 0) {
        const modsDb = await prisma.modulo.findMany({ where: { codigo: { in: modulos } } });
        await prisma.usuarioEmpresaModulo.createMany({
          data: modsDb.map(m => ({ usuarioEmpresaId: ue.id, moduloId: m.id })),
          skipDuplicates: true
        });
      }

      if (areas.length > 0) {
        const areasDb = await prisma.area.findMany({ where: { id: { in: areas }, empresaId: eId } });
        await prisma.usuarioEmpresaArea.createMany({
          data: areasDb.map(a => ({ usuarioEmpresaId: ue.id, areaId: a.id })),
          skipDuplicates: true
        });
      }

      if (permisos.length > 0) {
        const permsDb = await prisma.permiso.findMany({ where: { codigo: { in: permisos } } });
        await prisma.usuarioEmpresaPermiso.createMany({
          data: permsDb.map(p => ({ usuarioEmpresaId: ue.id, permisoId: p.id, permitido: true })),
          skipDuplicates: true
        });
      }
    }

    // ── Sync MongoDB legacy ─────────────────────────────────────────────────
    try {
      const pgEmpresa = pgEmpresaIdLegacy
        ? await prisma.empresa.findUnique({ where: { id: pgEmpresaIdLegacy }, select: { nit: true, nombre: true } })
        : null;
      const mongoEmpresa = pgEmpresa
        ? await Empresa.findOne({ $or: [{ nit: pgEmpresa.nit }, { nombre: pgEmpresa.nombre }] })
        : null;
      await Usuario.create({
        username: usernameNorm, password: passwordHash, nombre,
        rol: rol || 'usuario',
        modulosPermitidos: modulosPermitidos || ['turnos', 'nomina'],
        areasPermitidas: (areasPermitidas || []).map(a => (typeof a === 'string' ? a : a.nombre)).filter(Boolean),
        empresaId: mongoEmpresa?._id || null,
        activo: true
      });
    } catch (syncErr) {
      console.warn('⚠️ Sync MongoDB fallida (no crítico):', syncErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      usuario: { id: pgUser.id, username: pgUser.username, nombre: pgUser.nombre, rol: pgUser.rol }
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'El usuario ya existe' });
    }
    res.status(500).json({ success: false, error: 'Error al crear usuario' });
  }
};

/**
 * Listar usuarios — admin solo ve su empresa; super_admin ve todos
 */
exports.listarUsuarios = async (req, res) => {
  try {
    const sesion = req.session.usuario;
    if (!sesion || !['admin', 'super_admin'].includes(sesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para ver usuarios' });
    }

    if (sesion.rol !== 'super_admin' && !sesion.pgEmpresaId) {
      return res.status(403).json({ success: false, error: 'Sin empresa asignada' });
    }

    const where = {};
    if (sesion.rol !== 'super_admin') {
      where.empresaId = sesion.pgEmpresaId;
    }

    const sortField = _validarSortBy(req.query.sortBy || 'nombre');
    const sortOrder = req.query.order === 'desc' ? 'desc' : 'asc';

    const usuarios = await prisma.usuario.findMany({
      where,
      select: {
        id: true, username: true, nombre: true, correo: true, rol: true,
        activo: true, ultimoAcceso: true, createdAt: true,
        empresaId: true,
        empresa:  { select: { nombre: true } },
        modulosPermitidos: true,
        areas: { include: { area: { select: { nombre: true } } } },
        empresas: {
          include: {
            empresa: { select: { id: true, nombre: true } },
            rol:     { select: { id: true, codigo: true, nombre: true } },
            modulos: { include: { modulo: { select: { codigo: true } } } },
            areas:   { include: { area:   { select: { id: true, nombre: true } } } },
            permisos:{ include: { permiso:{ select: { codigo: true } } } }
          }
        }
      },
      orderBy: [{ [sortField]: sortOrder }, { username: 'asc' }]
    });

    const resultado = usuarios.map(u => ({
      ...u,
      modulosPermitidos: u.modulosPermitidos.map(m => m.modulo),
      areasPermitidas:   u.areas.map(ua => ua.area.nombre),
      nombreEmpresa:     u.empresa?.nombre || null,
      empresasAsignadas: u.empresas.map(ue => ({
        empresaId:   ue.empresa.id,
        empresaNombre: ue.empresa.nombre,
        rolId:       ue.rol.id,
        rolCodigo:   ue.rol.codigo,
        rolNombre:   ue.rol.nombre,
        modulos:     ue.modulos.map(m => m.modulo.codigo),
        areas:       ue.areas.map(a => ({ id: a.area.id, nombre: a.area.nombre })),
        permisos:    ue.permisos.map(p => p.permiso.codigo)
      }))
    }));

    res.json({ success: true, usuarios: resultado });
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ success: false, error: 'Error al listar usuarios' });
  }
};

/**
 * Editar usuario (admin o super_admin) — id = PostgreSQL UUID
 */
exports.editarUsuario = async (req, res) => {
  try {
    const sesion = req.session.usuario;
    if (!sesion || !['admin', 'super_admin'].includes(sesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para editar usuarios' });
    }
    const { id } = req.params;
    const { nombre, username, correo, rol, activo, modulosPermitidos, areasPermitidas, empresas } = req.body;

    const pgUser = await prisma.usuario.findUnique({ where: { id } });
    if (!pgUser) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

    // Validar aislamiento de empresa (admin solo edita usuarios de su empresa)
    if (sesion.rol !== 'super_admin') {
      const tieneAcceso = pgUser.empresaId === sesion.pgEmpresaId
        || (await prisma.usuarioEmpresa.findUnique({
              where: { usuarioId_empresaId: { usuarioId: id, empresaId: sesion.pgEmpresaId || '' } }
           })) !== null;
      if (!tieneAcceso) {
        return res.status(403).json({ success: false, error: 'No puedes editar usuarios de otra empresa' });
      }
    }

    const data = {};
    if (nombre   !== undefined) data.nombre   = nombre;
    if (correo   !== undefined) data.correo   = correo || null;
    if (username !== undefined) data.username = username.toLowerCase().trim();
    if (rol      !== undefined) data.rol      = rol;
    if (activo   !== undefined) data.activo   = activo === true || activo === 'true';

    // Reemplazar módulos legacy si se proveen
    if (modulosPermitidos !== undefined) {
      await prisma.usuarioModulo.deleteMany({ where: { usuarioId: id } });
      data.modulosPermitidos = {
        create: modulosPermitidos.map(m => ({ modulo: m }))
      };
    }

    // Reemplazar áreas legacy si se proveen (sin contexto multiempresa)
    if (areasPermitidas !== undefined && (!empresas || empresas.length === 0)) {
      const areasNorm = (areasPermitidas || []).map(a => a.toUpperCase().trim()).filter(Boolean);
      await prisma.usuarioArea.deleteMany({ where: { usuarioId: id } });
      if (areasNorm.length > 0 && pgUser.empresaId) {
        const areasPg = await prisma.area.findMany({
          where: { empresaId: pgUser.empresaId, nombre: { in: areasNorm } }
        });
        data.areas = { create: areasPg.map(a => ({ areaId: a.id })) };
      }
    }

    const actualizado = await prisma.usuario.update({ where: { id }, data });

    // ── Sync MongoDB ──────────────────────────────────────────────────────────
    try {
      const mongoUpdate = {};
      if (nombre   !== undefined) mongoUpdate.nombre   = nombre;
      if (username !== undefined) mongoUpdate.username = username.toLowerCase().trim();
      if (rol      !== undefined) mongoUpdate.rol      = rol;
      if (activo   !== undefined) mongoUpdate.activo   = data.activo;
      if (modulosPermitidos !== undefined) mongoUpdate.modulosPermitidos = modulosPermitidos;
      await Usuario.findOneAndUpdate({ username: pgUser.username }, mongoUpdate);
    } catch (syncErr) {
      console.warn('⚠️ Sync MongoDB editarUsuario fallida:', syncErr.message);
    }

    res.json({ success: true, usuario: actualizado });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    res.status(500).json({ success: false, error: 'Error al editar usuario' });
  }
};

/**
 * Cambiar contraseña de usuario (admin o super_admin) — id = PostgreSQL UUID
 */
exports.cambiarContrasena = async (req, res) => {
  try {
    const sesion = req.session.usuario;
    if (!sesion || !['admin', 'super_admin'].includes(sesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para cambiar contraseñas' });
    }
    const { id } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, error: 'Contraseña requerida' });

    const pgUser = await prisma.usuario.findUnique({ where: { id } });
    if (!pgUser) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

    if (sesion.rol !== 'super_admin' && pgUser.empresaId !== sesion.pgEmpresaId) {
      return res.status(403).json({ success: false, error: 'No puedes cambiar contraseña de usuario de otra empresa' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.usuario.update({ where: { id }, data: { passwordHash } });

    // Sync MongoDB
    try {
      await Usuario.findOneAndUpdate({ username: pgUser.username }, { password: passwordHash });
    } catch (syncErr) {
      console.warn('⚠️ Sync MongoDB cambiarContrasena fallida:', syncErr.message);
    }

    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    res.status(500).json({ success: false, error: 'Error al cambiar contraseña' });
  }
};

/**
 * Cambiar contraseña propia (usuario logueado)
 */
exports.cambiarMiContrasena = async (req, res) => {
  try {
    if (!req.session.usuario) {
      return res.status(401).json({ success: false, error: 'No has iniciado sesión' });
    }
    const { passwordActual, passwordNueva, confirmarPassword } = req.body;
    if (!passwordActual || !passwordNueva || !confirmarPassword) {
      return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
    }
    if (passwordNueva !== confirmarPassword) {
      return res.status(400).json({ success: false, error: 'Las contraseñas nuevas no coinciden' });
    }
    if (passwordNueva.length < 4) {
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 4 caracteres' });
    }

    const pgId = req.session.usuario.pgId;
    if (!pgId) return res.status(404).json({ success: false, error: 'Usuario no encontrado en PostgreSQL' });

    const pgUser = await prisma.usuario.findUnique({ where: { id: pgId } });
    if (!pgUser) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

    const passwordValida = await bcrypt.compare(passwordActual, pgUser.passwordHash);
    if (!passwordValida) {
      return res.status(401).json({ success: false, error: 'La contraseña actual es incorrecta' });
    }

    const nuevoHash = await bcrypt.hash(passwordNueva, 12);
    await prisma.usuario.update({ where: { id: pgId }, data: { passwordHash: nuevoHash } });

    // Sync MongoDB
    try {
      await Usuario.findOneAndUpdate({ username: pgUser.username }, { password: nuevoHash });
    } catch (syncErr) {
      console.warn('⚠️ Sync MongoDB cambiarMiContrasena fallida:', syncErr.message);
    }

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ success: false, error: 'Error al cambiar contraseña' });
  }
};

/**
 * PATCH /api/auth/usuarios/:id/estado
 * Activa o inactiva un usuario.
 */
exports.toggleEstadoUsuario = async (req, res) => {
  try {
    const sesion = req.session.usuario;
    if (!sesion || !['admin', 'super_admin'].includes(sesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos' });
    }
    const { id } = req.params;
    const pgUser = await prisma.usuario.findUnique({ where: { id } });
    if (!pgUser) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    if (sesion.rol !== 'super_admin' && pgUser.empresaId !== sesion.pgEmpresaId) {
      return res.status(403).json({ success: false, error: 'No puedes modificar usuarios de otra empresa' });
    }
    const actualizado = await prisma.usuario.update({
      where: { id },
      data:  { activo: !pgUser.activo }
    });
    try {
      await Usuario.findOneAndUpdate({ username: pgUser.username }, { activo: actualizado.activo });
    } catch (_) {}
    res.json({ success: true, activo: actualizado.activo });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al cambiar estado' });
  }
};

/**
 * PUT /api/auth/usuarios/:id/empresas
 * Reemplaza las empresas asignadas al usuario (multiempresa).
 * Body: { empresas: [{ empresaId, rolId, modulos?, areas?, permisos? }] }
 */
exports.actualizarEmpresasUsuario = async (req, res) => {
  try {
    const sesion = req.session.usuario;
    if (!sesion || !['admin', 'super_admin'].includes(sesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos' });
    }
    const { id } = req.params;
    const { empresas } = req.body;

    if (!Array.isArray(empresas) || empresas.length === 0) {
      return res.status(400).json({ success: false, error: 'Debe asignar al menos una empresa' });
    }

    const pgUser = await prisma.usuario.findUnique({ where: { id } });
    if (!pgUser) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    await prisma.$transaction(async (tx) => {
      for (const cfg of empresas) {
        const { empresaId, rolId, modulos = [], areas = [], permisos = [] } = cfg;
        if (!UUID_RE.test(empresaId)) throw new Error(`empresaId inválido: ${empresaId}`);
        if (!UUID_RE.test(rolId))     throw new Error(`rolId inválido para empresa ${empresaId}`);

        // Validar empresa activa
        const emp = await tx.empresa.findUnique({ where: { id: empresaId } });
        if (!emp || emp.estado !== 'activa') throw new Error(`Empresa ${empresaId} inactiva o inexistente`);

        // Upsert UsuarioEmpresa
        const ue = await tx.usuarioEmpresa.upsert({
          where:  { usuarioId_empresaId: { usuarioId: id, empresaId } },
          update: { rolId, estado: 'activo', updatedAt: new Date() },
          create: { usuarioId: id, empresaId, rolId, estado: 'activo' }
        });

        // Módulos
        if (modulos.length > 0) {
          await tx.usuarioEmpresaModulo.deleteMany({ where: { usuarioEmpresaId: ue.id } });
          const modulosDb = await tx.modulo.findMany({ where: { codigo: { in: modulos } } });
          await tx.usuarioEmpresaModulo.createMany({
            data: modulosDb.map(m => ({ usuarioEmpresaId: ue.id, moduloId: m.id, activo: true })),
            skipDuplicates: true
          });
        }

        // Áreas — deben pertenecer a la empresa
        if (areas.length > 0) {
          await tx.usuarioEmpresaArea.deleteMany({ where: { usuarioEmpresaId: ue.id } });
          const areasDb = await tx.area.findMany({
            where: { id: { in: areas }, empresaId, estado: 'activo' }
          });
          const invalidas = areas.filter(a => !areasDb.find(db => db.id === a));
          if (invalidas.length > 0) throw new Error(`Áreas inválidas o de otra empresa: ${invalidas.join(', ')}`);
          await tx.usuarioEmpresaArea.createMany({
            data: areasDb.map(a => ({ usuarioEmpresaId: ue.id, areaId: a.id })),
            skipDuplicates: true
          });
        }

        // Permisos adicionales directos
        if (permisos.length > 0) {
          await tx.usuarioEmpresaPermiso.deleteMany({ where: { usuarioEmpresaId: ue.id } });
          const permisosDb = await tx.permiso.findMany({ where: { codigo: { in: permisos } } });
          await tx.usuarioEmpresaPermiso.createMany({
            data: permisosDb.map(p => ({ usuarioEmpresaId: ue.id, permisoId: p.id, permitido: true })),
            skipDuplicates: true
          });
        }
      }
    });

    res.json({ success: true, message: 'Empresas del usuario actualizadas' });
  } catch (error) {
    console.error('Error en actualizarEmpresasUsuario:', error);
    res.status(500).json({ success: false, error: error.message || 'Error al actualizar empresas' });
  }
};

/**
 * PUT /api/auth/usuarios/:id/empresas/:empresaId/configuracion
 * Actualiza la configuración (rol, áreas, módulos, permisos) de un usuario en una empresa.
 */
exports.configurarUsuarioEnEmpresa = async (req, res) => {
  try {
    const sesion = req.session.usuario;
    if (!sesion || !['admin', 'super_admin'].includes(sesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos' });
    }
    const { id, empresaId } = req.params;
    const { rolId, modulos, areas, permisos } = req.body;

    const ue = await prisma.usuarioEmpresa.findUnique({
      where: { usuarioId_empresaId: { usuarioId: id, empresaId } }
    });
    if (!ue) return res.status(404).json({ success: false, error: 'El usuario no tiene asignada esa empresa' });

    await prisma.$transaction(async (tx) => {
      if (rolId) await tx.usuarioEmpresa.update({ where: { id: ue.id }, data: { rolId } });

      if (Array.isArray(modulos)) {
        await tx.usuarioEmpresaModulo.deleteMany({ where: { usuarioEmpresaId: ue.id } });
        const mods = await tx.modulo.findMany({ where: { codigo: { in: modulos } } });
        await tx.usuarioEmpresaModulo.createMany({
          data: mods.map(m => ({ usuarioEmpresaId: ue.id, moduloId: m.id })),
          skipDuplicates: true
        });
      }

      if (Array.isArray(areas)) {
        await tx.usuarioEmpresaArea.deleteMany({ where: { usuarioEmpresaId: ue.id } });
        const areasDb = await tx.area.findMany({ where: { id: { in: areas }, empresaId } });
        await tx.usuarioEmpresaArea.createMany({
          data: areasDb.map(a => ({ usuarioEmpresaId: ue.id, areaId: a.id })),
          skipDuplicates: true
        });
      }

      if (Array.isArray(permisos)) {
        await tx.usuarioEmpresaPermiso.deleteMany({ where: { usuarioEmpresaId: ue.id } });
        const permsDb = await tx.permiso.findMany({ where: { codigo: { in: permisos } } });
        await tx.usuarioEmpresaPermiso.createMany({
          data: permsDb.map(p => ({ usuarioEmpresaId: ue.id, permisoId: p.id, permitido: true })),
          skipDuplicates: true
        });
      }
    });

    res.json({ success: true, message: 'Configuración actualizada' });
  } catch (error) {
    console.error('Error en configurarUsuarioEnEmpresa:', error);
    res.status(500).json({ success: false, error: 'Error al configurar usuario en empresa' });
  }
};

/**
 * GET /api/auth/roles
 */
exports.listarRoles = async (req, res) => {
  try {
    const roles = await prisma.rol.findMany({
      where: { estado: 'activo' },
      orderBy: { nombre: 'asc' }
    });
    res.json({ success: true, roles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al listar roles' });
  }
};

/**
 * GET /api/auth/permisos
 * Retorna permisos agrupados por módulo.
 */
exports.listarPermisos = async (req, res) => {
  try {
    const permisos = await prisma.permiso.findMany({
      where: { estado: 'activo' },
      orderBy: [{ modulo: 'asc' }, { accion: 'asc' }]
    });
    const agrupados = permisos.reduce((acc, p) => {
      if (!acc[p.modulo]) acc[p.modulo] = [];
      acc[p.modulo].push(p);
      return acc;
    }, {});
    res.json({ success: true, permisos, agrupados });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al listar permisos' });
  }
};

/**
 * Eliminar usuario (admin o super_admin) — id = PostgreSQL UUID
 */
exports.eliminarUsuario = async (req, res) => {
  try {
    const sesion = req.session.usuario;
    if (!sesion || !['admin', 'super_admin'].includes(sesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para eliminar usuarios' });
    }
    const { id } = req.params;

    const pgUser = await prisma.usuario.findUnique({ where: { id } });
    if (!pgUser) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

    if (sesion.rol !== 'super_admin' && pgUser.empresaId !== sesion.pgEmpresaId) {
      return res.status(403).json({ success: false, error: 'No puedes eliminar usuarios de otra empresa' });
    }

    // Sync MongoDB primero (para no perder referencia si PG falla)
    try {
      await Usuario.findOneAndDelete({ username: pgUser.username });
    } catch (syncErr) {
      console.warn('⚠️ Sync MongoDB eliminarUsuario fallida:', syncErr.message);
    }

    await prisma.usuario.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    res.status(500).json({ success: false, error: 'Error al eliminar usuario' });
  }
};
