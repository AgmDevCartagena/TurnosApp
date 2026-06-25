'use strict';

/**
 * Script de limpieza de datos contaminados con HTML/JavaScript.
 *
 * Uso:
 *   node scripts/limpiarDatosContaminados.js          → solo reporta (modo lectura)
 *   node scripts/limpiarDatosContaminados.js --fix     → aplica limpieza
 *   node scripts/limpiarDatosContaminados.js --fix --confirmar → ejecuta sin pausa
 *
 * IMPORTANTE: hacer backup de la base de datos antes de ejecutar con --fix.
 *
 * Fuentes revisadas:
 *   - PostgreSQL: empresas (nombre, nit, razonSocial, dominio)
 *   - PostgreSQL: usuarios (nombre, username, correo)
 *   - PostgreSQL: areas (nombre, descripcion)
 *   - PostgreSQL: roles (nombre, descripcion, codigo)
 *   - MongoDB:    Empresa (nombre, razonSocial, dominio)
 *   - MongoDB:    Usuario (nombre, username)
 *   - MongoDB:    Empleado (nombre, apellidos, cargo, area)
 */

const path = require('node:path');

// Cargar variables de entorno desde múltiples ubicaciones posibles
// (igual que otros scripts del proyecto: migrarEmpresaId.js, seedMultiempresa.js)
require('dotenv').config({ path: path.join(__dirname, '../.env') });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
}
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '../prisma/.env') });
}

if (!process.env.DATABASE_URL) {
  console.error('\n  ❌ No se encontró DATABASE_URL en ningún archivo .env.');
  console.error('  Opciones:');
  console.error('  1. Ejecutar dentro del contenedor Docker:');
  console.error('     docker compose exec backend node scripts/limpiarDatosContaminados.js');
  console.error('  2. Crear backend/.env con DATABASE_URL o exportar la variable:');
  console.error('     $env:DATABASE_URL="postgresql://..."; pnpm run cleanup:db\n');
  process.exit(1);
}

const prisma    = require('../lib/prisma');
const mongoose  = require('mongoose');

// ── Modelos MongoDB ────────────────────────────────────────────────────────────
const Empresa  = require('../models/Empresa');
const Usuario  = require('../models/Usuario');
const Empleado = require('../models/Empleado');

// ── Config ────────────────────────────────────────────────────────────────────
const MODO_FIX      = process.argv.includes('--fix');
const SIN_PAUSA     = process.argv.includes('--confirmar');

// Patrones que indican contenido potencialmente malicioso
const PATRONES_PELIGROSOS = [
  /<script/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /on[a-z]{2,}\s*=/i,
  /<img[^>]+onerror/i,
  /<svg/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /data\s*:/i,
  /expression\s*\(/i,
  /<[a-z]+[^>]*>/i,    // cualquier etiqueta HTML
];

function esContaminado(valor) {
  if (!valor || typeof valor !== 'string') return false;
  return PATRONES_PELIGROSOS.some(p => p.test(valor));
}

/**
 * Limpia un string eliminando etiquetas HTML y contenido peligroso.
 * Convierte el contenido malicioso en texto plano legible cuando sea posible,
 * o devuelve un valor de sustitución seguro.
 */
function limpiar(valor, fallback = 'VALOR_LIMPIADO') {
  if (!valor) return valor;
  // Eliminar etiquetas HTML y sus contenidos inline peligrosos
  const limpio = String(valor)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on[a-z]{2,}\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on[a-z]{2,}\s*=\s*[^\s>]*/gi, '')
    .trim();

  return limpio.length >= 2 ? limpio : fallback;
}

// ── Acumuladores de auditoría ─────────────────────────────────────────────────
const reporte   = [];
const auditoria = [];

function registrar(fuente, id, campo, valorOriginal, valorNuevo) {
  const entrada = {
    fuente, id: String(id), campo,
    valorOriginal: String(valorOriginal).slice(0, 200),
    valorNuevo:    valorNuevo !== undefined ? String(valorNuevo).slice(0, 200) : null,
    timestamp:     new Date().toISOString()
  };
  reporte.push(entrada);
  console.log(`  [${fuente}] id=${entrada.id} campo=${campo}`);
  console.log(`    ORIGINAL: ${entrada.valorOriginal}`);
  if (valorNuevo !== undefined) console.log(`    LIMPIO  : ${entrada.valorNuevo}`);
}

