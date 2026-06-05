'use strict';

const prisma = require('../lib/prisma');

// ─── Helper: incluir permisos del rol ─────────────────────────────────────────
const INCLUDE_PERMISOS = {
  permisos: {
    include: {
      permiso: {
        select: { id: true, codigo: true, nombre: true, descripcion: true, modulo: true, recurso: true, accion: true, orden: true }
      }
    },
    orderBy: { permiso: { orden: 'asc' } }
  }
};

// ─── Helper: contar usuarios asignados al rol ─────────────────────────────────
async function _contarUsuarios(rolId) {
  return prisma.usuarioEmpresa.count({ where: { rolId, estado: 'activo' } });
}

// ─── Helper: permiso desde sesión ────────────────────────────────────────────
function _sesion(req) { return req.session?.usuario; }
function _isSA(req)   { const s = _sesion(req); return s?.rol === 'super_admin' || s?.esSuperAdmin; }

/**
 * GET /api/roles
 * Lista roles con sus permisos asignados y contador de usuarios.
 * super_admin ve todos; admin ve solo los de tipo 'empresa'.
 */
exports.listarRoles = async (req, res) => {
  try {
    const where = _isSA(req) ? {} : { estado: 'activo', tipo: 'empresa' };
    const roles = await prisma.rol.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: INCLUDE_PERMISOS
    });

    const resultado = await Promise.all(roles.map(async r => ({
      id:          r.id,
      codigo:      r.codigo,
      nombre:      r.nombre,
      descripcion: r.descripcion,
      tipo:        r.tipo,
      estado:      r.estado,
      createdAt:   r.createdAt,
      updatedAt:   r.updatedAt,
      permisos:    r.permisos.map(rp => rp.permiso),
      totalPermisos:  r.permisos.length,
      totalUsuarios: await _contarUsuarios(r.id),
    })));

    res.json({ success: true, roles: resultado });
  } catch (err) {
    console.error('Error listarRoles:', err);
    res.status(500).json({ success: false, error: 'Error al listar roles' });
  }
};

/**
 * GET /api/roles/:id
 * Detalle completo de un rol con sus permisos.
 */
exports.obtenerRol = async (req, res) => {
  try {
    const { id } = req.params;
    const rol = await prisma.rol.findUnique({
      where: { id },
      include: INCLUDE_PERMISOS
    });
    if (!rol) return res.status(404).json({ success: false, error: 'Rol no encontrado' });

    res.json({
      success: true,
      rol: {
        ...rol,
        permisos:      rol.permisos.map(rp => rp.permiso),
        totalUsuarios: await _contarUsuarios(id),
      }
    });
  } catch (err) {
    console.error('Error obtenerRol:', err);
    res.status(500).json({ success: false, error: 'Error al obtener rol' });
  }
};

/**
 * POST /api/roles
 * Crea un nuevo rol. Opcionalmente acepta permisos[] de códigos.
 * Body: { codigo, nombre, descripcion?, permisos?: string[] }
 */
