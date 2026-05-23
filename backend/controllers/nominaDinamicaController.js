'use strict';

const motor           = require('../services/motorCalculoNomina');
const ParametroNomina = require('../models/ParametroNomina');
const ConceptoNomina  = require('../models/ConceptoNomina');
const LiquidacionNomina = require('../models/LiquidacionNomina');

// ── Helpers de sesión ─────────────────────────────────────────────────────────
function getEmpresaId(req, body = {}) {
  // Para super_admin, admite empresaId desde el body (operación explícita sobre una empresa)
  if (req.esSuperAdmin && body.empresaId) return body.empresaId;
  return req.empresaId || req.session?.usuario?.empresaId;
}
function getUsuarioId(req) {
  return req.session?.usuario?.id || req.session?.usuario?._id;
}

// ══════════════════════════════════════════════════════════════════════════════
// PARÁMETROS DE NÓMINA
// ══════════════════════════════════════════════════════════════════════════════

exports.listarParametros = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const filtro = { empresaId };
    if (req.query.estado) filtro.estado = req.query.estado;

    const parametros = await ParametroNomina.find(filtro).sort({ codigo: 1, vigenciaDesde: -1 });
    res.json({ success: true, parametros });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al listar parámetros de nómina.' });
  }
};

exports.crearParametro = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const { codigo, nombre, descripcion, valor, tipoValor, vigenciaDesde, vigenciaHasta } = req.body;

    if (!codigo || !nombre || valor === undefined || !vigenciaDesde) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos: codigo, nombre, valor, vigenciaDesde.' });
    }

    const param = await ParametroNomina.create({
      empresaId, codigo, nombre, descripcion, valor, tipoValor, vigenciaDesde,
      vigenciaHasta: vigenciaHasta || null
    });
    res.status(201).json({ success: true, parametro: param });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'Ya existe un parámetro con ese código y vigencia para esta empresa.' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.actualizarParametro = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const param = await ParametroNomina.findOne({ _id: req.params.id, empresaId });
    if (!param) return res.status(404).json({ success: false, error: 'Parámetro no encontrado.' });

    const campos = ['nombre', 'descripcion', 'valor', 'tipoValor', 'vigenciaDesde', 'vigenciaHasta'];
    campos.forEach(c => { if (req.body[c] !== undefined) param[c] = req.body[c]; });
    await param.save();
    res.json({ success: true, parametro: param });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.cambiarEstadoParametro = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const { estado } = req.body;
    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ success: false, error: 'Estado debe ser activo o inactivo.' });
    }
    const param = await ParametroNomina.findOneAndUpdate(
      { _id: req.params.id, empresaId },
      { estado },
      { new: true }
    );
    if (!param) return res.status(404).json({ success: false, error: 'Parámetro no encontrado.' });
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
    const empresaId = getEmpresaId(req);
    const filtro = { empresaId };
    if (req.query.estado) filtro.estado = req.query.estado;
    if (req.query.tipo)   filtro.tipo   = req.query.tipo;

    const conceptos = await ConceptoNomina.find(filtro).sort({ orden: 1, codigo: 1 });
    res.json({ success: true, conceptos });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al listar conceptos de nómina.' });
  }
};

