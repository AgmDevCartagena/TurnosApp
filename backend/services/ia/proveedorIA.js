'use strict';

/**
 * proveedorIA.js
 * Abstracción del proveedor de IA. Permite cambiar entre OpenAI, Anthropic, etc.
 * sin modificar el código consumidor.
 *
 * REGLAS DE SEGURIDAD:
 * - La API key NUNCA se loguea.
 * - Todas las llamadas se auditan en ejecuciones_ia.
 * - El timeout máximo es configurable (defecto 30s).
 * - Si AI_ENABLED=false, toda llamada retorna un error controlado.
 */

const prisma      = require('../../lib/prisma');
const crypto      = require('crypto');
const aiProviders = require('../../config/aiProviders');

// ─── Configuración desde env ──────────────────────────────────────────────────

function getConfig() {
  return {
    habilitado:    process.env.AI_ENABLED !== 'false',
    proveedor:     process.env.AI_PROVIDER || 'openai',
    apiKey:        process.env.AI_API_KEY  || null,
    modelo:        process.env.AI_MODEL    || 'gpt-4o-mini',
    temperatura:   parseFloat(process.env.AI_TEMPERATURE || '0.2'),
    maxTokens:     parseInt(process.env.AI_MAX_TOKENS    || '2000', 10),
    timeoutMs:     parseInt(process.env.AI_TIMEOUT_MS    || '30000', 10),
    baseUrl:       process.env.AI_BASE_URL || null,
  };
}

// ─── Hash de prompt (auditoría sin exponer contenido) ────────────────────────

function hashPrompt(prompt) {
  return crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 64);
}

// ─── Adaptadores de proveedor ─────────────────────────────────────────────────

async function llamarOpenAI(messages, config, señalAbort) {
  const base = config.baseUrl || 'https://api.openai.com/v1';
  const url  = `${base.replace(/\/$/, '')}/chat/completions`;

  const body = {
    model:       config.modelo,
    messages,
    temperature: config.temperatura,
    max_tokens:  config.maxTokens,
  };

  const resp = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body:    JSON.stringify(body),
    signal:  señalAbort,
  });

  if (!resp.ok) {
    const texto = await resp.text().catch(() => '');
    throw new Error(`OpenAI HTTP ${resp.status}: ${texto.substring(0, 200)}`);
  }

  const data = await resp.json();
  const contenido = data.choices?.[0]?.message?.content || '';
  const tokensEntrada = data.usage?.prompt_tokens     || 0;
  const tokensSalida  = data.usage?.completion_tokens || 0;

  return { contenido, tokensEntrada, tokensSalida, rawModel: data.model };
}

async function llamarAnthropic(messages, config, señalAbort) {
  const url = config.baseUrl || 'https://api.anthropic.com/v1/messages';

  const systemMsg = messages.find(m => m.role === 'system');
  const userMsgs  = messages.filter(m => m.role !== 'system');

  const body = {
    model:      config.modelo,
    max_tokens: config.maxTokens,
    system:     systemMsg?.content || '',
    messages:   userMsgs,
  };

  const resp = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':       'application/json',
      'x-api-key':          config.apiKey,
      'anthropic-version':  '2023-06-01',
    },
    body:   JSON.stringify(body),
    signal: señalAbort,
  });

  if (!resp.ok) {
    const texto = await resp.text().catch(() => '');
    throw new Error(`Anthropic HTTP ${resp.status}: ${texto.substring(0, 200)}`);
  }

  const data = await resp.json();
  const contenido    = data.content?.[0]?.text || '';
  const tokensEntrada = data.usage?.input_tokens  || 0;
  const tokensSalida  = data.usage?.output_tokens || 0;

  return { contenido, tokensEntrada, tokensSalida, rawModel: data.model };
}

// ─── Punto de entrada principal ───────────────────────────────────────────────

/**
 * Envía mensajes al proveedor IA y registra la ejecución en BD.
 *
 * @param {Object} params
 * @param {string} params.empresaId
 * @param {string} params.usuarioId
 * @param {string} params.tipoOperacion    - enum TipoOperacionIA
 * @param {Array}  params.messages         - [{ role, content }] ya sanitizados
 * @param {string} [params.propuestaId]
 * @param {Object} [params.configOverride] - override de config por empresa (ConfiguracionIA)
 * @param {Object} [params.metadata]
 *
 * @returns {Promise<{ contenido: string, tokensEntrada: number, tokensSalida: number, ejecucionId: string }>}
 */