exports.crearRol = async (req, res) => {
  try {
    const { codigo, nombre, descripcion, permisos = [] } = req.body;

    if (!codigo?.trim()) return res.status(400).json({ success: false, error: 'El código del rol es requerido' });
    if (!nombre?.trim())  return res.status(400).json({ success: false, error: 'El nombre del rol es requerido' });

    const codigoNorm = codigo.trim().toUpperCase().replace(/\s+/g, '_');

    // Verificar unicidad
    const existe = await prisma.rol.findUnique({ where: { codigo: codigoNorm } });
    if (existe) return res.status(400).json({ success: false, error: `Ya existe un rol con el código ${codigoNorm}` });

    const rol = await prisma.$transaction(async tx => {
      const nuevo = await tx.rol.create({
        data: { codigo: codigoNorm, nombre: nombre.trim(), descripcion: descripcion?.trim() || null, tipo: 'empresa' }
      });

      if (permisos.length > 0) {
        const permsDb = await tx.permiso.findMany({
          where: { codigo: { in: permisos }, estado: 'activo' }
        });
        if (permsDb.length > 0) {
          await tx.rolPermiso.createMany({
            data: permsDb.map(p => ({ rolId: nuevo.id, permisoId: p.id })),
            skipDuplicates: true
          });
        }
      }

      return tx.rol.findUnique({ where: { id: nuevo.id }, include: INCLUDE_PERMISOS });
    });

    res.status(201).json({
      success: true,
      rol: { ...rol, permisos: rol.permisos.map(rp => rp.permiso) }
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Ya existe un rol con ese código' });
    }
    console.error('Error crearRol:', err);
    res.status(500).json({ success: false, error: 'Error al crear rol' });
  }
};

/**
 * PUT /api/roles/:id
 * Edita nombre y descripción del rol.
 * Body: { nombre?, descripcion? }
 */
exports.editarRol = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    const rol = await prisma.rol.findUnique({ where: { id } });
    if (!rol) return res.status(404).json({ success: false, error: 'Rol no encontrado' });

    const data = {};
    if (nombre?.trim())       data.nombre      = nombre.trim();
    if (descripcion !== undefined) data.descripcion = descripcion?.trim() || null;

    if (!Object.keys(data).length) {
      return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
    }

    const actualizado = await prisma.rol.update({
      where: { id },
      data:  { ...data, updatedAt: new Date() },
      include: INCLUDE_PERMISOS
    });

    res.json({
      success: true,
      rol: { ...actualizado, permisos: actualizado.permisos.map(rp => rp.permiso) }
    });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Rol no encontrado' });
    console.error('Error editarRol:', err);
    res.status(500).json({ success: false, error: 'Error al editar rol' });
  }
};

/**
 * PATCH /api/roles/:id/estado
 * Activa o desactiva un rol.
 * No permite desactivar un rol con usuarios activos.
 */
exports.toggleEstadoRol = async (req, res) => {
  try {
    const { id } = req.params;
    const rol = await prisma.rol.findUnique({ where: { id } });
    if (!rol) return res.status(404).json({ success: false, error: 'Rol no encontrado' });

    if (rol.estado === 'activo') {
      const usuarios = await _contarUsuarios(id);
      if (usuarios > 0) {
        return res.status(409).json({
          success: false,
          error: `No se puede desactivar: ${usuarios} usuario(s) tienen este rol asignado.`
        });
      }
    }

    const nuevoEstado = rol.estado === 'activo' ? 'inactivo' : 'activo';
    const actualizado = await prisma.rol.update({
      where: { id },
      data:  { estado: nuevoEstado, updatedAt: new Date() }
    });

    res.json({ success: true, estado: actualizado.estado });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Rol no encontrado' });
    console.error('Error toggleEstadoRol:', err);
    res.status(500).json({ success: false, error: 'Error al cambiar estado del rol' });
  }
};

/**
 * DELETE /api/roles/:id
 * Elimina un rol si no tiene usuarios activos.
 * Si tiene usuarios, devuelve 409 indicando cuántos.
 */
exports.eliminarRol = async (req, res) => {
  try {
    const { id } = req.params;
    const rol = await prisma.rol.findUnique({ where: { id } });
    if (!rol) return res.status(404).json({ success: false, error: 'Rol no encontrado' });

    const usuarios = await _contarUsuarios(id);
    if (usuarios > 0) {
      return res.status(409).json({
        success: false,
        error: `No se puede eliminar: ${usuarios} usuario(s) tienen este rol asignado. Desactívalo primero.`
      });
    }

    await prisma.$transaction(async tx => {
      await tx.rolPermiso.deleteMany({ where: { rolId: id } });
      await tx.rol.delete({ where: { id } });
    });

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Rol no encontrado' });
    console.error('Error eliminarRol:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar rol' });
  }
};

/**
 * GET /api/roles/:id/permisos
 * Retorna los permisos asignados al rol.
 */
