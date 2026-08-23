'use strict';

/**
 * encryptionService.js
 * Cifrado AES-256-GCM para almacenamiento seguro de API Keys por empresa (BYOK).
 *
 * SEGURIDAD:
 * - La clave maestra viene de AI_SECRETS_MASTER_KEY (env var del servidor).
 * - Nunca se imprime la clave maestra ni las API Keys en logs.
 * - El valor cifrado almacenado es: iv(hex):tag(hex):ciphertext(hex)
 * - Solo se expone la máscara (••••ABCD) al frontend.
 */

const crypto    = require('crypto');
const prisma    = require('../../lib/prisma');

const ALGORITHM = 'aes-256-gcm';

// ── Clave maestra ──────────────────────────────────────────────────────────────

function getMasterKey() {
  const raw = process.env.AI_SECRETS_MASTER_KEY;
  if (!raw || raw.length < 16) {
    throw new Error('AI_SECRETS_MASTER_KEY no configurada o insuficiente (mínimo 16 caracteres).');
  }
  return crypto.createHash('sha256').update(raw).digest(); // 32 bytes
}

function masterKeyConfigurada() {
  try { getMasterKey(); return true; } catch { return false; }
}

// ── Cifrado / Descifrado ───────────────────────────────────────────────────────

function cifrar(texto) {
  if (!texto || typeof texto !== 'string') throw new Error('Texto vacío o inválido.');
  const key    = getMasterKey();
  const iv     = crypto.randomBytes(12); // 96-bit IV para GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc    = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag(); // 128-bit auth tag
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function descifrar(valor) {
  if (!valor) return null;
  const partes = valor.split(':');
  if (partes.length !== 3) throw new Error('Formato de clave cifrada inválido.');
  const [ivHex, tagHex, encHex] = partes;
  const key      = getMasterKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

// ── Máscara para frontend ──────────────────────────────────────────────────────

function generarMascara(apiKey) {
  if (!apiKey || apiKey.length < 4) return '••••••••';
  const sufijo = apiKey.slice(-4);
  const puntos = Math.min(20, Math.max(4, apiKey.length - 4));
  return '•'.repeat(puntos) + sufijo;
}

// ── Helper: obtener API Key descifrada para una empresa ───────────────────────

async function obtenerApiKeyEmpresa(empresaId) {
  if (!empresaId || !masterKeyConfigurada()) return null;
  try {
    const cfg = await prisma.configuracionIA.findUnique({
      where:  { empresaId },
      select: { apiKeyEncriptada: true },
    });
    if (!cfg?.apiKeyEncriptada) return null;
    return descifrar(cfg.apiKeyEncriptada);
  } catch {
    return null;
  }
}

module.exports = { cifrar, descifrar, generarMascara, masterKeyConfigurada, obtenerApiKeyEmpresa };
