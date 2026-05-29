'use strict';

const bcrypt          = require('bcryptjs');
const prisma          = require('../lib/prisma');
const permisosService = require('../services/permisosService');
// MongoDB — solo para turnoController legacy (NO para autenticación)
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');

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
    modulosPermitidos: ctx?.modulosActivos     || [],
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

    // Usuario sin empresas activas asignadas
    if (empresasAsignadas.length === 0) {
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

    req.session.usuario = {
      id: usuario._id.toString(),
      pgId: null,
      username: usuario.username,
      nombre: usuario.nombre,
      rol: usuario.rol,
      modulosPermitidos: usuario.modulosPermitidos || [],
      areasPermitidas: usuario.areasPermitidas || [],
      areasPermitidasIds: [],
      permisosEfectivos: [],
      empresaId: usuario.empresaId?.toString() || null,
      pgEmpresaId: null,
      nombreEmpresa: empresa?.nombre || null,
      logoUrl: null,
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
exports.verificarSesion = (req, res) => {
  if (req.session && req.session.autenticado) {
    res.json({ success: true, autenticado: true, usuario: req.session.usuario });
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
 */
exports.crearUsuario = async (req, res) => {
  try {
    const sesion = req.session.usuario;
    if (!sesion || !['admin', 'super_admin'].includes(sesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para crear usuarios' });
    }

    const { username, password, nombre, rol, modulosPermitidos, areasPermitidas, empresaId } = req.body;
    if (!username || !password || !nombre) {
      return res.status(400).json({ success: false, error: 'Datos incompletos' });
    }

    const usernameNorm = username.toLowerCase().trim();

    // Empresa: admin usa la suya, super_admin elige
    const pgEmpresaId = sesion.rol === 'super_admin'
      ? (empresaId || null)
      : (sesion.pgEmpresaId || null);

    // Verificar unicidad en PostgreSQL
    const existe = await prisma.usuario.findUnique({ where: { username: usernameNorm } });
    if (existe) return res.status(400).json({ success: false, error: 'El usuario ya existe' });

    const modulos = modulosPermitidos || ['turnos', 'nomina'];
    const areasNorm = (areasPermitidas || []).map(a => a.toUpperCase().trim()).filter(Boolean);

    // Validar y obtener IDs de áreas en PostgreSQL
    let areasPg = [];
    if (areasNorm.length > 0 && pgEmpresaId) {
      areasPg = await prisma.area.findMany({
        where: { empresaId: pgEmpresaId, nombre: { in: areasNorm }, estado: 'activo' }
      });
      const nombresValidos = areasPg.map(a => a.nombre);
      const invalidas = areasNorm.filter(a => !nombresValidos.includes(a));
      if (invalidas.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Áreas no válidas o inactivas: ${invalidas.join(', ')}`
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // ── PostgreSQL (fuente de verdad) ──────────────────────────────────────────
    const pgUser = await prisma.usuario.create({
      data: {
        username:  usernameNorm,
        passwordHash,
        nombre,
        rol:       rol || 'usuario',
        empresaId: pgEmpresaId,
        activo:    true,
        modulosPermitidos: {
          create: modulos.map(m => ({ modulo: m }))
        },
        areas: {
          create: areasPg.map(a => ({ areaId: a.id }))
        }
      }
    });

    // ── MongoDB (sync para turnoController no migrado) ─────────────────────────
    try {
      // Obtener empresaId MongoDB correspondiente al pgEmpresaId
      const pgEmpresa = pgEmpresaId
        ? await prisma.empresa.findUnique({ where: { id: pgEmpresaId }, select: { nit: true, nombre: true } })
        : null;
      const mongoEmpresa = pgEmpresa
        ? await Empresa.findOne({ $or: [{ nit: pgEmpresa.nit }, { nombre: pgEmpresa.nombre }] })
        : null;

      await Usuario.create({
        username:         usernameNorm,
        password:         passwordHash,
        nombre,
        rol:              rol || 'usuario',
        modulosPermitidos: modulos,
        areasPermitidas:  areasNorm,
        empresaId:        mongoEmpresa?._id || null,
        activo:           true
      });
    } catch (syncErr) {
      console.warn('⚠️ Sync MongoDB fallida (no crítico):', syncErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      usuario: {
        id:               pgUser.id,
        username:         pgUser.username,
        nombre:           pgUser.nombre,
        rol:              pgUser.rol,
        modulosPermitidos: modulos,
        areasPermitidas:  areasNorm,
        empresaId:        pgEmpresaId
      }
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

    const where = {};
    if (sesion.rol !== 'super_admin' && sesion.pgEmpresaId) {
      where.empresaId = sesion.pgEmpresaId;
    }

    const usuarios = await prisma.usuario.findMany({
      where,
      select: {
        id: true, username: true, nombre: true, rol: true,
        activo: true, ultimoAcceso: true, createdAt: true,
        empresaId: true,
        empresa:  { select: { nombre: true } },
        modulosPermitidos: true,
        areas: { include: { area: { select: { nombre: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Normalizar para compatibilidad con frontend
    const resultado = usuarios.map(u => ({
      ...u,
      modulosPermitidos: u.modulosPermitidos.map(m => m.modulo),
      areasPermitidas:   u.areas.map(ua => ua.area.nombre),
      nombreEmpresa:     u.empresa?.nombre || null
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
    const { nombre, username, rol, modulosPermitidos, areasPermitidas } = req.body;

    const pgUser = await prisma.usuario.findUnique({ where: { id } });
    if (!pgUser) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

    if (sesion.rol !== 'super_admin' && pgUser.empresaId !== sesion.pgEmpresaId) {
      return res.status(403).json({ success: false, error: 'No puedes editar usuarios de otra empresa' });
    }

    const data = {};
    if (nombre   !== undefined) data.nombre   = nombre;
    if (username !== undefined) data.username = username.toLowerCase().trim();
    if (rol      !== undefined) data.rol      = rol;

    // Reemplazar módulos si se proveen
    if (modulosPermitidos !== undefined) {
      await prisma.usuarioModulo.deleteMany({ where: { usuarioId: id } });
      data.modulosPermitidos = {
        create: modulosPermitidos.map(m => ({ modulo: m }))
      };
    }

    // Reemplazar áreas si se proveen
    if (areasPermitidas !== undefined) {
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
      const areasNorm2 = areasPermitidas !== undefined
        ? (areasPermitidas || []).map(a => a.toUpperCase().trim()).filter(Boolean)
        : undefined;
      const mongoUpdate = {};
      if (nombre   !== undefined) mongoUpdate.nombre   = nombre;
      if (username !== undefined) mongoUpdate.username = username.toLowerCase().trim();
      if (rol      !== undefined) mongoUpdate.rol      = rol;
      if (modulosPermitidos !== undefined) mongoUpdate.modulosPermitidos = modulosPermitidos;
      if (areasNorm2        !== undefined) mongoUpdate.areasPermitidas   = areasNorm2;
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
