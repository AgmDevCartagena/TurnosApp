const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middlewares/auth');
const empresaController = require('../controllers/empresaController');

router.use(requireAuth);

router.get('/empresas',        empresaController.listarMisEmpresas);
router.post('/empresa-activa', empresaController.setEmpresaActiva);

module.exports = router;
