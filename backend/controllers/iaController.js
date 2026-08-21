'use strict';

const prisma             = require('../lib/prisma');
const { evaluar }        = require('../services/ia/constraintEngine');
const { simular }        = require('../services/ia/simulador');
const { procesar }       = require('../services/ia/asistenteIA');
const propuestasService  = require('../services/ia/propuestasService');
const { sanitizarTexto } = require('../services/ia/sanitizer');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgEmpresaId = (req) => req.pgEmpresaId || req.session?.usuario?.pgEmpresaId || null;
const pgUsuarioId = (req) => req.pgId        || req.session?.usuario?.pgId        || null;
const esSA        = (req) => req.session?.usuario?.rol === 'super_admin';

async function obtenerConfigIA(empresaId) {
  if (!empresaId) return null;
  return prisma.configuracionIA.findUnique({ where: { empresaId } });
}

function enviarError(res, err) {
  const status = err.statusCode || err.status || 500;
  const msg    = status < 500 ? err.message : 'Error interno del servidor';
  console.error('[iaController]', err.message);
  return res.status(status).json({ success: false, error: msg });
}

// ─── Configuración del módulo IA ──────────────────────────────────────────────

/**
 * GET /api/ia/configuracion
 * Retorna la configuración IA de la empresa (sin apiKey).
 */
exports.obtenerConfiguracion = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    if (!eid && !esSA(req)) return res.status(403).json({ success: false, error: 'Sin empresa activa' });

    const config = await prisma.configuracionIA.findUnique({ where: { empresaId: eid } });
    res.json({ success: true, configuracion: config || null });
  } catch (err) {
    enviarError(res, err);
  }
};

/**
 * PUT /api/ia/configuracion
 * Crea o actualiza la configuración IA de la empresa.
 * Requiere permiso ia.configurar.
 */
exports.actualizarConfiguracion = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    if (!eid) return res.status(403).json({ success: false, error: 'Sin empresa activa' });

    const {
      habilitada, proveedor, modelo, temperatura,
      limiteTokensRespuesta, limiteMensualTokens,
      permitirNombres, retencionAuditoriaDias,
    } = req.body;

    const data = {};
    if (habilitada            !== undefined) data.habilitada            = Boolean(habilitada);
    if (proveedor             !== undefined) data.proveedor             = String(proveedor).substring(0, 50);
    if (modelo                !== undefined) data.modelo                = String(modelo).substring(0, 100);
    if (temperatura           !== undefined) data.temperatura           = parseFloat(temperatura);
    if (limiteTokensRespuesta !== undefined) data.limiteTokensRespuesta = parseInt(limiteTokensRespuesta, 10);
    if (limiteMensualTokens   !== undefined) data.limiteMensualTokens   = limiteMensualTokens ? parseInt(limiteMensualTokens, 10) : null;
    if (permitirNombres       !== undefined) data.permitirNombres       = Boolean(permitirNombres);
    if (retencionAuditoriaDias !== undefined) data.retencionAuditoriaDias = parseInt(retencionAuditoriaDias, 10);
    data.permitirDatosNomina = false;

    const config = await prisma.configuracionIA.upsert({
      where:  { empresaId: eid },
      update: data,
      create: { empresaId: eid, ...data },
    });

    res.json({ success: true, configuracion: config });
  } catch (err) {
    enviarError(res, err);
  }
};

// ─── Validación determinística ────────────────────────────────────────────────

/**
 * POST /api/ia/validar
 * Ejecuta constraintEngine sobre las asignaciones enviadas.
 * No llama a ningún proveedor IA — es 100 % determinístico.
 */
exports.validarProgramacion = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    if (!eid && !esSA(req)) return res.status(403).json({ success: false, error: 'Sin empresa activa' });

    const { asignaciones = [], turnos = [], areasRequeridas = [], limites = {} } = req.body;

    if (!Array.isArray(asignaciones)) {
      return res.status(400).json({ success: false, error: 'asignaciones debe ser un array' });
    }

    const resultado = evaluar({ asignaciones, turnos, areasRequeridas, limites });
    res.json({ success: true, ...resultado });
  } catch (err) {
    enviarError(res, err);
  }
};

// ─── Simulación ───────────────────────────────────────────────────────────────

/**
 * POST /api/ia/simular
 * Simula un cambio en la programación sin persistirlo.
 */
exports.simularCambio = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    if (!eid && !esSA(req)) return res.status(403).json({ success: false, error: 'Sin empresa activa' });

    const { tipo, asignacionesBase = [], parametros = {}, turnos = [], areasRequeridas = [], limites = {} } = req.body;

    if (!tipo) return res.status(400).json({ success: false, error: 'Campo tipo requerido' });
    if (!Array.isArray(asignacionesBase)) return res.status(400).json({ success: false, error: 'asignacionesBase debe ser un array' });

    const resultado = simular({ tipo, asignacionesBase, parametros, turnos, areasRequeridas, limites });
    res.json({ success: true, simulacion: resultado });
  } catch (err) {
    if (err.message?.startsWith('Tipo de simulación')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    enviarError(res, err);
  }
};

// ─── Asistente conversacional ─────────────────────────────────────────────────

