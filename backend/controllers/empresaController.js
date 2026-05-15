const Empresa = require('../models/Empresa');
const Usuario = require('../models/Usuario');
const Auditoria = require('../models/Auditoria');

/**
 * Registra una acción en el log de auditoría
 */
async function registrarAuditoria(req, accion, entidad, entidadId, detalle = null) {
  try {
    await Auditoria.create({
      empresaId: req.session?.usuario?.empresaId || null,
      usuarioId: req.session?.usuario?.id || null,
      usuarioUsername: req.session?.usuario?.username || 'sistema',
      accion,
      entidad,
      entidadId: entidadId ? entidadId.toString() : null,
      detalle,
      ip: req.ip
    });
  } catch (err) {
    console.error('⚠️ Error al registrar auditoría:', err.message);
  }
}

/**
 * Listar empresas
 * - super_admin: todas
 * - admin: solo la suya
 */
exports.listarEmpresas = async (req, res) => {
  try {
    const usuario = req.session.usuario;
    let empresas;

    if (usuario.rol === 'super_admin') {
      empresas = await Empresa.find().sort({ createdAt: -1 });
    } else {
      if (!usuario.empresaId) {
        return res.status(403).json({ success: false, error: 'Sin empresa asignada' });
      }
      empresas = await Empresa.find({ _id: usuario.empresaId });
    }

    res.json({ success: true, empresas });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al listar empresas' });
  }
};

/**
 * Obtener una empresa por ID
 */
exports.obtenerEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.session.usuario;

    const empresa = await Empresa.findById(id);
    if (!empresa) return res.status(404).json({ success: false, error: 'Empresa no encontrada' });

    if (usuario.rol !== 'super_admin' && empresa._id.toString() !== usuario.empresaId?.toString()) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    res.json({ success: true, empresa });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener empresa' });
  }
};

/**
 * Crear empresa (solo super_admin)
 */
exports.crearEmpresa = async (req, res) => {
  try {
    const { nombre, nit, razonSocial, colorTema, dominio, modulosHabilitados } = req.body;

    if (!nombre) return res.status(400).json({ success: false, error: 'El nombre es requerido' });

    const empresa = await Empresa.create({
      nombre: nombre.trim(),
      nit: nit || '',
      razonSocial: razonSocial || '',
      colorTema: colorTema || '#667eea',
      dominio: dominio || null,
      modulosHabilitados: modulosHabilitados || ['turnos', 'nomina']
    });

    await registrarAuditoria(req, 'CREAR_EMPRESA', 'Empresa', empresa._id, { nombre: empresa.nombre });
    res.status(201).json({ success: true, empresa });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al crear empresa' });
  }
};

/**
 * Actualizar empresa (super_admin o admin de esa empresa)
 */
exports.actualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.session.usuario;
    const empresa = await Empresa.findById(id);

    if (!empresa) return res.status(404).json({ success: false, error: 'Empresa no encontrada' });

    if (usuario.rol !== 'super_admin' && empresa._id.toString() !== usuario.empresaId?.toString()) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    const campos = ['nombre', 'nit', 'razonSocial', 'colorTema', 'dominio'];
    campos.forEach(c => { if (req.body[c] !== undefined) empresa[c] = req.body[c]; });

    if (req.body.modulosHabilitados && usuario.rol === 'super_admin') {
      empresa.modulosHabilitados = req.body.modulosHabilitados;
    }

    await empresa.save();
    await registrarAuditoria(req, 'ACTUALIZAR_EMPRESA', 'Empresa', empresa._id, { nombre: empresa.nombre });
    res.json({ success: true, empresa });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar empresa' });
  }
};

/**
 * Activar/desactivar empresa (solo super_admin)
 */
exports.cambiarEstadoEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['activa', 'inactiva'].includes(estado)) {
      return res.status(400).json({ success: false, error: 'Estado inválido: activa | inactiva' });
    }

    const empresa = await Empresa.findByIdAndUpdate(id, { estado }, { new: true });
    if (!empresa) return res.status(404).json({ success: false, error: 'Empresa no encontrada' });

    await registrarAuditoria(req, 'DESACTIVAR_EMPRESA', 'Empresa', empresa._id, { estado });
    res.json({ success: true, empresa });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al cambiar estado' });
  }
};

/**
 * Listar usuarios de una empresa (super_admin o admin de esa empresa)
 */
exports.listarUsuariosEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.session.usuario;

    if (usuario.rol !== 'super_admin' && usuario.empresaId?.toString() !== id) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    const usuarios = await Usuario.find({ empresaId: id }, '-password').sort({ createdAt: -1 });
    res.json({ success: true, usuarios });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al listar usuarios de la empresa' });
  }
};

/**
 * Obtener estadísticas básicas de una empresa (super_admin)
 */
exports.estadisticasEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const Empleado = require('../models/Empleado');
    const Turno = require('../models/Turno');

    const [totalUsuarios, totalEmpleados, totalTurnos] = await Promise.all([
      Usuario.countDocuments({ empresaId: id }),
      Empleado.countDocuments({ empresaId: id }),
      Turno.countDocuments({ empresaId: id })
    ]);

    res.json({ success: true, estadisticas: { totalUsuarios, totalEmpleados, totalTurnos } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
  }
};

exports.registrarAuditoria = registrarAuditoria;