async function invocar({
  empresaId,
  usuarioId,
  tipoOperacion,
  messages,
  propuestaId   = null,
  configOverride = {},
  metadata       = {},
}) {
  const cfg = { ...getConfig(), ...configOverride };
  const t0  = Date.now();

  // BYOK: obtener clave, proveedor y modelo de la ConfiguracionIA de la empresa
  // DEBE ejecutarse antes del check !cfg.apiKey
  if (empresaId) {
    try {
      const enc = require('./encryptionService');
      const compCfg = await prisma.configuracionIA.findUnique({
        where:  { empresaId },
        select: { apiKeyEncriptada: true, proveedor: true, modelo: true, temperatura: true, limiteTokensRespuesta: true },
      });
      if (compCfg) {
        if (!cfg.proveedor || cfg.proveedor === 'openai') {
          if (compCfg.proveedor) cfg.proveedor = compCfg.proveedor;
        }
        if (!configOverride.modelo && compCfg.modelo) cfg.modelo = compCfg.modelo;
        if (!cfg.apiKey && compCfg.apiKeyEncriptada && enc.masterKeyConfigurada()) {
          cfg.apiKey = enc.descifrar(compCfg.apiKeyEncriptada);
        }
        // Completar baseUrl desde catálogo si el proveedor lo requiere
        if (!cfg.baseUrl) {
          const provInfo = aiProviders.buscarPorCodigo(cfg.proveedor);
          if (provInfo?.baseUrlDefault) cfg.baseUrl = provInfo.baseUrlDefault;
        }
      }
    } catch { /* fallback a env */ }
  }

  if (!cfg.habilitado) {
    await _registrarEjecucion({
      empresaId, usuarioId, propuestaId, tipoOperacion,
      proveedor: cfg.proveedor, modelo: cfg.modelo,
      promptHash: hashPrompt(messages.map(m => m.content).join('')),
      resultado: 'bloqueado', codigoError: 'IA_DESHABILITADA',
      duracionMs: 0, metadata,
    });
    const err = new Error('El módulo IA está deshabilitado en este entorno.');
    err.code  = 'IA_DESHABILITADA';
    throw err;
  }

  if (!cfg.apiKey) {
    const err = new Error('AI_API_KEY no configurada.');
    err.code  = 'SIN_API_KEY';
    throw err;
  }

  const promptHash = hashPrompt(messages.map(m => m.content).join(''));
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), cfg.timeoutMs);

  let contenido    = '';
  let tokensEntrada = 0;
  let tokensSalida  = 0;
  let rawModel      = cfg.modelo;
  let resultado     = 'exitoso';
  let codigoError   = null;

  try {
    let respuesta;
    const provInfo = aiProviders.buscarPorCodigo(cfg.proveedor);
    if (cfg.proveedor === 'anthropic') {
      respuesta = await llamarAnthropic(messages, cfg, controller.signal);
    } else if (cfg.proveedor === 'openai' || provInfo?.compatibleOpenAI || cfg.baseUrl) {
      respuesta = await llamarOpenAI(messages, cfg, controller.signal);
    } else {
      throw new Error(`Proveedor IA no soportado actualmente: ${cfg.proveedor}. Verifica la configuración.`);
    }

    contenido     = respuesta.contenido;
    tokensEntrada = respuesta.tokensEntrada;
    tokensSalida  = respuesta.tokensSalida;
    rawModel      = respuesta.rawModel || cfg.modelo;

  } catch (err) {
    resultado   = 'fallido';
    codigoError = err.code || err.name || 'ERROR_PROVEEDOR';
    clearTimeout(timer);
    console.error(`[proveedorIA] Error proveedor=${cfg.proveedor} modelo=${cfg.modelo}: ${err.message}`);

    const ejecucionId = await _registrarEjecucion({
      empresaId, usuarioId, propuestaId, tipoOperacion,
      proveedor: cfg.proveedor, modelo: rawModel,
      promptHash, tokensEntrada, tokensSalida,
      resultado, codigoError, duracionMs: Date.now() - t0, metadata,
    });

    const esTimeout = err.name === 'AbortError' || err.name === 'TimeoutError';
    const publicErr  = new Error(esTimeout ? 'Tiempo de espera agotado con el proveedor IA.' : `Error con el proveedor IA: ${err.message}`);
    publicErr.code   = codigoError;
    publicErr.ejecucionId = ejecucionId;
    throw publicErr;
  }

  clearTimeout(timer);

  const ejecucionId = await _registrarEjecucion({
    empresaId, usuarioId, propuestaId, tipoOperacion,
    proveedor: cfg.proveedor, modelo: rawModel,
    promptHash, tokensEntrada, tokensSalida,
    resultado, codigoError: null, duracionMs: Date.now() - t0, metadata,
  });

  return { contenido, tokensEntrada, tokensSalida, ejecucionId };
}

// ─── Registro de auditoría ────────────────────────────────────────────────────

async function _registrarEjecucion({
  empresaId, usuarioId, propuestaId, tipoOperacion,
  proveedor, modelo, promptHash, tokensEntrada = 0, tokensSalida = 0,
  resultado, codigoError, duracionMs, metadata,
}) {
  try {
    const registro = await prisma.ejecucionIA.create({
      data: {
        empresaId,
        usuarioId,
        propuestaId: propuestaId || undefined,
        tipoOperacion,
        proveedor:   proveedor || undefined,
        modelo:      modelo    || undefined,
        promptHash:  promptHash || undefined,
        tokensEntrada: tokensEntrada || undefined,
        tokensSalida:  tokensSalida  || undefined,
        duracionMs:    duracionMs    || undefined,
        resultado,
        codigoError: codigoError || undefined,
        metadata:    Object.keys(metadata).length ? metadata : undefined,
      },
    });
    return registro.id;
  } catch (err) {
    console.warn('[proveedorIA] Error registrando ejecucion_ia:', err.message);
    return null;
  }
}

// ─── Verificar cuota mensual ──────────────────────────────────────────────────

/**
 * Verifica si la empresa ha superado su límite mensual de tokens.
 * @param {string} empresaId
 * @param {number} limiteMensualTokens
 * @returns {Promise<{ bloqueado: boolean, tokensUsados: number }>}
 */
async function verificarCuotaMensual(empresaId, limiteMensualTokens) {
  if (!limiteMensualTokens) return { bloqueado: false, tokensUsados: 0 };

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const agg = await prisma.ejecucionIA.aggregate({
    where:  { empresaId, resultado: 'exitoso', createdAt: { gte: inicioMes } },
    _sum:   { tokensSalida: true, tokensEntrada: true },
  });

  const tokensUsados = (agg._sum.tokensEntrada || 0) + (agg._sum.tokensSalida || 0);
  return { bloqueado: tokensUsados >= limiteMensualTokens, tokensUsados };
}

module.exports = { invocar, verificarCuotaMensual, getConfig };
