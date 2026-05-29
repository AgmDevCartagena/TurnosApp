'use strict';

const prisma = require('../lib/prisma');

const isSuperAdmin  = (req) => req.session?.usuario?.rol === 'super_admin';
const pgEmpresaId   = (req) => req.session?.usuario?.pgEmpresaId || null;

/**
 * GET /api/areas
 * Lista áreas de la empresa autenticada.
 * super_admin puede filtrar con ?empresaId=...
 */
exports.listarAreas = async (req, res) => {
  try {
    const where = {};

    if (isSuperAdmin(req)) {
      if (req.query.empresaId) where.empresaId = req.query.empresaId;
    } else {
      const eid = pgEmpresaId(req);
      if (!eid) return res.status(403).json({ success: false, error: 'Sin empresa asignada' });
      where.empresaId = eid;
    }

    if (req.query.estado) where.estado = req.query.estado;

    const areas = await prisma.area.findMany({
      where,
      include: { empresa: { select: { nombre: true } } },
      orderBy: { nombre: 'asc' }
    });
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
    const area = await prisma.area.findUnique({ where: { id: req.params.id } });
    if (!area) return res.status(404).json({ success: false, error: 'Área no encontrada' });

    if (!isSuperAdmin(req) && area.empresaId !== pgEmpresaId(req)) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
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

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let eid;
    if (isSuperAdmin(req)) {
      eid = req.body.empresaId;
      if (!eid || !UUID_RE.test(eid)) {
        return res.status(400).json({ success: false, error: 'Selecciona una empresa válida antes de crear el área.' });
      }
    } else {
      eid = pgEmpresaId(req);
      if (!eid) return res.status(403).json({ success: false, error: 'Sin empresa asignada' });
    }

    const nombreNorm = nombre.trim().toUpperCase();

    const area = await prisma.area.create({
      data: {
        empresaId:   eid,
        nombre:      nombreNorm,
        codigo:      codigo?.trim().toUpperCase() || null,
        descripcion: descripcion?.trim() || null,
        estado:      'activo'
      }
    });

    res.status(201).json({ success: true, area });
  } catch (err) {
    if (err.code === 'P2002') {
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
    const area = await prisma.area.findUnique({ where: { id: req.params.id } });
    if (!area) return res.status(404).json({ success: false, error: 'Área no encontrada' });

    if (!isSuperAdmin(req) && area.empresaId !== pgEmpresaId(req)) {
      return res.status(403).json({ success: false, error: 'No puedes editar áreas de otra empresa' });
    }

    const { nombre, codigo, descripcion, estado } = req.body;
    const data = {};

    if (nombre !== undefined) {
      const nombreNorm = nombre.trim().toUpperCase();
      if (!nombreNorm) return res.status(400).json({ success: false, error: 'El nombre no puede estar vacío' });
      data.nombre = nombreNorm;
    }
    if (codigo      !== undefined) data.codigo      = codigo.trim().toUpperCase();
    if (descripcion !== undefined) data.descripcion = descripcion.trim();
    if (estado      !== undefined) data.estado      = estado;

    const actualizada = await prisma.area.update({ where: { id: req.params.id }, data });
    res.json({ success: true, area: actualizada });
  } catch (err) {
    if (err.code === 'P2002') {
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
    const area = await prisma.area.findUnique({ where: { id: req.params.id } });
    if (!area) return res.status(404).json({ success: false, error: 'Área no encontrada' });

    if (!isSuperAdmin(req) && area.empresaId !== pgEmpresaId(req)) {
      return res.status(403).json({ success: false, error: 'No puedes modificar áreas de otra empresa' });
    }

    const { estado } = req.body;
    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ success: false, error: 'Estado inválido. Use "activo" o "inactivo"' });
    }

    const actualizada = await prisma.area.update({ where: { id: req.params.id }, data: { estado } });
    res.json({ success: true, area: actualizada });
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
    const area = await prisma.area.findUnique({ where: { id: req.params.id } });
    if (!area) return res.status(404).json({ success: false, error: 'Área no encontrada' });

    if (!isSuperAdmin(req) && area.empresaId !== pgEmpresaId(req)) {
      return res.status(403).json({ success: false, error: 'No puedes eliminar áreas de otra empresa' });
    }

    // Verificar dependencias en PostgreSQL
    const [usuariosConArea, turnosConArea, empleadosConArea] = await Promise.all([
      prisma.usuarioArea.count({ where: { areaId: area.id } }),
      prisma.turno.count({ where: { areaId: area.id } }),
      prisma.empleado.count({ where: { areaId: area.id } })
    ]);

    if (usuariosConArea > 0 || turnosConArea > 0 || empleadosConArea > 0) {
      return res.status(409).json({
        success: false,
        error: `No se puede eliminar: el área tiene ${usuariosConArea} usuario(s), ${empleadosConArea} empleado(s) y ${turnosConArea} turno(s) asociados. Use inactivar en su lugar.`,
        dependencias: { usuarios: usuariosConArea, empleados: empleadosConArea, turnos: turnosConArea }
      });
    }

    await prisma.area.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Área eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminarArea:', err);
    if (err.code === 'P2003') {
      return res.status(409).json({ success: false, error: 'El área tiene registros asociados. Use inactivar.' });
    }
    res.status(500).json({ success: false, error: 'Error al eliminar área' });
  }
};
