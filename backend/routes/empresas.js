const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin, requireSuperAdmin } = require('../middlewares/auth');
const empresaController = require('../controllers/empresaController');

router.use(requireAuth);

router.get('/', empresaController.listarEmpresas);
router.get('/:id', empresaController.obtenerEmpresa);
router.get('/:id/usuarios', empresaController.listarUsuariosEmpresa);
router.get('/:id/estadisticas', requireSuperAdmin, empresaController.estadisticasEmpresa);

router.post('/', requireSuperAdmin, empresaController.crearEmpresa);
router.put('/:id', requireAdmin, empresaController.actualizarEmpresa);
router.patch('/:id/estado', requireSuperAdmin, empresaController.cambiarEstadoEmpresa);

module.exports = router;