// ── Revisión PostgreSQL ────────────────────────────────────────────────────────
async function revisarPgEmpresas() {
  console.log('\n── PostgreSQL: empresas ──────────────────────────────────────');
  const empresas = await prisma.empresa.findMany({
    select: { id: true, nombre: true, nit: true, razonSocial: true, dominio: true }
  });

  for (const e of empresas) {
    const campos = ['nombre', 'nit', 'razonSocial', 'dominio'];
    const data   = {};

    for (const campo of campos) {
      if (esContaminado(e[campo])) {
        const limpio = limpiar(e[campo], campo === 'nombre' ? 'Empresa sin nombre' : null);
        registrar('pg:empresa', e.id, campo, e[campo], limpio);
        if (MODO_FIX) data[campo] = limpio;
      }
    }

    if (MODO_FIX && Object.keys(data).length > 0) {
      await prisma.empresa.update({ where: { id: e.id }, data });
      auditoria.push({ accion: 'LIMPIEZA_EMPRESA_PG', entidadId: e.id, campos: Object.keys(data) });
    }
  }
}

async function revisarPgUsuarios() {
  console.log('\n── PostgreSQL: usuarios ─────────────────────────────────────');
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, username: true, correo: true }
  });

  for (const u of usuarios) {
    const data = {};
    if (esContaminado(u.nombre)) {
      const limpio = limpiar(u.nombre, 'Usuario');
      registrar('pg:usuario', u.id, 'nombre', u.nombre, limpio);
      if (MODO_FIX) data.nombre = limpio;
    }
    if (esContaminado(u.username)) {
      const limpio = limpiar(u.username, 'usuario_limpiado').toLowerCase().replace(/[^a-z0-9_.\-]/g, '_');
      registrar('pg:usuario', u.id, 'username', u.username, limpio);
      if (MODO_FIX) data.username = limpio;
    }
    if (esContaminado(u.correo)) {
      registrar('pg:usuario', u.id, 'correo', u.correo, null);
      if (MODO_FIX) data.correo = null;
    }

    if (MODO_FIX && Object.keys(data).length > 0) {
      await prisma.usuario.update({ where: { id: u.id }, data });
      auditoria.push({ accion: 'LIMPIEZA_USUARIO_PG', entidadId: u.id, campos: Object.keys(data) });
    }
  }
}

async function revisarPgAreas() {
  console.log('\n── PostgreSQL: areas ────────────────────────────────────────');
  const areas = await prisma.area.findMany({
    select: { id: true, nombre: true, descripcion: true }
  });

  for (const a of areas) {
    const data = {};
    if (esContaminado(a.nombre)) {
      const limpio = limpiar(a.nombre, 'AREA_LIMPIADA');
      registrar('pg:area', a.id, 'nombre', a.nombre, limpio);
      if (MODO_FIX) data.nombre = limpio;
    }
    if (esContaminado(a.descripcion)) {
      const limpio = limpiar(a.descripcion, '');
      registrar('pg:area', a.id, 'descripcion', a.descripcion, limpio);
      if (MODO_FIX) data.descripcion = limpio || null;
    }

    if (MODO_FIX && Object.keys(data).length > 0) {
      await prisma.area.update({ where: { id: a.id }, data });
      auditoria.push({ accion: 'LIMPIEZA_AREA_PG', entidadId: a.id, campos: Object.keys(data) });
    }
  }
}

async function revisarPgRoles() {
  console.log('\n── PostgreSQL: roles ────────────────────────────────────────');
  const roles = await prisma.rol.findMany({
    select: { id: true, codigo: true, nombre: true, descripcion: true }
  });

  for (const r of roles) {
    const data = {};
    if (esContaminado(r.nombre)) {
      const limpio = limpiar(r.nombre, 'ROL_LIMPIADO');
      registrar('pg:rol', r.id, 'nombre', r.nombre, limpio);
      if (MODO_FIX) data.nombre = limpio;
    }
    if (esContaminado(r.descripcion)) {
      const limpio = limpiar(r.descripcion, '');
      registrar('pg:rol', r.id, 'descripcion', r.descripcion, limpio);
      if (MODO_FIX) data.descripcion = limpio || null;
    }

    if (MODO_FIX && Object.keys(data).length > 0) {
      await prisma.rol.update({ where: { id: r.id }, data });
      auditoria.push({ accion: 'LIMPIEZA_ROL_PG', entidadId: r.id, campos: Object.keys(data) });
    }
  }
}

// ── Revisión MongoDB ───────────────────────────────────────────────────────────
async function revisarMongoEmpresa() {
  console.log('\n── MongoDB: empresas ────────────────────────────────────────');
  const empresas = await Empresa.find({}, 'nombre razonSocial dominio');

  for (const e of empresas) {
    const update = {};
    for (const campo of ['nombre', 'razonSocial', 'dominio']) {
      if (esContaminado(e[campo])) {
        const limpio = limpiar(e[campo], campo === 'nombre' ? 'Empresa sin nombre' : null);
        registrar('mongo:empresa', e._id, campo, e[campo], limpio);
        if (MODO_FIX) update[campo] = limpio;
      }
    }
    if (MODO_FIX && Object.keys(update).length > 0) {
      await Empresa.updateOne({ _id: e._id }, { $set: update });
      auditoria.push({ accion: 'LIMPIEZA_EMPRESA_MONGO', entidadId: String(e._id), campos: Object.keys(update) });
    }
  }
}

