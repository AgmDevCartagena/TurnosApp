'use strict';

/**
 * asistenteIA.js
 * Orquestador del Asistente Inteligente de Programación Operativa.
 *
 * PRINCIPIOS:
 * 1. La IA NUNCA accede directamente a BD — recibe datos ya filtrados y sanitizados.
 * 2. Validación determinística SIEMPRE ocurre antes de llamar al proveedor IA.
 * 3. Las propuestas requieren aprobación humana explícita — nunca se auto-aplican.
 * 4. Toda interacción se audita en ejecuciones_ia y mensajes_ia.
 */

const prisma              = require('../../lib/prisma');
const { invocar, verificarCuotaMensual } = require('./proveedorIA');
const { evaluar }         = require('./constraintEngine');
const { sanitizarAsignaciones, sanitizarTexto, validarRespuestaIA } = require('./sanitizer');
const { crearPropuesta }  = require('./propuestasService');
const { randomUUID }      = require('crypto');

// ─── Prompts del sistema ──────────────────────────────────────────────────────

const SYSTEM_PROMPT_BASE = `Eres el Asistente Inteligente de Programación Operativa de TurnosApp.
Tu función es analizar datos de turnos y programaciones para ayudar a los gestores a:
- Detectar conflictos y problemas en programaciones.
- Generar borradores de propuestas de optimización.
- Explicar hallazgos en lenguaje natural claro.
- Responder preguntas sobre indicadores operativos.

RESTRICCIONES ABSOLUTAS:
- NO realizas cálculos de nómina ni accedes a salarios individuales.
- NO generas SQL ni código ejecutable.
- NO aplicas cambios directamente — siempre propones borradores para revisión humana.
- NO infiero ni revelas información personal de empleados.
- Si no tienes suficiente contexto, pide aclaraciones en lugar de suponer.
- Responde siempre en español colombiano, de forma concisa y profesional.
- Cuando detectes un error de programación, cita el código de restricción (CE001, CE002, etc.).`;

// ─── Herramientas controladas del asistente ───────────────────────────────────

const HERRAMIENTAS = {
  /**
   * Valida la programación actual con constraintEngine y resume los hallazgos.
   */
  async validarProgramacion({ asignaciones, turnos, areasRequeridas, limites }, contexto) {
    const resultado = evaluar({ asignaciones, turnos: turnos || [], areasRequeridas: areasRequeridas || [], limites: limites || {} });
    return {
      tipo:    'resultado_validacion',
      payload: {
        valido:      resultado.valido,
        errores:     resultado.violaciones.length,
        advertencias: resultado.advertencias.length,
        codigosAfectados: resultado.resumen?.codigosAfectados || [],
        indicadores: resultado.indicadores,
      },
    };
  },

  /**
   * Consulta indicadores de cobertura del período actual (solo métricas, sin datos personales).
   */
  async consultarIndicadores({ asignaciones, periodo }, _contexto) {
    const resultado = evaluar({ asignaciones });
    return {
      tipo:    'indicadores',
      payload: {
        periodo,
        totalAsignaciones:        resultado.indicadores.totalAsignaciones,
        empleadosUnicos:          resultado.indicadores.empleadosUnicos,
        diasCubiertos:            resultado.indicadores.diasCubiertos,
        totalHoras:               resultado.indicadores.totalHoras,
        promedioHorasPorEmpleado: resultado.indicadores.promedioHorasPorEmpleado,
      },
    };
  },
};

// ─── Gestión de conversación ──────────────────────────────────────────────────

async function obtenerOCrearConversacion(empresaId, usuarioId, conversacionId = null) {
  if (conversacionId) {
    const conv = await prisma.conversacionIA.findUnique({ where: { id: conversacionId } });
    if (conv && conv.empresaId !== empresaId) {
      const err = new Error('Conversación no pertenece a esta empresa');
      err.statusCode = 403;
      throw err;
    }
    if (conv) return conv;
  }

  return prisma.conversacionIA.create({
    data: {
      id:        randomUUID(),
      empresaId,
      usuarioId,
      titulo:    `Sesión ${new Date().toISOString().substring(0, 10)}`,
      estado:    'activa',
    },
  });
}

async function agregarMensaje(conversacionId, rol, contenido, metadata = {}) {
  return prisma.mensajeIA.create({
    data: {
      id:             randomUUID(),
      conversacionId,
      rol,
      contenido:      contenido.substring(0, 50000),
      metadata:       Object.keys(metadata).length ? metadata : undefined,
    },
  });
}

