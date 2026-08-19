'use strict';

/**
 * empleadoController — CRUD de empleados vía Prisma (PostgreSQL)
 * Dual-write a MongoDB mientras turnoController no esté migrado.
 * Todos los IDs de recurso son PostgreSQL UUIDs.
 */

const prisma   = require('../lib/prisma');
const Empleado = require('../models/Empleado'); // sync legado
const { determinarAreaPorCargo, validarDatosEmpleado } = require('../services/empleadosService');

// ─── helpers ──────────────────────────────────────────────────────────────────

const isSuperAdmin = (req) => req.esSuperAdmin === true;

/**
 * Sanitiza texto libre (nombre, cargo, obs): trim, strip HTML, maxLen.
 * Exportada para tests unitarios.
 */
function _sanitizarTextoPersona(texto, maxLen = 150) {
  if (texto === null || texto === undefined) return null;
  const s = String(texto).replace(/<[^>]*>/g, '').trim();
  if (!s) return null;
  return s.slice(0, maxLen);
}
exports._sanitizarTextoPersona = _sanitizarTextoPersona;

/**
 * Formatea un Prisma Empleado en la shape segura de respuesta para búsqueda.
 * Solo expone campos necesarios, sin salario ni datos sensibles.
 * Exportada para tests unitarios.
 */
function _formatearRespuestaEmpleado(emp) {
  if (!emp) return null;
  return {
    id:         emp.id,
    documento:  emp.documento,
    nombre:     emp.nombre,
    areaId:     emp.areaId    || null,
    areaNombre: emp.area?.nombre || null,
    cargo:      emp.cargo?.trim() || null
  };
}
exports._formatearRespuestaEmpleado = _formatearRespuestaEmpleado;

/** Normaliza Prisma → shape consistente para el frontend */
function fmt(emp) {
  return {
    ...emp,
    area:    emp.area?.nombre || '',
    salario: Number(emp.salario)
  };
}

/** Resuelve areaId (UUID) a partir del nombre del área */
async function resolverAreaId(nombre, pgEmpresaId) {
  if (!nombre || !pgEmpresaId) return null;
  const a = await prisma.area.findFirst({
    where: { empresaId: pgEmpresaId, nombre: nombre.toUpperCase() }
  });
  return a?.id || null;
}

// ─── GET /api/empleados ────────────────────────────────────────────────────────

exports.listarEmpleados = async (req, res) => {
  try {
    const pgEmpresaId = isSuperAdmin(req)
      ? (req.query.empresaId || null)
      : req.pgEmpresaId;

    if (!isSuperAdmin(req) && !pgEmpresaId) {
      return res.status(403).json({ success: false, error: 'Sin empresa asignada' });
    }

    const where = {};
    if (pgEmpresaId)       where.empresaId = pgEmpresaId;
    if (req.query.estado)  where.estado    = req.query.estado;
    if (req.query.areaId)  where.areaId    = req.query.areaId;

    // Filtro por nombre de área (retrocompat)
    if (req.query.area && !req.query.areaId) {
      const areaPg = await prisma.area.findFirst({
        where: pgEmpresaId
          ? { empresaId: pgEmpresaId, nombre: req.query.area.toUpperCase() }
          : { nombre: req.query.area.toUpperCase() }
      });
      if (areaPg) where.areaId = areaPg.id;
      else return res.json({ success: true, empleados: [] });
    }

    // Búsqueda por texto
    if (req.query.q) {
      const q = req.query.q;
      where.OR = [
        { nombre:    { contains: q, mode: 'insensitive' } },
        { apellidos: { contains: q, mode: 'insensitive' } },
        { documento: { contains: q } }
      ];
    }

    // Restricción por áreas permitidas (roles no-admin)
    const sesion = req.session.usuario;
    const rolesAdmin = ['admin', 'super_admin'];
    if (sesion && !rolesAdmin.includes(sesion.rol)) {
      const areasPermitidas = sesion.areasPermitidas || [];
      if (areasPermitidas.length > 0) {
        const areaIds = await prisma.area.findMany({
          where: pgEmpresaId
            ? { empresaId: pgEmpresaId, nombre: { in: areasPermitidas } }
            : { nombre: { in: areasPermitidas } },
          select: { id: true }
        });
        where.areaId = { in: areaIds.map(a => a.id) };
      }
    }

    const empleados = await prisma.empleado.findMany({
      where,
      include: { area: { select: { nombre: true } }, empresa: { select: { nombre: true } } },
      orderBy: { nombre: 'asc' }
    });

    res.json({ success: true, empleados: empleados.map(fmt) });
  } catch (err) {
    console.error('Error listarEmpleados:', err);
    res.status(500).json({ success: false, error: 'Error al listar empleados' });
  }
};

