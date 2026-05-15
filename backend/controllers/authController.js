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

    if (usuario.password !== password) {
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

    req.session.usuario = {
      id: usuario._id,
      username: usuario.username,
      nombre: usuario.nombre,
      rol: usuario.rol,
      modulosPermitidos: modulosEfectivos,
      areasPermitidas: usuario.areasPermitidas || [],
      empresaId: usuario.empresaId || null,
      nombreEmpresa: empresa ? empresa.nombre : null
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
        nombreEmpresa: empresa ? empresa.nombre : null
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
    const usuarioSesion = req.session.usuario;
    const rolesPermitidos = ['admin', 'super_admin'];
    if (!usuarioSesion || !rolesPermitidos.includes(usuarioSesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para crear usuarios' });
    }

    const { username, password, nombre, rol, modulosPermitidos, areasPermitidas, empresaId } = req.body;

    if (!username || !password || !nombre) {
      return res.status(400).json({ success: false, error: 'Datos incompletos' });
    }

    const existe = await Usuario.findOne({ username: username.toLowerCase().trim() });
    if (existe) return res.status(400).json({ success: false, error: 'El usuario ya existe' });

    // Un admin solo puede crear en su empresa; super_admin puede elegir
    let empresaAsignada = empresaId || null;
    if (usuarioSesion.rol !== 'super_admin') {
      empresaAsignada = usuarioSesion.empresaId || null;
    }

    const nuevoUsuario = new Usuario({
      username: username.toLowerCase().trim(),
      password,
      nombre,
      rol: rol || 'usuario',
      modulosPermitidos: modulosPermitidos || ['turnos', 'nomina'],
      areasPermitidas: areasPermitidas || [],
      empresaId: empresaAsignada
    });

    await nuevoUsuario.save();

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      usuario: {
        username: nuevoUsuario.username,
        nombre: nuevoUsuario.nombre,
        rol: nuevoUsuario.rol,
        modulosPermitidos: nuevoUsuario.modulosPermitidos,
        areasPermitidas: nuevoUsuario.areasPermitidas,
        empresaId: nuevoUsuario.empresaId
      }
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ success: false, error: 'Error al crear usuario' });
  }
};

/**
 * Listar usuarios — admin solo ve su empresa; super_admin ve todos
 */
exports.listarUsuarios = async (req, res) => {
  try {
    const usuarioSesion = req.session.usuario;
    const rolesPermitidos = ['admin', 'super_admin'];
    if (!usuarioSesion || !rolesPermitidos.includes(usuarioSesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para ver usuarios' });
    }

    let filtro = {};
    if (usuarioSesion.rol !== 'super_admin' && usuarioSesion.empresaId) {
      filtro.empresaId = usuarioSesion.empresaId;
    }

    const usuarios = await Usuario.find(filtro, '-password').sort({ createdAt: -1 });
    res.json({ success: true, usuarios });
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ success: false, error: 'Error al listar usuarios' });
  }
};

/**
 * Editar usuario (admin o super_admin)
 */
exports.editarUsuario = async (req, res) => {
  try {
    const usuarioSesion = req.session.usuario;
    const rolesPermitidos = ['admin', 'super_admin'];
    if (!usuarioSesion || !rolesPermitidos.includes(usuarioSesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para editar usuarios' });
    }
    const { id } = req.params;
    const { nombre, username, rol, modulosPermitidos, areasPermitidas } = req.body;
    const usuario = await Usuario.findById(id);
    if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

    // Admin solo puede editar usuarios de su empresa
    if (usuarioSesion.rol !== 'super_admin') {
      if (usuario.empresaId?.toString() !== usuarioSesion.empresaId?.toString()) {
        return res.status(403).json({ success: false, error: 'No puedes editar usuarios de otra empresa' });
      }
    }

    usuario.nombre = nombre || usuario.nombre;
    usuario.username = username || usuario.username;
    usuario.rol = rol || usuario.rol;
    usuario.modulosPermitidos = modulosPermitidos || usuario.modulosPermitidos;
    usuario.areasPermitidas = areasPermitidas || usuario.areasPermitidas;
    await usuario.save();
    res.json({ success: true, usuario });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al editar usuario' });
  }
};

/**
 * Cambiar contraseña de usuario (admin o super_admin)
 */
exports.cambiarContrasena = async (req, res) => {
  try {
    const usuarioSesion = req.session.usuario;
    const rolesPermitidos = ['admin', 'super_admin'];
    if (!usuarioSesion || !rolesPermitidos.includes(usuarioSesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para cambiar contraseñas' });
    }
    const { id } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, error: 'Contraseña requerida' });
    const usuario = await Usuario.findById(id);
    if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

    if (usuarioSesion.rol !== 'super_admin') {
      if (usuario.empresaId?.toString() !== usuarioSesion.empresaId?.toString()) {
        return res.status(403).json({ success: false, error: 'No puedes cambiar contraseña de usuario de otra empresa' });
      }
    }

    usuario.password = password;
    await usuario.save();
    res.json({ success: true });
  } catch (error) {
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
    const usuario = await Usuario.findById(req.session.usuario.id);
    if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    if (usuario.password !== passwordActual) {
      return res.status(401).json({ success: false, error: 'La contraseña actual es incorrecta' });
    }
    usuario.password = passwordNueva;
    await usuario.save();
    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ success: false, error: 'Error al cambiar contraseña' });
  }
};

/**
 * Eliminar usuario (admin o super_admin)
 */
exports.eliminarUsuario = async (req, res) => {
  try {
    const usuarioSesion = req.session.usuario;
    const rolesPermitidos = ['admin', 'super_admin'];
    if (!usuarioSesion || !rolesPermitidos.includes(usuarioSesion.rol)) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para eliminar usuarios' });
    }
    const { id } = req.params;
    const usuario = await Usuario.findById(id);
    if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

    if (usuarioSesion.rol !== 'super_admin') {
      if (usuario.empresaId?.toString() !== usuarioSesion.empresaId?.toString()) {
        return res.status(403).json({ success: false, error: 'No puedes eliminar usuarios de otra empresa' });
      }
    }

    await usuario.deleteOne();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar usuario' });
  }
};
