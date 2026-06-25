'use strict';

/**
 * Tests unitarios — rate limiting del endpoint de login
 *
 * Ejecutar: node --test tests/unit/loginRateLimit.test.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http    = require('node:http');

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeApp(maxAttempts, windowMin) {
  process.env.LOGIN_MAX_ATTEMPTS = String(maxAttempts);
  process.env.LOGIN_WINDOW_MIN   = String(windowMin);

  // Purgar caché para que los env vars apliquen en cada test suite
  delete require.cache[require.resolve('../../middlewares/loginRateLimit')];
  const loginRateLimit = require('../../middlewares/loginRateLimit');

  const app = express();
  app.use(express.json());
  app.post('/api/auth/login', loginRateLimit, (_req, res) => {
    res.status(401).json({ success: false, error: 'Credenciales inválidas' });
  });
  return app;
}

function request(app, body = {}, ip = '1.2.3.4') {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const payload  = JSON.stringify(body);
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path:     '/api/auth/login',
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-Forwarded-For': ip
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        });
      });
      req.write(payload);
      req.end();
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('loginRateLimit — dentro del límite', () => {
  it('permite los primeros intentos fallidos (< MAX)', async () => {
    const app = makeApp(5, 15);

    for (let i = 0; i < 3; i++) {
      const r = await request(app, { username: 'user', password: 'wrong' });
      assert.equal(r.status, 401, `Intento ${i + 1} debe pasar el rate limiter (HTTP 401)`);
    }
  });

  it('incluye cabeceras RateLimit en respuestas normales (draft-8 combined)', async () => {
    const app = makeApp(5, 15);
    const r   = await request(app, { username: 'u', password: 'p' });
    // express-rate-limit v8 con standardHeaders:'draft-8' envía cabecera combinada
    // Ej: ratelimit: limit=5, remaining=4, reset=900
    const hasRateLimit =
      r.headers['ratelimit'] ||           // draft-7 / draft-8
      r.headers['ratelimit-limit'] ||     // draft-6
      r.headers['x-ratelimit-limit'];     // legacyHeaders
    assert.ok(hasRateLimit, 'Debe incluir al menos una cabecera RateLimit estándar');
  });
});

describe('loginRateLimit — supera el límite', () => {
  it('bloquea con HTTP 429 después de MAX intentos fallidos', async () => {
    const MAX = 4;
    const app = makeApp(MAX, 15);
    const IP  = '9.9.9.9';

    // Agotar el límite
    for (let i = 0; i < MAX; i++) {
      await request(app, { username: 'user', password: 'wrong' }, IP);
    }

    // El siguiente debe ser bloqueado
    const bloqueado = await request(app, { username: 'user', password: 'wrong' }, IP);
    assert.equal(bloqueado.status, 429, 'Debe retornar HTTP 429 al superar el límite');
    assert.equal(bloqueado.body.success, false);
    assert.ok(bloqueado.body.error.includes('Demasiados intentos'), 'Mensaje de error correcto');
  });

  it('incluye cabecera Retry-After al bloquear', async () => {
    const MAX = 3;
    const WIN = 15;
    const app = makeApp(MAX, WIN);
    const IP  = '8.8.8.8';

    for (let i = 0; i < MAX; i++) {
      await request(app, { username: 'u', password: 'p' }, IP);
    }

    const bloqueado = await request(app, { username: 'u', password: 'p' }, IP);
    assert.equal(bloqueado.status, 429);
    assert.ok(bloqueado.headers['retry-after'], 'Debe incluir Retry-After');
    assert.equal(
      Number(bloqueado.headers['retry-after']),
      WIN * 60,
      `Retry-After debe ser ${WIN * 60} segundos`
    );
  });

  it('IPs diferentes tienen contadores independientes', async () => {
    const MAX = 3;
    const app = makeApp(MAX, 15);

    // IP A agota su límite
    for (let i = 0; i < MAX; i++) {
      await request(app, { username: 'u', password: 'p' }, '11.11.11.11');
    }

    // IP B todavía puede hacer intentos
    const r = await request(app, { username: 'u', password: 'p' }, '22.22.22.22');
    assert.equal(r.status, 401, 'IP diferente no debe verse afectada por el bloqueo de otra IP');
  });

  it('respuesta 429 no revela si el usuario existe', async () => {
    const MAX = 3;
    const app = makeApp(MAX, 15);
    const IP  = '55.55.55.55';

    for (let i = 0; i < MAX; i++) {
      await request(app, { username: 'u', password: 'p' }, IP);
    }

    const bloqueado = await request(app, { username: 'u', password: 'p' }, IP);
    const errorMsg  = (bloqueado.body.error || '').toLowerCase();
    assert.ok(!errorMsg.includes('usuario no encontrado'), 'No debe revelar existencia del usuario');
    assert.ok(!errorMsg.includes('contraseña incorrecta'),  'No debe revelar razón del fallo');
  });
});