// ─── GET /api/empleados/:id ────────────────────────────────────────────────────

exports.obtenerEmpleado = async (req, res) => {
  try {
    const emp = await prisma.empleado.findUnique({
      where:   { id: req.params.id },
      include: { area: { select: { nombre: true } }, empresa: { select: { nombre: true } } }
    });
    if (!emp) return res.status(404).json({ success: false, error: 'Empleado no encontrado' });

    if (!isSuperAdmin(req) && emp.empresaId !== req.pgEmpresaId) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    res.json({ success: true, empleado: fmt(emp) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al obtener empleado' });
  }
};

// ─── POST /api/empleados ───────────────────────────────────────────────────────

exports.crearEmpleado = async (req, res) => {
  try {
    const pgEmpresaId = isSuperAdmin(req)
      ? (req.body.empresaId || null)
      : req.pgEmpresaId;

    if (!pgEmpresaId) {
      return res.status(400).json({ success: false, error: 'Debe especificar una empresa' });
    }

    const { nombre, apellidos, documento, cargo, area, areaId,
            salario, tipoContrato, estado, fechaIngreso, fechaRetiro, fechaCumpleanos } = req.body;

    if (!nombre?.trim() || !documento?.trim()) {
      return res.status(400).json({ success: false, error: 'Nombre y documento son requeridos' });
    }

    const validacion = validarDatosEmpleado(nombre.trim(), documento.trim());
    if (!validacion.valido) {
      return res.status(400).json({ success: false, error: validacion.error });
    }

    // Resolver área
    const areaIdResuelto = areaId
      || await resolverAreaId(area, pgEmpresaId);

    const pgEmp = await prisma.empleado.create({
      data: {
        empresaId:       pgEmpresaId,
        areaId:          areaIdResuelto,
        documento:       documento.trim(),
        nombre:          nombre.trim(),
        apellidos:       apellidos?.trim()    || null,
        cargo:           cargo?.trim()        || null,
        salario:         parseFloat(salario)  || 0,
        tipoContrato:    tipoContrato         || 'indefinido',
        estado:          estado               || 'activo',
        fechaIngreso:    fechaIngreso    ? new Date(fechaIngreso)    : null,
        fechaRetiro:     fechaRetiro     ? new Date(fechaRetiro)     : null,
        fechaCumpleanos: fechaCumpleanos ? new Date(fechaCumpleanos) : null
      },
      include: { area: { select: { nombre: true } } }
    });

    // Sync MongoDB
    try {
      const mongoEmpresa = await _mongoEmpresaFromPg(pgEmpresaId);
      await Empleado.create({
        empresaId: mongoEmpresa?._id || null,
        documento: pgEmp.documento,
        nombre:    pgEmp.nombre,
        apellidos: pgEmp.apellidos || '',
        cargo:     pgEmp.cargo     || '',
        area:      pgEmp.area?.nombre || area || '',
        salario:   Number(pgEmp.salario),
        tipoContrato: pgEmp.tipoContrato,
        estado:       pgEmp.estado,
        fechaIngreso:    pgEmp.fechaIngreso    || null,
        fechaRetiro:     pgEmp.fechaRetiro     || null,
        fechaCumpleanos: pgEmp.fechaCumpleanos || null
      });
    } catch (syncErr) {
      if (syncErr.code !== 11000) console.warn('⚠️ Sync Mongo crearEmpleado:', syncErr.message);
    }

    res.status(201).json({ success: true, empleado: fmt(pgEmp) });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Ya existe un empleado con ese documento en esta empresa' });
    }
    console.error('Error crearEmpleado:', err);
    res.status(500).json({ success: false, error: 'Error al crear empleado' });
  }
};

// ─── PUT /api/empleados/:id ────────────────────────────────────────────────────

exports.actualizarEmpleado = async (req, res) => {
  try {
    const emp = await prisma.empleado.findUnique({ where: { id: req.params.id } });
    if (!emp) return res.status(404).json({ success: false, error: 'Empleado no encontrado' });

    if (!isSuperAdmin(req) && emp.empresaId !== req.pgEmpresaId) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    const { nombre, apellidos, documento, cargo, area, areaId,
            salario, tipoContrato, estado, fechaIngreso, fechaRetiro, fechaCumpleanos } = req.body;

    const data = {};
    if (nombre      !== undefined) data.nombre      = nombre.trim();
    if (apellidos   !== undefined) data.apellidos   = apellidos?.trim() || null;
    if (documento   !== undefined) data.documento   = documento.trim();
    if (cargo       !== undefined) data.cargo       = cargo?.trim() || null;
    if (salario     !== undefined) data.salario     = parseFloat(salario) || 0;
    if (tipoContrato !== undefined) data.tipoContrato = tipoContrato;
    if (estado      !== undefined) data.estado      = estado;
    if (fechaIngreso    !== undefined) data.fechaIngreso    = fechaIngreso    ? new Date(fechaIngreso)    : null;
    if (fechaRetiro     !== undefined) data.fechaRetiro     = fechaRetiro     ? new Date(fechaRetiro)     : null;
    if (fechaCumpleanos !== undefined) data.fechaCumpleanos = fechaCumpleanos ? new Date(fechaCumpleanos) : null;

    // Resolver cambio de área
    if (areaId !== undefined) {
      data.areaId = areaId;
    } else if (area !== undefined) {
      data.areaId = await resolverAreaId(area, emp.empresaId);
    }

    const actualizado = await prisma.empleado.update({
      where:   { id: req.params.id },
      data,
      include: { area: { select: { nombre: true } } }
    });

    // Sync MongoDB
    try {
      const mongoUpdate = {};
      if (data.nombre    ) mongoUpdate.nombre    = data.nombre;
      if (data.apellidos ) mongoUpdate.apellidos = data.apellidos;
      if (data.documento ) mongoUpdate.documento = data.documento;
      if (data.cargo     ) mongoUpdate.cargo     = data.cargo;
      if (data.salario   !== undefined) mongoUpdate.salario = Number(data.salario);
      if (data.estado    ) mongoUpdate.estado    = data.estado;
      if (actualizado.area) mongoUpdate.area     = actualizado.area.nombre;
      await Empleado.findOneAndUpdate({ documento: emp.documento, empresaId: { $exists: true } }, mongoUpdate);
    } catch (syncErr) {
      console.warn('⚠️ Sync Mongo actualizarEmpleado:', syncErr.message);
    }

    res.json({ success: true, empleado: fmt(actualizado) });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    if (err.code === 'P2002') return res.status(400).json({ success: false, error: 'Documento duplicado en esta empresa' });
    console.error('Error actualizarEmpleado:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar empleado' });
  }
};

