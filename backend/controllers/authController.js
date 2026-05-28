const bcrypt  = require('bcryptjs');
const prisma  = require('../lib/prisma');
// MongoDB — solo para sincronización mientras turnoController no está migrado
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');

/**
 * Login de usuario
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Usuario y contraseña son requeridos' });
    }

    const usuario = await Usuario.findOne({ username: username.toLowerCase().trim(), activo: true });

    if (!usuario) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
    }

    const passwordValida = await usuario.comparePassword(password);
    if (!passwordValida) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
    }

    // Validar empresa activa (excepto super_admin)
    let empresa = null;
    let modulosEmpresa = ['turnos', 'nomina'];
    if (usuario.rol !== 'super_admin' && usuario.empresaId) {
      empresa = await Empresa.findById(usuario.empresaId);
      if (!empresa || empresa.estado === 'inactiva') {
        return res.status(403).json({
          success: false,
          error: 'La empresa asignada está inactiva o no existe. Contacta al administrador.'
        });
      }
      modulosEmpresa = empresa.modulosHabilitados || ['turnos', 'nomina'];
    }

    usuario.ultimoAcceso = new Date();
    await usuario.save();

    const modulosEfectivos = (usuario.modulosPermitidos || []).filter(m => modulosEmpresa.includes(m));

    // Lookup en PostgreSQL para obtener UUIDs (migración gradual)
    let pgId = null;
    let pgEmpresaId = null;
    let logoUrl = null;
    try {
      const pgUser = await prisma.usuario.findUnique({ where: { username: usuario.username } });
      if (pgUser) {
        pgId = pgUser.id;
        pgEmpresaId = pgUser.empresaId || null;
        await prisma.usuario.update({ where: { id: pgUser.id }, data: { ultimoAcceso: new Date() } });
        if (pgEmpresaId) {
          const pgEmpresa = await prisma.empresa.findUnique({
            where: { id: pgEmpresaId },
            select: { logoUrl: true }
          });
          logoUrl = pgEmpresa?.logoUrl || null;
        }
      }
    } catch (_) { /* PostgreSQL no disponible o usuario no migrado aún */ }

    req.session.usuario = {
      id: usuario._id,
      pgId,
      username: usuario.username,
      nombre: usuario.nombre,
      rol: usuario.rol,
      modulosPermitidos: modulosEfectivos,
      areasPermitidas: usuario.areasPermitidas || [],
      empresaId: usuario.empresaId || null,
      pgEmpresaId,
      nombreEmpresa: empresa ? empresa.nombre : null,
      logoUrl
    };
    req.session.autenticado = true;

    res.json({
      success: true,
      usuario: {
        username: usuario.username,
        nombre: usuario.nombre,
        rol: usuario.rol,
        modulosPermitidos: modulosEfectivos,
        areasPermitidas: usuario.areasPermitidas || [],
        empresaId: usuario.empresaId || null,
        pgEmpresaId,
        nombreEmpresa: empresa ? empresa.nombre : null,
        logoUrl
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, error: 'Error al iniciar sesión' });
  }
};

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
 * Verificar sesión actual
 */
exports.verificarSesion = (req, res) => {
  if (req.session && req.session.autenticado) {
    res.json({ success: true, autenticado: true, usuario: req.session.usuario });
  } else {
    res.json({ success: true, autenticado: false });
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
