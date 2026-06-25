'use strict';

/**
 * Tests unitarios — validación de entradas y protección XSS
 *
 * Ejecutar: node --test tests/unit/inputValidator.test.js
 * (usa el runner nativo de Node.js >= 18, sin dependencias externas)
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

// ── Importar los esquemas directamente desde el middleware ────────────────────
// Usamos Joi directamente para testear los esquemas sin levantar Express
const Joi = require('joi');

// Re-importar la lógica de validación desde el middleware
// Necesitamos exponer los esquemas; los extraemos aquí para tests aislados
const inputValidatorPath = require('node:path').resolve(__dirname, '../../middlewares/inputValidator.js');

// Simular una petición mínima para llamar los middleware
function mockReq(body = {}) {
  return { body };
}
function mockRes() {
  const res = { _status: 200, _json: null };
  res.status = (code) => { res._status = code; return res; };
  res.json   = (data)  => { res._json  = data; return res; };
  return res;
}
function runMiddleware(middleware, body) {
  return new Promise((resolve) => {
    const req  = mockReq(body);
    const res  = mockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; resolve({ req, res, nextCalled }); });
    // Si next no se llama, el middleware respondió con error
    if (!nextCalled && res._json !== null) resolve({ req, res, nextCalled });
  });
}

const {
  validarEmpresaCrear,
  validarEmpresaActualizar,
  validarArea,
  validarAreaActualizar,
  validarUsuarioCrear,
  validarUsuarioEditar,
  validarRolCrear,
  validarRolEditar
} = require(inputValidatorPath);

// ─── Payloads maliciosos de referencia ────────────────────────────────────────
// Payloads XSS/HTML puros — deben ser rechazados por sinHtml()
const XSS_PAYLOADS = [
  '<script>alert("test")</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '<svg onload=alert(1)>',
  '"><script>alert(document.cookie)</script>',
  '<iframe src="javascript:alert(1)">',
  'data:text/html,<script>alert(1)</script>',
  'onmouseover=alert(1)',
];

// Payloads SQL Injection — NO son rechazados por sinHtml() porque no son XSS.
// La protección contra SQL injection la provee Prisma mediante queries parametrizadas.
const SQL_PAYLOADS = [
  "'; DROP TABLE empresas; --",
  "1' OR '1'='1",
  'UNION SELECT * FROM usuarios--',
];

// ══════════════════════════════════════════════════════════════════════════════
// EMPRESA — validarEmpresaCrear
// ══════════════════════════════════════════════════════════════════════════════

describe('validarEmpresaCrear — rechaza payloads maliciosos', () => {
  for (const payload of XSS_PAYLOADS) {
    it(`rechaza nombre: "${payload.slice(0, 40)}"`, async () => {
      const { res, nextCalled } = await runMiddleware(validarEmpresaCrear, {
        nombre: payload,
        modulosHabilitados: ['turnos']
      });
      assert.equal(nextCalled, false, 'next() no debe llamarse con payload malicioso');
      assert.equal(res._status, 400, 'Debe devolver HTTP 400');
      assert.equal(res._json?.success, false, 'success debe ser false');
      assert.ok(res._json?.error, 'Debe incluir mensaje de error');
    });
  }
});

describe('validarEmpresaCrear — acepta datos válidos', () => {
  it('acepta nombre válido simple', async () => {
    const { nextCalled, req } = await runMiddleware(validarEmpresaCrear, {
      nombre: 'Empresa Ejemplo S.A.S.',
      modulosHabilitados: ['turnos', 'nomina']
    });
    assert.equal(nextCalled, true, 'next() debe llamarse con datos válidos');
    assert.equal(req.body.nombre, 'Empresa Ejemplo S.A.S.');
  });

  it('acepta nombre con ampersand y puntos', async () => {
    const { nextCalled } = await runMiddleware(validarEmpresaCrear, {
      nombre: 'García & Asociados Ltda.',
      modulosHabilitados: []
    });
    assert.equal(nextCalled, true);
  });

  it('rechaza nombre vacío', async () => {
    const { res, nextCalled } = await runMiddleware(validarEmpresaCrear, {
      nombre: '',
      modulosHabilitados: []
    });
    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });

  it('rechaza nombre con más de 150 caracteres', async () => {
    const { res, nextCalled } = await runMiddleware(validarEmpresaCrear, {
      nombre: 'A'.repeat(151),
      modulosHabilitados: []
    });
    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });

  it('rechaza NIT con letras', async () => {
    const { res, nextCalled } = await runMiddleware(validarEmpresaCrear, {
      nombre: 'Empresa Válida',
      nit: 'abc123',
      modulosHabilitados: []
    });
    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });

  it('acepta NIT solo números y guión', async () => {
    const { nextCalled } = await runMiddleware(validarEmpresaCrear, {
      nombre: 'Empresa Válida',
      nit: '900123456-7',
      modulosHabilitados: []
    });
    assert.equal(nextCalled, true);
  });

  it('rechaza colorTema no hexadecimal', async () => {
    const { res, nextCalled } = await runMiddleware(validarEmpresaCrear, {
      nombre: 'Empresa',
      colorTema: 'expression(alert(1))',
      modulosHabilitados: []
    });
    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });

  it('acepta colorTema hexadecimal válido', async () => {
    const { nextCalled } = await runMiddleware(validarEmpresaCrear, {
      nombre: 'Empresa',
      colorTema: '#667eea',
      modulosHabilitados: []
    });
    assert.equal(nextCalled, true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ÁREA — validarArea
// ══════════════════════════════════════════════════════════════════════════════

describe('validarArea — rechaza payloads maliciosos en nombre', () => {
  for (const payload of XSS_PAYLOADS.slice(0, 4)) {
    it(`rechaza nombre: "${payload.slice(0, 40)}"`, async () => {
      const { res, nextCalled } = await runMiddleware(validarArea, { nombre: payload });
      assert.equal(nextCalled, false);
      assert.equal(res._status, 400);
    });
  }
});

describe('validarArea — acepta datos válidos', () => {
  it('acepta área con nombre simple', async () => {
    const { nextCalled } = await runMiddleware(validarArea, { nombre: 'COCINA' });
    assert.equal(nextCalled, true);
  });

  it('acepta área con código y descripción', async () => {
    const { nextCalled } = await runMiddleware(validarArea, {
      nombre: 'Operaciones',
      codigo: 'OPS-01',
      descripcion: 'Área de operaciones logísticas'
    });
    assert.equal(nextCalled, true);
  });

  it('rechaza código con caracteres especiales peligrosos', async () => {
    const { res, nextCalled } = await runMiddleware(validarArea, {
      nombre: 'Cocina',
      codigo: '<script>'
    });
    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// USUARIO — validarUsuarioCrear
// ══════════════════════════════════════════════════════════════════════════════

describe('validarUsuarioCrear — rechaza payloads maliciosos', () => {
  it('rechaza nombre con script tag', async () => {
    const { res, nextCalled } = await runMiddleware(validarUsuarioCrear, {
      username: 'usuario_test',
      password: 'pass1234',
      nombre:   '<script>alert(1)</script>'
    });
    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });

  it('rechaza username con espacios y HTML', async () => {
    const { res, nextCalled } = await runMiddleware(validarUsuarioCrear, {
      username: 'usuario malo!',
      password: 'pass1234',
      nombre:   'Nombre Válido'
    });
    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });

  it('rechaza correo inválido', async () => {
    const { res, nextCalled } = await runMiddleware(validarUsuarioCrear, {
      username: 'usuario_ok',
      password: 'pass1234',
      nombre:   'Nombre Válido',
      correo:   'no-es-un-correo'
    });
    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });
});

describe('validarUsuarioCrear — acepta datos válidos', () => {
  it('acepta usuario completo válido', async () => {
    const { nextCalled, req } = await runMiddleware(validarUsuarioCrear, {
      username: 'juan.perez',
      password: 'secreto123',
      nombre:   'Juan Pérez',
      correo:   'juan@empresa.com',
      rol:      'admin'
    });
    assert.equal(nextCalled, true);
    assert.equal(req.body.username, 'juan.perez');
  });

  it('acepta usuario mínimo (username, password, nombre)', async () => {
    const { nextCalled } = await runMiddleware(validarUsuarioCrear, {
      username: 'min_user',
      password: '1234',
      nombre:   'Usuario Mínimo'
    });
    assert.equal(nextCalled, true);
  });

  it('rechaza contraseña menor a 4 caracteres', async () => {
    const { res, nextCalled } = await runMiddleware(validarUsuarioCrear, {
      username: 'user',
      password: '12',
      nombre:   'Usuario'
    });
    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ROL — validarRolCrear
// ══════════════════════════════════════════════════════════════════════════════

describe('validarRolCrear — rechaza payloads maliciosos', () => {
  it('rechaza nombre de rol con HTML', async () => {
    const { res, nextCalled } = await runMiddleware(validarRolCrear, {
      codigo:  'ROL_MALO',
      nombre:  '<b>Administrador</b>',
    });
    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });

  it('rechaza código de rol con caracteres no permitidos', async () => {
    const { res, nextCalled } = await runMiddleware(validarRolCrear, {
      codigo: 'ROL MALO!',
      nombre: 'Rol Válido'
    });
    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });

  it('rechaza descripción con script', async () => {
    const { res, nextCalled } = await runMiddleware(validarRolCrear, {
      codigo:      'ROL_TEST',
      nombre:      'Rol Test',
      descripcion: '<script>alert("xss")</script>'
    });
    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });
});

describe('validarRolCrear — acepta datos válidos', () => {
  it('acepta rol con datos limpios', async () => {
    const { nextCalled } = await runMiddleware(validarRolCrear, {
      codigo:      'JEFE_COCINA',
      nombre:      'Jefe de Cocina',
      descripcion: 'Responsable del área de cocina'
    });
    assert.equal(nextCalled, true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN esc() del frontend — test de utilidad
// ══════════════════════════════════════════════════════════════════════════════

describe('función esc() — escapa correctamente caracteres HTML', () => {
  // Reimplementar aquí para tests (la función real está en el frontend HTML)
  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  it('escapa < y >', () => {
    assert.equal(esc('<script>'), '&lt;script&gt;');
  });

  it('escapa comillas dobles', () => {
    assert.equal(esc('"hola"'), '&quot;hola&quot;');
  });

  it('escapa comillas simples', () => {
    assert.equal(esc("it's"), 'it&#x27;s');
  });

  it('escapa ampersand', () => {
    assert.equal(esc('A & B'), 'A &amp; B');
  });

  it('no modifica texto plano', () => {
    assert.equal(esc('Empresa S.A.S.'), 'Empresa S.A.S.');
  });

  it('devuelve string vacío para null', () => {
    assert.equal(esc(null), '');
  });

  it('devuelve string vacío para undefined', () => {
    assert.equal(esc(undefined), '');
  });

  it('convierte números a string', () => {
    assert.equal(esc(42), '42');
  });

  it('bloquea payload XSS completo', () => {
    const resultado = esc('<script>alert("test")</script>');
    assert.ok(!resultado.includes('<script>'), 'No debe contener <script>');
    assert.ok(!resultado.includes('</script>'), 'No debe contener </script>');
    assert.equal(resultado, '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SQL INJECTION — documentación de cobertura por Prisma
// sinHtml() NO rechaza estos payloads porque no son XSS.
// Prisma usa queries parametrizadas que neutralizan SQL injection de forma nativa.
// ══════════════════════════════════════════════════════════════════════════════

describe('SQL Injection — mitigado por Prisma (no por sinHtml)', () => {
  for (const payload of SQL_PAYLOADS) {
    it(`sinHtml() permite "${payload.slice(0, 40)}" — Prisma lo neutraliza`, async () => {
      const { nextCalled } = await runMiddleware(validarEmpresaCrear, {
        nombre: payload,
        modulosHabilitados: []
      });
      // El validador HTML deja pasar este payload — es CORRECTO.
      // La protección real viene de Prisma ($queryRaw con placeholders).
      assert.equal(nextCalled, true,
        'sinHtml() no filtra SQL injection — protección delegada a Prisma');
    });
  }
});
