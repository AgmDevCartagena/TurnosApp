'use strict';

const prisma = require('../lib/prisma');
const motor  = require('../services/motorCalculoNomina');

// ── Helpers de sesión ─────────────────────────────────────────────────────────
function getPgEmpresaId(req, body = {}) {
  if (req.esSuperAdmin && body.pgEmpresaId) return body.pgEmpresaId;
  return req.pgEmpresaId;
}
function getMongoEmpresaId(req, body = {}) {
  if (req.esSuperAdmin && body.empresaId) return body.empresaId;
  return req.empresaId || req.session?.usuario?.empresaId;
}
function getPgUsuarioId(req) {
  return req.session?.usuario?.pgId || req.session?.usuario?.id || null;
}

// ══════════════════════════════════════════════════════════════════════════════
// PARÁMETROS DE NÓMINA
// ══════════════════════════════════════════════════════════════════════════════

exports.listarParametros = async (req, res) => {
  try {
    const empresaId = getPgEmpresaId(req);
    if (!empresaId) return res.json({ success: true, parametros: [] });
    const where = { empresaId };
    if (req.query.estado) where.estado = req.query.estado;

    const parametros = await prisma.parametroNomina.findMany({
      where,
      orderBy: [{ codigo: 'asc' }, { vigenciaDesde: 'desc' }]
    });
    res.json({ success: true, parametros });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al listar parámetros de nómina.' });
  }
};

