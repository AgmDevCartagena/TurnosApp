const Area    = require('../models/Area');
const Usuario = require('../models/Usuario');
const Turno   = require('../models/Turno');

const isSuperAdmin = (req) => req.session?.usuario?.rol === 'super_admin';
const isAdmin      = (req) => ['admin', 'super_admin'].includes(req.session?.usuario?.rol);
const empresaId    = (req) => req.session?.usuario?.empresaId || null;

/**
 * GET /api/areas
 * Lista áreas de la empresa autenticada.
 * super_admin puede filtrar con ?empresaId=...
 */
exports.listarAreas = async (req, res) => {
  try {
    const filtro = {};

    if (isSuperAdmin(req)) {
      if (req.query.empresaId) filtro.empresaId = req.query.empresaId;
    } else {
      const eid = empresaId(req);
      if (!eid) return res.status(403).json({ success: false, error: 'Sin empresa asignada' });
      filtro.empresaId = eid;
    }

    if (req.query.estado) filtro.estado = req.query.estado;

    const areas = await Area.find(filtro).sort({ nombre: 1 });
    res.json({ success: true, areas });
  } catch (err) {
    console.error('Error listarAreas:', err);
    res.status(500).json({ success: false, error: 'Error al listar áreas' });
  }
};

/**
 * GET /api/areas/:id
 */
exports.obtenerArea = async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    if (!area) return res.status(404).json({ success: false, error: 'Área no encontrada' });

    if (!isSuperAdmin(req)) {
      if (area.empresaId?.toString() !== empresaId(req)?.toString()) {
        return res.status(403).json({ success: false, error: 'Acceso denegado' });
      }
    }

    res.json({ success: true, area });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al obtener área' });
  }
};

/**
 * POST /api/areas
 */
exports.crearArea = async (req, res) => {
  try {
    const { nombre, codigo, descripcion } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ success: false, error: 'El nombre del área es requerido' });
    }

    let eid;
    if (isSuperAdmin(req)) {
      eid = req.body.empresaId;
      if (!eid) return res.status(400).json({ success: false, error: 'empresaId es requerido para super_admin' });
    } else {
      eid = empresaId(req);
      if (!eid) return res.status(403).json({ success: false, error: 'Sin empresa asignada' });
    }

    const nombreNorm = nombre.trim().toUpperCase();

    // Verificar duplicado activo en la misma empresa
    const duplicado = await Area.findOne({ empresaId: eid, nombre: nombreNorm, estado: 'activa' });
    if (duplicado) {
      return res.status(400).json({
        success: false,
        error: `Ya existe un área activa llamada "${nombreNorm}" en esta empresa`
      });
    }

    const area = await Area.create({
      empresaId: eid,
      nombre: nombreNorm,
      codigo: codigo?.trim().toUpperCase() || '',
      descripcion: descripcion?.trim() || ''
    });

    res.status(201).json({ success: true, area });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Ya existe un área con ese nombre en esta empresa' });
    }
    console.error('Error crearArea:', err);
    res.status(500).json({ success: false, error: 'Error al crear área' });
  }
};

/**
 * PUT /api/areas/:id
 */
exports.actualizarArea = async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    if (!area) return res.status(404).json({ success: false, error: 'Área no encontrada' });

    if (!isSuperAdmin(req)) {
      if (area.empresaId?.toString() !== empresaId(req)?.toString()) {
        return res.status(403).json({ success: false, error: 'No puedes editar áreas de otra empresa' });
      }
    }

    const { nombre, codigo, descripcion, estado } = req.body;

    if (nombre !== undefined) {
      const nombreNorm = nombre.trim().toUpperCase();
      if (!nombreNorm) {
        return res.status(400).json({ success: false, error: 'El nombre no puede estar vacío' });
      }
      // Verificar duplicado excluyendo la propia área
      const dup = await Area.findOne({
        empresaId: area.empresaId,
        nombre: nombreNorm,
        estado: 'activa',
        _id: { $ne: area._id }
      });
      if (dup) {
        return res.status(400).json({ success: false, error: `Ya existe un área activa llamada "${nombreNorm}"` });
      }
      area.nombre = nombreNorm;
    }

    if (codigo    !== undefined) area.codigo      = codigo.trim().toUpperCase();
    if (descripcion !== undefined) area.descripcion = descripcion.trim();
    if (estado    !== undefined) area.estado       = estado;

    await area.save();
    res.json({ success: true, area });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Ya existe un área con ese nombre en esta empresa' });
    }
    res.status(500).json({ success: false, error: 'Error al actualizar área' });
  }
};

/**
 * PATCH /api/areas/:id/estado
 */
exports.cambiarEstado = async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    if (!area) return res.status(404).json({ success: false, error: 'Área no encontrada' });

    if (!isSuperAdmin(req)) {
      if (area.empresaId?.toString() !== empresaId(req)?.toString()) {
        return res.status(403).json({ success: false, error: 'No puedes modificar áreas de otra empresa' });
      }
    }

    const { estado } = req.body;
    if (!['activa', 'inactiva'].includes(estado)) {
      return res.status(400).json({ success: false, error: 'Estado inválido. Use "activa" o "inactiva"' });
    }

    area.estado = estado;
    await area.save();
    res.json({ success: true, area });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al cambiar estado' });
  }
};

/**
 * DELETE /api/areas/:id
 * Solo si no tiene dependencias activas.
 */
exports.eliminarArea = async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    if (!area) return res.status(404).json({ success: false, error: 'Área no encontrada' });

    if (!isSuperAdmin(req)) {
      if (area.empresaId?.toString() !== empresaId(req)?.toString()) {
        return res.status(403).json({ success: false, error: 'No puedes eliminar áreas de otra empresa' });
      }
    }

    // Verificar dependencias
    const usuariosConArea = await Usuario.countDocuments({
      empresaId: area.empresaId,
      areasPermitidas: area.nombre
    });

    const turnosConArea = await Turno.countDocuments({
      empresaId: area.empresaId,
      $or: [
        { 'turnoActual.area': area.nombre },
        { 'historialTurnos.area': area.nombre }
      ]
    });

    if (usuariosConArea > 0 || turnosConArea > 0) {
      return res.status(409).json({
        success: false,
        error: `No se puede eliminar: el área tiene ${usuariosConArea} usuario(s) y ${turnosConArea} turno(s) asociados. Use inactivar en su lugar.`,
        dependencias: { usuarios: usuariosConArea, turnos: turnosConArea }
      });
    }

    await area.deleteOne();
    res.json({ success: true, message: 'Área eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminarArea:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar área' });
  }
};
