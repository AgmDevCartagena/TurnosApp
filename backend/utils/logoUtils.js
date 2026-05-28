'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * Sanitiza contenido SVG eliminando elementos y atributos peligrosos.
 * Previene XSS: scripts, event handlers, javascript: URIs, data: URIs.
 */
function sanitizeSvg(content) {
  let clean = content;
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<script[^>]*>/gi, '');
  clean = clean.replace(/\bon\w+\s*=\s*"[^"]*"/gi, '');
  clean = clean.replace(/\bon\w+\s*=\s*'[^']*'/gi, '');
  clean = clean.replace(/javascript\s*:/gi, 'blocked:');
  clean = clean.replace(/vbscript\s*:/gi, 'blocked:');
  clean = clean.replace(/data\s*:\s*text\/html/gi, 'blocked:text/html');
  return clean;
}

/**
 * Elimina físicamente el archivo de logo anterior.
 * @param {string|null} logoPath  Ruta absoluta o relativa (empezando con /uploads/...)
 */
async function deleteLogo(logoPath) {
  if (!logoPath) return;
  try {
    const fullPath = path.isAbsolute(logoPath)
      ? logoPath
      : path.join(__dirname, '..', logoPath.replace(/^\/+/, ''));
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (err) {
    console.warn('⚠️  No se pudo eliminar logo anterior:', err.message);
  }
}

module.exports = { sanitizeSvg, deleteLogo };