exports.crearParametro = async (req, res) => {
  try {
    const empresaId = getPgEmpresaId(req);
    const { codigo, nombre, descripcion, valor, tipoValor, vigenciaDesde, vigenciaHasta } = req.body;

    if (!codigo || !nombre || valor === undefined || !vigenciaDesde) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos: codigo, nombre, valor, vigenciaDesde.' });
    }

    const param = await prisma.parametroNomina.create({
      data: {
        empresaId,
        codigo:        String(codigo).toUpperCase().trim(),
        nombre,
        descripcion:   descripcion || null,
        valor:         parseFloat(valor),
        tipoValor:     tipoValor || 'valor_fijo',
        vigenciaDesde: new Date(vigenciaDesde),
        vigenciaHasta: vigenciaHasta ? new Date(vigenciaHasta) : null
      }
    });
    res.status(201).json({ success: true, parametro: param });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Ya existe un parámetro con ese código y vigencia para esta empresa.' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.actualizarParametro = async (req, res) => {
  try {
    const empresaId = getPgEmpresaId(req);
    const existing = await prisma.parametroNomina.findFirst({ where: { id: req.params.id, empresaId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Parámetro no encontrado.' });

    const data = {};
    const permitidos = ['codigo', 'nombre', 'descripcion', 'valor', 'tipoValor', 'vigenciaDesde', 'vigenciaHasta'];
    permitidos.forEach(c => {
      if (req.body[c] !== undefined) {
        if (c === 'vigenciaDesde' || c === 'vigenciaHasta') data[c] = req.body[c] ? new Date(req.body[c]) : null;
        else if (c === 'valor') data[c] = parseFloat(req.body[c]);
        else if (c === 'codigo') data[c] = String(req.body[c]).toUpperCase().trim();
        else data[c] = req.body[c];
      }
    });
    const param = await prisma.parametroNomina.update({ where: { id: req.params.id }, data });
    res.json({ success: true, parametro: param });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.cambiarEstadoParametro = async (req, res) => {
  try {
    const empresaId = getPgEmpresaId(req);
    const { estado } = req.body;
    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ success: false, error: 'Estado debe ser activo o inactivo.' });
    }
    const existing = await prisma.parametroNomina.findFirst({ where: { id: req.params.id, empresaId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Parámetro no encontrado.' });
    const param = await prisma.parametroNomina.update({ where: { id: req.params.id }, data: { estado } });
    res.json({ success: true, parametro: param });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// CONCEPTOS DE NÓMINA
// ══════════════════════════════════════════════════════════════════════════════

exports.listarConceptos = async (req, res) => {
  try {
    const empresaId = getPgEmpresaId(req);
    if (!empresaId) return res.json({ success: true, conceptos: [] });
    const where = { empresaId };
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.tipo)   where.tipo   = req.query.tipo;

    const conceptos = await prisma.conceptoNomina.findMany({
      where,
      orderBy: [{ orden: 'asc' }, { codigo: 'asc' }]
    });
    res.json({ success: true, conceptos });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al listar conceptos de nómina.' });
  }
};

exports.crearConcepto = async (req, res) => {
  try {
    const empresaId = getPgEmpresaId(req);
    const { codigo, nombre, descripcion, tipo, referenciaParametro, base, formula, afectaTotal, orden, vigenciaDesde, vigenciaHasta } = req.body;

    if (!codigo || !nombre || !tipo || !vigenciaDesde) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos: codigo, nombre, tipo, vigenciaDesde.' });
    }

    const concepto = await prisma.conceptoNomina.create({
      data: {
        empresaId,
        codigo:              String(codigo).toUpperCase().trim(),
        nombre,
        descripcion:         descripcion || null,
        tipo,
        referenciaParametro: referenciaParametro || null,
        base:                base || 'salarioBase',
        formula:             formula || null,
        afectaTotal:         afectaTotal !== undefined ? Boolean(afectaTotal) : true,
        orden:               orden || 0,
        vigenciaDesde:       new Date(vigenciaDesde),
        vigenciaHasta:       vigenciaHasta ? new Date(vigenciaHasta) : null
      }
    });
    res.status(201).json({ success: true, concepto });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Ya existe un concepto con ese código para esta empresa.' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.actualizarConcepto = async (req, res) => {
  try {
    const empresaId = getPgEmpresaId(req);
    const existing = await prisma.conceptoNomina.findFirst({ where: { id: req.params.id, empresaId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Concepto no encontrado.' });

    const data = {};
    const permitidos = ['nombre', 'descripcion', 'tipo', 'referenciaParametro', 'base', 'formula', 'afectaTotal', 'orden', 'vigenciaDesde', 'vigenciaHasta'];
    permitidos.forEach(c => {
      if (req.body[c] !== undefined) {
        if (c === 'vigenciaDesde' || c === 'vigenciaHasta') data[c] = req.body[c] ? new Date(req.body[c]) : null;
        else data[c] = req.body[c];
      }
    });
    const concepto = await prisma.conceptoNomina.update({ where: { id: req.params.id }, data });
    res.json({ success: true, concepto });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.cambiarEstadoConcepto = async (req, res) => {
  try {
    const empresaId = getPgEmpresaId(req);
    const { estado } = req.body;
    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ success: false, error: 'Estado debe ser activo o inactivo.' });
    }
    const existing = await prisma.conceptoNomina.findFirst({ where: { id: req.params.id, empresaId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Concepto no encontrado.' });
    const concepto = await prisma.conceptoNomina.update({ where: { id: req.params.id }, data: { estado } });
    res.json({ success: true, concepto });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// CÁLCULO DE NÓMINA
// ══════════════════════════════════════════════════════════════════════════════

exports.calcularIndividual = async (req, res) => {
  try {
    const pgEmpresaId = getPgEmpresaId(req, req.body);
    const empresaId   = getMongoEmpresaId(req, req.body);
    const pgUsuarioId = getPgUsuarioId(req);
    const { documentoEmpleado, fechaInicio, fechaFin } = req.body;

    if (!documentoEmpleado) {
      return res.status(400).json({ success: false, error: 'El documentoEmpleado es requerido.' });
    }
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ success: false, error: 'Las fechas fechaInicio y fechaFin son requeridas.' });
    }

    const liquidacion = await motor.calcularIndividual({
      documento: documentoEmpleado,
      fechaInicio, fechaFin,
      pgEmpresaId, pgUsuarioId,
      empresaId,
      guardar: true
    });

    res.json({ success: true, liquidacion });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

exports.calcularPorArea = async (req, res) => {
  try {
    const pgEmpresaId = getPgEmpresaId(req, req.body);
    const empresaId   = getMongoEmpresaId(req, req.body);
    const pgUsuarioId = getPgUsuarioId(req);
    const { areaId, fechaInicio, fechaFin } = req.body;

    if (!areaId) {
      return res.status(400).json({ success: false, error: 'El areaId es requerido.' });
    }
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ success: false, error: 'Las fechas fechaInicio y fechaFin son requeridas.' });
    }

    const resultado = await motor.calcularPorArea({ areaId, fechaInicio, fechaFin, pgEmpresaId, pgUsuarioId, empresaId });
    res.json({ success: true, ...resultado });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// LIQUIDACIONES
// ══════════════════════════════════════════════════════════════════════════════

exports.listarLiquidaciones = async (req, res) => {
  try {
    const empresaId = getPgEmpresaId(req);
    if (!empresaId) return res.json({ success: true, liquidaciones: [] });
    const where = { empresaId };
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.documentoEmpleado) {
      where.empleado = { documento: req.query.documentoEmpleado };
    }

    const liquidaciones = await prisma.liquidacionNomina.findMany({
      where,
      include: {
        empleado: { select: { nombre: true, apellidos: true, documento: true } },
        detalles: true
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    res.json({ success: true, liquidaciones });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al listar liquidaciones.' });
  }
};

exports.obtenerLiquidacion = async (req, res) => {
  try {
    const empresaId = getPgEmpresaId(req);
    const liq = await prisma.liquidacionNomina.findFirst({
      where: { id: req.params.id, empresaId },
      include: {
        empleado: { select: { nombre: true, apellidos: true, documento: true } },
        detalles: true
      }
    });
    if (!liq) return res.status(404).json({ success: false, error: 'Liquidación no encontrada.' });
    res.json({ success: true, liquidacion: liq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.aprobarLiquidacion = async (req, res) => {
  try {
    const empresaId   = getPgEmpresaId(req);
    const pgUsuarioId = getPgUsuarioId(req);
    const liq = await prisma.liquidacionNomina.findFirst({ where: { id: req.params.id, empresaId } });
    if (!liq) return res.status(404).json({ success: false, error: 'Liquidación no encontrada.' });
    if (liq.estado !== 'borrador') {
      return res.status(400).json({ success: false, error: `No se puede aprobar una liquidación en estado "${liq.estado}".` });
    }
    const updated = await prisma.liquidacionNomina.update({
      where: { id: req.params.id },
      data:  { estado: 'aprobada', aprobadoPorId: pgUsuarioId, fechaAprobacion: new Date() }
    });
    res.json({ success: true, liquidacion: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.anularLiquidacion = async (req, res) => {
  try {
    const empresaId = getPgEmpresaId(req);
    const liq = await prisma.liquidacionNomina.findFirst({ where: { id: req.params.id, empresaId } });
    if (!liq) return res.status(404).json({ success: false, error: 'Liquidación no encontrada.' });
    if (liq.estado === 'aprobada') {
      return res.status(400).json({ success: false, error: 'No se puede anular una liquidación ya aprobada.' });
    }
    const updated = await prisma.liquidacionNomina.update({ where: { id: req.params.id }, data: { estado: 'anulada' } });
    res.json({ success: true, liquidacion: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.reportes = async (req, res) => {
  try {
    const empresaId = getPgEmpresaId(req);
    if (!empresaId) return res.json({ success: true, resumen: { totalLiquidaciones: 0, totalDevengado: 0, totalDeducciones: 0, totalNeto: 0 }, liquidaciones: [] });
    const { fechaInicio, fechaFin, estado } = req.query;

    const where = { empresaId };
    if (estado) where.estado = estado;
    if (fechaInicio && fechaFin) {
      where.periodoInicio = { gte: new Date(fechaInicio) };
      where.periodoFin    = { lte: new Date(fechaFin) };
    }

    const liquidaciones = await prisma.liquidacionNomina.findMany({
      where,
      include: { empleado: { select: { nombre: true, apellidos: true, documento: true } } },
      orderBy: { periodoInicio: 'desc' },
      take: 500
    });

    const totalDevengado   = liquidaciones.reduce((s, l) => s + Number(l.totalDevengado || 0), 0);
    const totalDeducciones = liquidaciones.reduce((s, l) => s + Number(l.totalDeducciones || 0), 0);
    const totalNeto        = liquidaciones.reduce((s, l) => s + Number(l.netoPagar || 0), 0);

    res.json({
      success: true,
      resumen: {
        totalLiquidaciones: liquidaciones.length,
        totalDevengado:     +totalDevengado.toFixed(2),
        totalDeducciones:   +totalDeducciones.toFixed(2),
        totalNeto:          +totalNeto.toFixed(2)
      },
      liquidaciones
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