async function obtenerHistorialConversacion(conversacionId, limite = 10) {
  const mensajes = await prisma.mensajeIA.findMany({
    where:   { conversacionId },
    orderBy: { createdAt: 'asc' },
    take:    limite,
    select:  { rol: true, contenido: true },
  });
  return mensajes;
}

// ─── Punto de entrada principal ───────────────────────────────────────────────

/**
 * Procesa un turno de conversación con el asistente.
 *
 * @param {Object} params
 * @param {string} params.empresaId
 * @param {string} params.usuarioId
 * @param {string} params.pregunta          - mensaje del usuario (ya sanitizado)
 * @param {string} [params.conversacionId]  - null para nueva conversación
 * @param {Object} [params.contextoOperativo] - { asignaciones, turnos, areasRequeridas, periodo }
 * @param {Object} configIA                 - ConfiguracionIA de la empresa
 *
 * @returns {Promise<{ respuesta: string, conversacionId: string, ejecucionId: string }>}
 */
async function procesar({
  empresaId,
  usuarioId,
  pregunta,
  conversacionId  = null,
  contextoOperativo = {},
  configIA,
}) {
  // 1. Verificar cuota mensual
  if (configIA?.limiteMensualTokens) {
    const { bloqueado, tokensUsados } = await verificarCuotaMensual(empresaId, configIA.limiteMensualTokens);
    if (bloqueado) {
      const err = new Error(`Límite mensual de tokens alcanzado (${tokensUsados} / ${configIA.limiteMensualTokens}). Contacta al administrador.`);
      err.code = 'CUOTA_EXCEDIDA';
      throw err;
    }
  }

  // 2. Sanitizar pregunta
  const preguntaSanitizada = sanitizarTexto(pregunta);

  // 3. Obtener/crear conversación
  const conv = await obtenerOCrearConversacion(empresaId, usuarioId, conversacionId);

  // 4. Guardar mensaje del usuario
  await agregarMensaje(conv.id, 'user', preguntaSanitizada);

  // 5. Construir contexto operativo sanitizado
  let contextText = '';
  if (contextoOperativo.asignaciones?.length) {
    const { asignacionesSanitizadas } = sanitizarAsignaciones(
      contextoOperativo.asignaciones,
      empresaId,
      { incluirNombres: configIA?.permitirNombres || false }
    );

    const validacion = evaluar({
      asignaciones:  contextoOperativo.asignaciones,
      turnos:        contextoOperativo.turnos        || [],
      areasRequeridas: contextoOperativo.areasRequeridas || [],
    });

    contextText = `\n\n## Contexto operativo actual
Período: ${contextoOperativo.periodo || 'no especificado'}
Total asignaciones: ${asignacionesSanitizadas.length}
Errores detectados: ${validacion.violaciones.length}
Advertencias: ${validacion.advertencias.length}
Horas totales programadas: ${validacion.indicadores.totalHoras}h
Empleados únicos: ${validacion.indicadores.empleadosUnicos}
${validacion.violaciones.length > 0 ? `\nCódigos de error: ${validacion.resumen.codigosAfectados.join(', ')}` : ''}`;
  }

  // 6. Recuperar historial (últimos 10 mensajes)
  const historial = await obtenerHistorialConversacion(conv.id, 10);

  // 7. Construir array de mensajes para el proveedor
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT_BASE + contextText },
    ...historial.slice(0, -1).map(m => ({ role: m.rol, content: m.contenido })),
    { role: 'user', content: preguntaSanitizada },
  ];

  // 8. Invocar proveedor IA
  const configOverride = configIA ? {
    modelo:      configIA.modelo,
    temperatura: parseFloat(configIA.temperatura),
    maxTokens:   configIA.limiteTokensRespuesta,
  } : {};

  const { contenido, tokensEntrada, tokensSalida, ejecucionId } = await invocar({
    empresaId,
    usuarioId,
    tipoOperacion:  'consulta_asistente',
    messages,
    configOverride,
    metadata: { conversacionId: conv.id, longitudContexto: contextText.length },
  });

  // 9. Validar respuesta (no debe contener IDs reales)
  validarRespuestaIA(contenido, new Set([empresaId, usuarioId]));

  // 10. Guardar respuesta del asistente
  await agregarMensaje(conv.id, 'assistant', contenido, { ejecucionId, tokensEntrada, tokensSalida });

  // 11. Actualizar updatedAt de la conversación
  await prisma.conversacionIA.update({
    where: { id: conv.id },
    data:  { updatedAt: new Date() },
  });

  return { respuesta: contenido, conversacionId: conv.id, ejecucionId };
}

module.exports = { procesar, HERRAMIENTAS, obtenerHistorialConversacion };