async function revisarMongoUsuario() {
  console.log('\n── MongoDB: usuarios ────────────────────────────────────────');
  const usuarios = await Usuario.find({}, 'nombre username');

  for (const u of usuarios) {
    const update = {};
    if (esContaminado(u.nombre)) {
      const limpio = limpiar(u.nombre, 'Usuario');
      registrar('mongo:usuario', u._id, 'nombre', u.nombre, limpio);
      if (MODO_FIX) update.nombre = limpio;
    }
    if (esContaminado(u.username)) {
      const limpio = limpiar(u.username, 'usuario_limpiado').toLowerCase().replace(/[^a-z0-9_.\-]/g, '_');
      registrar('mongo:usuario', u._id, 'username', u.username, limpio);
      if (MODO_FIX) update.username = limpio;
    }
    if (MODO_FIX && Object.keys(update).length > 0) {
      await Usuario.updateOne({ _id: u._id }, { $set: update });
      auditoria.push({ accion: 'LIMPIEZA_USUARIO_MONGO', entidadId: String(u._id), campos: Object.keys(update) });
    }
  }
}

async function revisarMongoEmpleado() {
  console.log('\n── MongoDB: empleados ───────────────────────────────────────');
  const empleados = await Empleado.find({}, 'nombre apellidos cargo area');

  for (const emp of empleados) {
    const update = {};
    for (const campo of ['nombre', 'apellidos', 'cargo', 'area']) {
      if (esContaminado(emp[campo])) {
        const limpio = limpiar(emp[campo], campo === 'nombre' ? 'Empleado' : '');
        registrar('mongo:empleado', emp._id, campo, emp[campo], limpio);
        if (MODO_FIX) update[campo] = limpio;
      }
    }
    if (MODO_FIX && Object.keys(update).length > 0) {
      await Empleado.updateOne({ _id: emp._id }, { $set: update });
      auditoria.push({ accion: 'LIMPIEZA_EMPLEADO_MONGO', entidadId: String(emp._id), campos: Object.keys(update) });
    }
  }
}

// ── Registro de auditoría en PostgreSQL ───────────────────────────────────────
async function guardarAuditoria() {
  if (!auditoria.length) return;
  console.log('\n── Guardando auditoría en PostgreSQL ───────────────────────');
  for (const a of auditoria) {
    try {
      await prisma.auditLog.create({
        data: {
          accion:    a.accion,
          entidad:   'LIMPIEZA_SEGURIDAD',
          entidadId: a.entidadId,
          detalle:   `Campos limpiados: ${a.campos.join(', ')}`,
          ip:        'script_local'
        }
      }).catch(() => {});
    } catch (_) {
      // auditLog puede no existir en todos los entornos
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // docker-compose mapea MongoDB al puerto 27018 externamente; dentro del contenedor es 27017
  const mongoUri = process.env.MONGO_URI
    || process.env.MONGODB_URI
    || 'mongodb://localhost:27018/turnos_app';

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  LIMPIEZA DE DATOS CONTAMINADOS — Seguridad XSS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Modo: ${MODO_FIX ? '⚠️  FIX (escritura)' : '👁  SOLO LECTURA (sin cambios)'}`);

  if (MODO_FIX && !SIN_PAUSA) {
    console.log('\n  ⚠️  Se aplicarán cambios en la base de datos.');
    console.log('  Asegúrese de haber hecho un backup previo.');
    console.log('  Presione ENTER para continuar o Ctrl+C para cancelar...');
    await new Promise(resolve => process.stdin.once('data', resolve));
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('  ✓ MongoDB conectado');
  } catch (e) {
    console.warn(`  ⚠️  MongoDB no disponible (${e.message}) — se omitirán colecciones Mongo`);
  }

  // Revisar todas las fuentes
  await revisarPgEmpresas();
  await revisarPgUsuarios();
  await revisarPgAreas();
  await revisarPgRoles();

  if (mongoose.connection.readyState === 1) {
    await revisarMongoEmpresa();
    await revisarMongoUsuario();
    await revisarMongoEmpleado();
  }

  // Resumen
  console.log('\n═══════════════════════════════════════════════════════════');
  if (reporte.length === 0) {
    console.log('  ✅ No se encontraron registros contaminados.');
  } else {
    console.log(`  📋 Total registros contaminados encontrados: ${reporte.length}`);
    if (MODO_FIX) {
      console.log(`  🔧 Registros limpiados: ${auditoria.length}`);
      await guardarAuditoria();
      console.log('  ✅ Limpieza completada. Auditoría guardada.');
    } else {
      console.log('  ℹ️  Ejecute con --fix para aplicar la limpieza.');
    }
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
  if (mongoose.connection.readyState === 1) await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
