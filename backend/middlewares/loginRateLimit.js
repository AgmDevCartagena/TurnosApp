'use strict';

/**
 * Rate limiting para el endpoint POST /api/auth/login.
 *
 * Configuración por defecto (sobreescribible por variables de entorno):
 *   LOGIN_MAX_ATTEMPTS  — máximo de intentos por ventana (default: 10)
 *   LOGIN_WINDOW_MIN    — duración de la ventana en minutos (default: 15)
 *
 * Estrategia:
 *   - Limita por IP (cabecera X-Forwarded-For si hay proxy, remoteAddress si no).
 *   - Después de LOGIN_MAX_ATTEMPTS fallidos en LOGIN_WINDOW_MIN minutos,
 *     devuelve HTTP 429 con mensaje controlado.
 *   - No diferencia si el usuario existe o no (evita user enumeration).
 *   - Incluye cabeceras estándar: Retry-After, X-RateLimit-*.
 */

const rateLimit = require('express-rate-limit');

const WINDOW_MIN = parseInt(process.env.LOGIN_WINDOW_MIN  || '15', 10);
const MAX_TRIES  = parseInt(process.env.LOGIN_MAX_ATTEMPTS || '10', 10);

const loginRateLimit = rateLimit({
  windowMs:          WINDOW_MIN * 60 * 1000,
  max:               MAX_TRIES,
  standardHeaders:   'draft-8',
  legacyHeaders:     false,
  skipSuccessfulRequests: true,

  keyGenerator: (req) => {
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  },

  handler: (req, res) => {
    const retryAfterSec = Math.ceil(WINDOW_MIN * 60);
    console.warn(
      `[login:rate-limit] IP bloqueada: ${req.headers['x-forwarded-for'] || req.socket?.remoteAddress} ` +
      `— demasiados intentos fallidos`
    );
    res.set('Retry-After', String(retryAfterSec));
    res.status(429).json({
      success: false,
      error:   `Demasiados intentos fallidos. Intente de nuevo en ${WINDOW_MIN} minutos.`
    });
  }
});

module.exports = loginRateLimit;
