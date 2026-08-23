'use strict';

const prisma             = require('../lib/prisma');
const aiProviders        = require('../config/aiProviders');
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

    const hasCompanyKey = !!(config?.apiKeyEncriptada);
    const hasEnvKey     = !!(process.env.AI_API_KEY && process.env.AI_API_KEY.length > 5);
    const globalKilled  = process.env.AI_ENABLED === 'false';

    let connectionStatus;
    if (globalKilled) {
      connectionStatus = 'disabled';
    } else if (!config) {
      connectionStatus = 'no_key';
    } else if (!config.habilitada) {
      connectionStatus = 'disabled';
    } else if (!hasCompanyKey && !hasEnvKey) {
      connectionStatus = 'no_key';
    } else if (config.apiKeyEstado === 'configurada' || hasEnvKey) {
      connectionStatus = 'configured';
    } else if (hasCompanyKey && config.apiKeyEstado === 'pendiente') {
      connectionStatus = 'pending'; // clave registrada, aún sin validar
    } else if (hasCompanyKey && config.apiKeyEstado === 'error') {
      connectionStatus = 'error'; // clave inválida
    } else {
      connectionStatus = 'no_key';
    }

    const providerInfo = config ? aiProviders.buscarPorCodigo(config.proveedor) : null;

    const configSafe = config ? {
      id:                    config.id,
      empresaId:             config.empresaId,
      habilitada:            config.habilitada,
      proveedor:             config.proveedor,
      providerName:          providerInfo?.nombre || config.proveedor,
      modelo:                config.modelo,
      temperatura:           config.temperatura,
      limiteTokensRespuesta: config.limiteTokensRespuesta,
      limiteMensualTokens:   config.limiteMensualTokens,
      permitirDatosNomina:   config.permitirDatosNomina,
      permitirNombres:       config.permitirNombres,
      retencionAuditoriaDias:config.retencionAuditoriaDias,
      // API Key metadata — NUNCA la clave cifrada ni el valor plano
      apiKeyEstado:          config.apiKeyEstado || (hasEnvKey ? 'env' : null),
      apiKeyMascara:         config.apiKeyMascara || (hasEnvKey ? '••••••(servidor)' : null),
      apiKeyFechaValidacion: config.apiKeyFechaValidacion,
      createdAt:             config.createdAt,
      updatedAt:             config.updatedAt,
    } : null;

    res.json({
      success:             true,
      configuracion:       configSafe,
      serverKeyConfigured: hasCompanyKey || hasEnvKey,
      connectionStatus,
    });
  } catch (err) {
    enviarError(res, err);
  }
};

/**
 * GET /api/ia/providers
 * Catálogo de proveedores IA activos (sin secretos).
 */
exports.listarProveedores = (req, res) => {
  res.json({ success: true, providers: aiProviders.listarActivos() });
};

/**
 * GET /api/ia/providers/models
 * Retorna los modelos disponibles para el proveedor configurado en la empresa,
 * consultando la API real del proveedor con la clave almacenada.
 */
exports.listarModelosProveedor = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    if (!eid) return res.status(403).json({ success: false, error: 'Sin empresa activa' });

    const config = await prisma.configuracionIA.findUnique({ where: { empresaId: eid } });
    if (!config?.proveedor) return res.json({ success: true, modelos: [], fuente: 'sin_config' });

    const enc = require('../services/ia/encryptionService');
    let apiKey = null;
    if (config.apiKeyEncriptada && enc.masterKeyConfigurada()) {
      try { apiKey = enc.descifrar(config.apiKeyEncriptada); } catch {}
    }
    if (!apiKey) apiKey = process.env.AI_API_KEY || null;
    if (!apiKey) return res.json({ success: true, modelos: [], fuente: 'sin_clave' });

    const provInfo = aiProviders.buscarPorCodigo(config.proveedor);
    const baseUrl  = process.env.AI_BASE_URL || provInfo?.baseUrlDefault || null;

    let modelos = [];
    let fuente  = 'api';

    try {
      if (config.proveedor === 'anthropic' || config.proveedor === 'google_gemini') {
        fuente  = 'catalogo';
        modelos = provInfo?.modelosSugeridos || [];
      } else {
        const base    = baseUrl || 'https://api.openai.com/v1';
        const url     = `${base.replace(/\/$/, '')}/models`;
        const headers = config.proveedor === 'anthropic'
          ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
          : { Authorization: `Bearer ${apiKey}` };

        const resp = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
        if (resp.ok) {
          const json = await resp.json();
          // OpenAI / NVIDIA NIM formato: { data: [{ id, ... }] }
          if (Array.isArray(json.data)) {
            modelos = json.data.map(m => m.id || m).filter(Boolean).sort();
          } else if (Array.isArray(json)) {
            modelos = json.map(m => m.id || m).filter(Boolean).sort();
          }
        }
      }
    } catch {
      fuente  = 'catalogo';
      modelos = provInfo?.modelosSugeridos || [];
    }

    if (!modelos.length) {
      fuente  = 'catalogo';
      modelos = provInfo?.modelosSugeridos || [];
    }

    apiKey = null;
    res.json({ success: true, modelos, fuente });
  } catch (err) {
    enviarError(res, err);
  }
};

/**
 * POST /api/ia/verificar-conexion
 * Verifica la clave IA de la empresa con una llamada real al proveedor.
 * Actualiza apiKeyEstado y apiKeyFechaValidacion en BD.
 */
