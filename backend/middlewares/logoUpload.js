'use strict';

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'empresas', 'logos');
const MAX_SIZE   = 2 * 1024 * 1024; // 2 MB

const ALLOWED_MIMES = new Set(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_EXTS  = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp']);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `logo-${unique}${ext}`);
  }
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIMES.has(file.mimetype) || !ALLOWED_EXTS.has(ext)) {
    return cb(new Error(
      'Formato de logo no permitido. Solo se permiten: SVG, PNG, JPG, WEBP.'
    ));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE }
});

module.exports = { upload, UPLOAD_DIR };