exports.obtenerPermisosDeRol = async (req, res) => {
  try {
    const { id } = req.params;
    const rol = await prisma.rol.findUnique({
      where: { id },
      include: INCLUDE_PERMISOS
    });
    if (!rol) return res.status(404).json({ success: false, error: 'Rol no encontrado' });

    res.json({
      success:  true,
      rolId:    id,
      rolNombre: rol.nombre,
      permisos: rol.permisos.map(rp => rp.permiso)
    });
  } catch (err) {
    console.error('Error obtenerPermisosDeRol:', err);
    res.status(500).json({ success: false, error: 'Error al obtener permisos del rol' });
  }
};

/**
 * PUT /api/roles/:id/permisos
 * Reemplaza completamente los permisos del rol.
 * Body: { permisos: string[] }  — array de códigos
 */
exports.actualizarPermisosDeRol = async (req, res) => {
  try {
    const { id } = req.params;
    const { permisos } = req.body;

    if (!Array.isArray(permisos)) {
      return res.status(400).json({ success: false, error: 'permisos debe ser un array de códigos' });
    }

    const rol = await prisma.rol.findUnique({ where: { id } });
    if (!rol) return res.status(404).json({ success: false, error: 'Rol no encontrado' });

    // Validar que los permisos existen y están activos
    let permsDb = [];
    if (permisos.length > 0) {
      permsDb = await prisma.permiso.findMany({
        where: { codigo: { in: permisos }, estado: 'activo' }
      });

      const codigosNoEncontrados = permisos.filter(c => !permsDb.find(p => p.codigo === c));
      if (codigosNoEncontrados.length > 0) {
        return res.status(400).json({
          success: false,
          error:   `Permisos no encontrados o inactivos: ${codigosNoEncontrados.join(', ')}`
        });
      }

      // Detectar duplicados en el array enviado
      const duplicados = permisos.filter((c, i) => permisos.indexOf(c) !== i);
      if (duplicados.length > 0) {
        return res.status(400).json({
          success: false,
          error:   `Permisos duplicados en la solicitud: ${[...new Set(duplicados)].join(', ')}`
        });
      }
    }

    await prisma.$transaction(async tx => {
      await tx.rolPermiso.deleteMany({ where: { rolId: id } });
      if (permsDb.length > 0) {
        await tx.rolPermiso.createMany({
          data: permsDb.map(p => ({ rolId: id, permisoId: p.id })),
          skipDuplicates: true
        });
      }
    });

    const rolActualizado = await prisma.rol.findUnique({
      where: { id },
      include: INCLUDE_PERMISOS
    });

    res.json({
      success:  true,
      rol: {
        ...rolActualizado,
        permisos: rolActualizado.permisos.map(rp => rp.permiso)
      }
    });
  } catch (err) {
    console.error('Error actualizarPermisosDeRol:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar permisos del rol' });
  }
};

/**
 * GET /api/permisos
 * Lista todos los permisos activos con datos legibles.
 * Acepta ?modulo=, ?buscar=, ?accion=
 */
exports.listarPermisos = async (req, res) => {
  try {
    const { modulo, buscar, accion } = req.query;
    const where = { estado: 'activo' };

    if (modulo) where.modulo = modulo;
    if (accion) where.accion = accion;
    if (buscar) {
      where.OR = [
        { nombre:      { contains: buscar, mode: 'insensitive' } },
        { descripcion: { contains: buscar, mode: 'insensitive' } },
        { codigo:      { contains: buscar, mode: 'insensitive' } },
        { modulo:      { contains: buscar, mode: 'insensitive' } },
      ];
    }

    const permisos = await prisma.permiso.findMany({
      where,
      orderBy: [{ modulo: 'asc' }, { orden: 'asc' }]
    });

    const agrupados = permisos.reduce((acc, p) => {
      if (!acc[p.modulo]) acc[p.modulo] = [];
      acc[p.modulo].push(p);
      return acc;
    }, {});

    res.json({ success: true, permisos, agrupados, total: permisos.length });
  } catch (err) {
    console.error('Error listarPermisos:', err);
    res.status(500).json({ success: false, error: 'Error al listar permisos' });
  }
};
