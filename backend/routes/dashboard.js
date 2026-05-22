const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');
const dashboardController = require('../controllers/dashboardController');

router.use(requireAuth, requireTenant);

router.get('/resumen', dashboardController.resumen);

module.exports = router;
