const express = require('express');
const router  = express.Router();
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const areaController = require('../controllers/areaController');

router.use(requireAuth);

router.get('/',          areaController.listarAreas);
router.get('/:id',       areaController.obtenerArea);
router.post('/',         requireAdmin, areaController.crearArea);
router.put('/:id',       requireAdmin, areaController.actualizarArea);
router.patch('/:id/estado', requireAdmin, areaController.cambiarEstado);
router.delete('/:id',    requireAdmin, areaController.eliminarArea);

module.exports = router;
