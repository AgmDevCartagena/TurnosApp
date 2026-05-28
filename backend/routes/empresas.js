const express = require('express');
const router  = express.Router();
const { requireAuth, requireAdmin, requireSuperAdmin } = require('../middlewares/auth');
const { upload } = require('../middlewares/logoUpload');
const empresaController = require('../controllers/empresaController');

router.use(requireAuth);

router.get('/', empresaController.listarEmpresas);
router.get('/:id', empresaController.obtenerEmpresa);
router.get('/:id/usuarios', empresaController.listarUsuariosEmpresa);
router.get('/:id/estadisticas', requireSuperAdmin, empresaController.estadisticasEmpresa);

router.post('/', requireSuperAdmin, empresaController.crearEmpresa);
router.put('/:id', requireAdmin, empresaController.actualizarEmpresa);
router.patch('/:id/estado', requireSuperAdmin, empresaController.cambiarEstadoEmpresa);

// ── Logo ──────────────────────────────────────────────────────────────────────
router.patch('/:id/logo', requireAdmin, (req, res, next) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el tamaño máximo permitido (2 MB).'
        : err.message || 'Error al procesar el archivo.';
      return res.status(400).json({ success: false, error: msg });
    }
    next();
  });
}, empresaController.subirLogo);

router.delete('/:id/logo', requireAdmin, empresaController.eliminarLogo);

module.exports = router;