exports.crearConcepto = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const { codigo, nombre, descripcion, tipo, referenciaParametro, base, formula, afectaTotal, orden, vigenciaDesde, vigenciaHasta } = req.body;

    if (!codigo || !nombre || !tipo || !vigenciaDesde) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos: codigo, nombre, tipo, vigenciaDesde.' });
    }

    const concepto = await ConceptoNomina.create({
      empresaId, codigo, nombre, descripcion, tipo, referenciaParametro,
      base: base || 'salarioBase', formula, afectaTotal, orden: orden || 0,
      vigenciaDesde, vigenciaHasta: vigenciaHasta || null
    });
    res.status(201).json({ success: true, concepto });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'Ya existe un concepto con ese código para esta empresa.' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.actualizarConcepto = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const concepto = await ConceptoNomina.findOne({ _id: req.params.id, empresaId });
    if (!concepto) return res.status(404).json({ success: false, error: 'Concepto no encontrado.' });

    const campos = ['nombre', 'descripcion', 'tipo', 'referenciaParametro', 'base', 'formula', 'afectaTotal', 'orden', 'vigenciaDesde', 'vigenciaHasta'];
    campos.forEach(c => { if (req.body[c] !== undefined) concepto[c] = req.body[c]; });
    await concepto.save();
    res.json({ success: true, concepto });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.cambiarEstadoConcepto = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const { estado } = req.body;
    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ success: false, error: 'Estado debe ser activo o inactivo.' });
    }
    const concepto = await ConceptoNomina.findOneAndUpdate(
      { _id: req.params.id, empresaId },
      { estado },
      { new: true }
    );
    if (!concepto) return res.status(404).json({ success: false, error: 'Concepto no encontrado.' });
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
    const empresaId = getEmpresaId(req, req.body);
    const usuarioId = getUsuarioId(req);
    const { documentoEmpleado, fechaInicio, fechaFin } = req.body;

    if (!documentoEmpleado) {
      return res.status(400).json({ success: false, error: 'El documentoEmpleado es requerido.' });
    }
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ success: false, error: 'Las fechas fechaInicio y fechaFin son requeridas.' });
    }

    const liquidacion = await motor.calcularIndividual({
      documento: documentoEmpleado,
      fechaInicio,
      fechaFin,
      empresaId,
      usuarioId,
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
    const empresaId = getEmpresaId(req, req.body);
    const usuarioId = getUsuarioId(req);
    const { areaId, fechaInicio, fechaFin } = req.body;

    if (!areaId) {
      return res.status(400).json({ success: false, error: 'El areaId es requerido.' });
    }
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ success: false, error: 'Las fechas fechaInicio y fechaFin son requeridas.' });
    }

    const resultado = await motor.calcularPorArea({ areaId, fechaInicio, fechaFin, empresaId, usuarioId });
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
    const empresaId = getEmpresaId(req);
    const filtro = { empresaId };
    if (req.query.estado)            filtro.estado             = req.query.estado;
    if (req.query.documentoEmpleado) filtro.documentoEmpleado  = req.query.documentoEmpleado;

    const liquidaciones = await LiquidacionNomina.find(filtro)
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ success: true, liquidaciones });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al listar liquidaciones.' });
  }
};

exports.obtenerLiquidacion = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const liq = await LiquidacionNomina.findOne({ _id: req.params.id, empresaId });
    if (!liq) return res.status(404).json({ success: false, error: 'Liquidación no encontrada.' });
    res.json({ success: true, liquidacion: liq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.aprobarLiquidacion = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const usuarioId = getUsuarioId(req);
    const liq = await LiquidacionNomina.findOne({ _id: req.params.id, empresaId });
    if (!liq) return res.status(404).json({ success: false, error: 'Liquidación no encontrada.' });
    if (liq.estado !== 'borrador') {
      return res.status(400).json({ success: false, error: `No se puede aprobar una liquidación en estado "${liq.estado}".` });
    }
    liq.estado         = 'aprobada';
    liq.aprobadoPor    = usuarioId;
    liq.fechaAprobacion = new Date();
    await liq.save();
    res.json({ success: true, liquidacion: liq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.anularLiquidacion = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const liq = await LiquidacionNomina.findOne({ _id: req.params.id, empresaId });
    if (!liq) return res.status(404).json({ success: false, error: 'Liquidación no encontrada.' });
    if (liq.estado === 'aprobada') {
      return res.status(400).json({ success: false, error: 'No se puede anular una liquidación ya aprobada.' });
    }
    liq.estado = 'anulada';
    await liq.save();
    res.json({ success: true, liquidacion: liq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.reportes = async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const { fechaInicio, fechaFin, estado } = req.query;

    const filtro = { empresaId };
    if (estado) filtro.estado = estado;
    if (fechaInicio && fechaFin) {
      filtro.periodoInicio = { $gte: new Date(fechaInicio) };
      filtro.periodoFin    = { $lte: new Date(fechaFin) };
    }

    const liquidaciones = await LiquidacionNomina.find(filtro).sort({ periodoInicio: -1 }).limit(500);

    const totalDevengado    = liquidaciones.reduce((s, l) => s + (l.totalDevengado || 0), 0);
    const totalDeducciones  = liquidaciones.reduce((s, l) => s + (l.totalDeducciones || 0), 0);
    const totalNeto         = liquidaciones.reduce((s, l) => s + (l.netoPagar || 0), 0);

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