// ─── DELETE /api/empleados/:id ─────────────────────────────────────────────────

exports.eliminarEmpleado = async (req, res) => {
  try {
    const emp = await prisma.empleado.findUnique({ where: { id: req.params.id } });
    if (!emp) return res.status(404).json({ success: false, error: 'Empleado no encontrado' });

    if (!isSuperAdmin(req) && emp.empresaId !== req.pgEmpresaId) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    // Verificar dependencias activas (liquidaciones aprobadas)
    const liquidaciones = await prisma.liquidacionNomina.count({
      where: { empleadoId: emp.id, estado: 'aprobada' }
    });
    if (liquidaciones > 0) {
      return res.status(409).json({
        success: false,
        error: `El empleado tiene ${liquidaciones} liquidación(es) aprobada(s). Retire al empleado en lugar de eliminarlo.`
      });
    }

    // Sync MongoDB
    try {
      await Empleado.findOneAndDelete({ documento: emp.documento });
    } catch (syncErr) {
      console.warn('⚠️ Sync Mongo eliminarEmpleado:', syncErr.message);
    }

    // PG cascade elimina turnos y novedades relacionados
    await prisma.empleado.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Empleado eliminado correctamente' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    console.error('Error eliminarEmpleado:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar empleado' });
  }
};