/**
 * POST /api/ia/chat
 * Envía un mensaje al asistente IA.
 */
exports.chat = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    const uid = pgUsuarioId(req);
    if (!eid) return res.status(403).json({ success: false, error: 'Sin empresa activa' });

    const { pregunta, conversacionId, contextoOperativo } = req.body;
    if (!pregunta || typeof pregunta !== 'string' || !pregunta.trim()) {
      return res.status(400).json({ success: false, error: 'Campo pregunta requerido' });
    }
    if (pregunta.length > 4000) {
      return res.status(400).json({ success: false, error: 'Pregunta demasiado larga (máx 4000 chars)' });
    }

    const configIA = await obtenerConfigIA(eid);
    if (!configIA?.habilitada) {
      return res.status(403).json({ success: false, error: 'El módulo IA no está habilitado para esta empresa.' });
    }

    const resultado = await procesar({
      empresaId:        eid,
      usuarioId:        uid,
      pregunta:         sanitizarTexto(pregunta.trim()),
      conversacionId:   conversacionId || null,
      contextoOperativo: contextoOperativo || {},
      configIA,
    });

    res.json({ success: true, ...resultado });
  } catch (err) {
    if (['IA_DESHABILITADA', 'CUOTA_EXCEDIDA', 'SIN_API_KEY'].includes(err.code)) {
      return res.status(403).json({ success: false, error: err.message, code: err.code });
    }
    enviarError(res, err);
  }
};

// ─── Propuestas ───────────────────────────────────────────────────────────────

/**
 * GET /api/ia/propuestas
 */
exports.listarPropuestas = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    if (!eid && !esSA(req)) return res.status(403).json({ success: false, error: 'Sin empresa activa' });

    const { estado, areaId, pagina, porPagina } = req.query;
    const result = await propuestasService.listarPropuestas(eid, {
      estado,
      areaId,
      pagina:    parseInt(pagina    || '1',  10),
      porPagina: parseInt(porPagina || '20', 10),
    });

    res.json({ success: true, ...result });
  } catch (err) {
    enviarError(res, err);
  }
};

/**
 * GET /api/ia/propuestas/:id
 */
exports.obtenerPropuesta = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    const propuesta = await propuestasService.obtenerPropuesta(req.params.id, eid);
    if (!propuesta) return res.status(404).json({ success: false, error: 'Propuesta no encontrada' });
    res.json({ success: true, propuesta });
  } catch (err) {
    enviarError(res, err);
  }
};

/**
 * POST /api/ia/propuestas
 */
exports.crearPropuesta = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    const uid = pgUsuarioId(req);
    if (!eid) return res.status(403).json({ success: false, error: 'Sin empresa activa' });

    const { nombre, objetivo, periodoInicio, periodoFin } = req.body;
    if (!nombre || !objetivo || !periodoInicio || !periodoFin) {
      return res.status(400).json({ success: false, error: 'Campos requeridos: nombre, objetivo, periodoInicio, periodoFin' });
    }

    const propuesta = await propuestasService.crearPropuesta({
      empresaId:  eid,
      creadoPorId: uid,
      ...req.body,
    });

    res.status(201).json({ success: true, propuesta });
  } catch (err) {
    enviarError(res, err);
  }
};

/**
 * PATCH /api/ia/propuestas/:id/aprobar
 */
exports.aprobarPropuesta = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    const uid = pgUsuarioId(req);
    const propuesta = await propuestasService.aprobarPropuesta(req.params.id, eid, uid);
    res.json({ success: true, propuesta });
  } catch (err) {
    enviarError(res, err);
  }
};

/**
 * PATCH /api/ia/propuestas/:id/rechazar
 */
exports.rechazarPropuesta = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    const uid = pgUsuarioId(req);
    const propuesta = await propuestasService.rechazarPropuesta(req.params.id, eid, uid);
    res.json({ success: true, propuesta });
  } catch (err) {
    enviarError(res, err);
  }
};

// ─── Auditoría IA ─────────────────────────────────────────────────────────────

/**
 * GET /api/ia/auditoria
 * Lista ejecuciones IA de la empresa (con paginación).
 */
exports.listarAuditoria = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    if (!eid && !esSA(req)) return res.status(403).json({ success: false, error: 'Sin empresa activa' });

    const pagina    = parseInt(req.query.pagina    || '1',  10);
    const porPagina = parseInt(req.query.porPagina || '50', 10);
    const where     = eid ? { empresaId: eid } : {};
    if (req.query.tipoOperacion) where.tipoOperacion = req.query.tipoOperacion;
    if (req.query.resultado)     where.resultado     = req.query.resultado;

    const [total, items] = await Promise.all([
      prisma.ejecucionIA.count({ where }),
      prisma.ejecucionIA.findMany({
        where,
        select: {
          id: true, tipoOperacion: true, proveedor: true, modelo: true,
          tokensEntrada: true, tokensSalida: true, duracionMs: true,
          resultado: true, codigoError: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip:    (pagina - 1) * porPagina,
        take:    porPagina,
      }),
    ]);

    res.json({ success: true, total, pagina, porPagina, items });
  } catch (err) {
    enviarError(res, err);
  }
};