exports.verificarConexion = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    if (!eid) return res.status(403).json({ success: false, error: 'Sin empresa activa' });

    const config  = await prisma.configuracionIA.findUnique({ where: { empresaId: eid } });
    const enc     = require('../services/ia/encryptionService');

    // Obtener clave: empresa primero, env como fallback
    let apiKey = null; let keySource = 'none';
    if (config?.apiKeyEncriptada && enc.masterKeyConfigurada()) {
      try { apiKey = enc.descifrar(config.apiKeyEncriptada); keySource = 'company'; } catch {}
    }
    if (!apiKey) {
      apiKey = (process.env.AI_API_KEY?.length > 5) ? process.env.AI_API_KEY : null;
      keySource = apiKey ? 'env' : 'none';
    }

    if (!apiKey) {
      return res.json({ ok: false, message: 'No hay una clave de acceso IA configurada. Registra una clave en la sección “Clave de Acceso IA”.' });
    }

    const proveedor  = config?.proveedor || process.env.AI_PROVIDER || 'openai';
    const provInfo   = aiProviders.buscarPorCodigo(proveedor);
    const baseUrl    = process.env.AI_BASE_URL || provInfo?.baseUrlDefault || null;
    const provNombre = provInfo?.nombre || proveedor;

    // Llamada de prueba al proveedor (fetch nativo Node.js 18+)
    let testOk = false, testMsg = '';

    try {
      let testUrl, headers;
      if (proveedor === 'anthropic') {
        testUrl = 'https://api.anthropic.com/v1/models';
        headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
      } else if (proveedor === 'google_gemini') {
        testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        headers = {};
      } else {
        const base = baseUrl || 'https://api.openai.com/v1';
        testUrl    = `${base.replace(/\/$/, '')}/models`;
        headers    = { Authorization: `Bearer ${apiKey}` };
      }

      const resp = await fetch(testUrl, { headers, signal: AbortSignal.timeout(12000) });

      if (resp.ok) {
        testOk  = true;
        testMsg = `La conexión con ${provNombre} fue validada correctamente.`;
      } else if (resp.status === 401 || resp.status === 403) {
        testMsg = `La clave no fue aceptada por ${provNombre}. Verifica que sea correcta y esté vigente.`;
      } else {
        testMsg = `${provNombre} respondió con estado ${resp.status}. Puede ser un problema temporal del proveedor.`;
      }
    } catch (e) {
      testMsg = e.name === 'AbortError' || e.name === 'TimeoutError'
        ? `Tiempo de espera agotado al conectar con ${provNombre}.`
        : `No fue posible conectar con ${provNombre}.`;
    }

    apiKey = null; // limpiar de memoria (best effort)

    // Actualizar estado en BD solo para clave de empresa
    if (keySource === 'company' && config) {
      await prisma.configuracionIA.update({
        where: { empresaId: eid },
        data:  {
          apiKeyEstado:          testOk ? 'configurada' : 'error',
          apiKeyFechaValidacion: testOk ? new Date() : config.apiKeyFechaValidacion,
        },
      });
    }

    return res.json({ ok: testOk, message: testMsg });
  } catch (err) {
    enviarError(res, err);
  }
};

/**
 * PUT /api/ia/api-key
 * Registra o reemplaza la API Key de la empresa (se cifra con AES-256-GCM).
 * La clave plana nunca se guarda; solo el valor cifrado y la máscara.
 */
exports.registrarApiKey = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    const uid = pgUsuarioId(req);
    if (!eid) return res.status(403).json({ success: false, error: 'Sin empresa activa' });

    // Rechazar campos que nunca deben venir del frontend
    if (req.body.apiKeyEncriptada || req.body.apiKeyMascara || req.body.apiKeyEstado) {
      return res.status(400).json({ success: false, error: 'Solicitud inválida.' });
    }

    const { apiKey, proveedor: proveedorBody } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'La clave ingresada no es válida (mínimo 10 caracteres).' });
    }
    const proveedorValido = proveedorBody && aiProviders.buscarPorCodigo(proveedorBody) ? proveedorBody : null;

    const enc = require('../services/ia/encryptionService');
    if (!enc.masterKeyConfigurada()) {
      return res.status(503).json({ success: false, error: 'El servidor no tiene configurada la clave maestra de cifrado (AI_SECRETS_MASTER_KEY). Contacta al administrador técnico.' });
    }

    const clave            = apiKey.trim();
    const apiKeyEncriptada = enc.cifrar(clave);
    const apiKeyMascara    = enc.generarMascara(clave);

    const updateData = { apiKeyEncriptada, apiKeyMascara, apiKeyEstado: 'pendiente', apiKeyFechaValidacion: null };
    if (proveedorValido) updateData.proveedor = proveedorValido;
    await prisma.configuracionIA.upsert({
      where:  { empresaId: eid },
      update: updateData,
      create: { empresaId: eid, apiKeyEncriptada, apiKeyMascara, apiKeyEstado: 'pendiente', habilitada: false,
                ...(proveedorValido ? { proveedor: proveedorValido } : {}) },
    });

    console.log(`[ia] apiKey registrada empresa=${eid} usuario=${uid} mascara=${apiKeyMascara}`);
    res.json({ success: true, apiKeyMascara, apiKeyEstado: 'pendiente' });
  } catch (err) {
    enviarError(res, err);
  }
};

/**
 * DELETE /api/ia/api-key
 * Elimina la API Key de la empresa.
 */
exports.eliminarApiKey = async (req, res) => {
  try {
    const eid = pgEmpresaId(req);
    if (!eid) return res.status(403).json({ success: false, error: 'Sin empresa activa' });

    await prisma.configuracionIA.updateMany({
      where: { empresaId: eid },
      data:  { apiKeyEncriptada: null, apiKeyMascara: null, apiKeyEstado: null, apiKeyFechaValidacion: null },
    });

    console.log(`[ia] apiKey eliminada empresa=${eid}`);
    res.json({ success: true });
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