// ─── GET /api/empleados/:id/turnos ────────────────────────────────────────────

exports.obtenerTurnosEmpleado = async (req, res) => {
  try {
    const emp = await prisma.empleado.findUnique({ where: { id: req.params.id } });
    if (!emp) return res.status(404).json({ success: false, error: 'Empleado no encontrado' });

    if (!isSuperAdmin(req) && emp.empresaId !== req.pgEmpresaId) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    const { desde, hasta } = req.query;
    const where = { empleadoId: emp.id };
    if (desde || hasta) {
      where.fechaInicio = {};
      if (desde) where.fechaInicio.gte = new Date(desde);
      if (hasta) where.fechaInicio.lte = new Date(hasta);
    }

    const turnos = await prisma.turno.findMany({
      where,
      include: { area: { select: { nombre: true } } },
      orderBy: { fechaInicio: 'desc' }
    });

    res.json({ success: true, turnos });
  } catch (err) {
    console.error('Error obtenerTurnosEmpleado:', err);
    res.status(500).json({ success: false, error: 'Error al obtener turnos del empleado' });
  }
};

// ─── GET /api/empleados/buscar?documento=XXXX ────────────────────────────────

/**
 * Busca un empleado activo por documento dentro de la empresa activa.
 * No retorna datos de otra empresa (aislamiento multiempresa).
 */
exports.buscarPorDocumento = async (req, res) => {
  try {
    const { documento, empresaId: empresaIdQuery } = req.query;
    if (!documento?.trim()) {
      return res.status(400).json({ success: false, error: 'El parámetro documento es requerido' });
    }
    const empresaTarget = req.esSuperAdmin ? (empresaIdQuery || null) : req.pgEmpresaId;
    if (!empresaTarget) {
      return res.status(403).json({ success: false, error: 'Sin empresa activa asignada' });
    }
    const emp = await prisma.empleado.findFirst({
      where: { documento: documento.trim(), empresaId: empresaTarget, estado: 'activo' },
      include: { area: { select: { id: true, nombre: true } } }
    });
    if (emp) return res.json({ success: true, existe: true, empleado: _formatearRespuestaEmpleado(emp) });

    // Fallback: buscar en MongoDB (empleados creados desde módulo Turnos)
    const mongoEmpresa = await _mongoEmpresaFromPg(empresaTarget);
    if (mongoEmpresa) {
      const empMongo = await Empleado.findOne({ documento: documento.trim(), empresaId: mongoEmpresa._id, estado: 'activo' }).populate('areaId', 'nombre');
      if (empMongo) {
        return res.json({
          success: true, existe: true,
          empleado: {
            id:       empMongo._id.toString(),
            nombre:   empMongo.nombre,
            areaId:   empMongo.areaId?._id?.toString() || null,
            areaNombre: empMongo.areaId?.nombre || empMongo.area || null,
            cargo:    empMongo.cargo || null
          }
        });
      }
    }
    return res.json({ success: true, existe: false });
  } catch (err) {
    console.error('Error buscarPorDocumento:', err);
    res.status(500).json({ success: false, error: 'Error al buscar empleado' });
  }
};

// ─── Helper privado ────────────────────────────────────────────────────────────

const Empresa = require('../models/Empresa');

async function _mongoEmpresaFromPg(pgEmpresaId) {
  if (!pgEmpresaId) return null;
  try {
    const pgEmpresa = await prisma.empresa.findUnique({
      where: { id: pgEmpresaId }, select: { nit: true, nombre: true }
    });
    if (!pgEmpresa) return null;
    return Empresa.findOne({ $or: [{ nit: pgEmpresa.nit }, { nombre: pgEmpresa.nombre }] });
  } catch (_) {
    return null;
  }
}
