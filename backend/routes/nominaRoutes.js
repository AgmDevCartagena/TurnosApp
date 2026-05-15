// -------------------------------------------------------------
// Rutas de nómina independientes
// -------------------------------------------------------------
const express = require('express');
const router = express.Router();

const nominaController = require('../controllers/nominaController');

// Endpoint para verificación de sesión
router.get('/check', (req, res) => {
    const autenticado = !!(req.session && req.session.autenticado);
    res.status(200).json({ autenticado });
});

// Rutas principales de nómina (requireAuth ya aplicado en server.js)
router.post('/calcular', nominaController.calcularNomina);
router.post('/importar-csv', nominaController.importarCSV);

// Rutas para cálculo desde MongoDB
router.post('/calcular-desde-turnos', nominaController.calcularNominaDesdeMongoTurnos);
router.post('/calcular-masiva-desde-turnos', nominaController.calcularNominaMasivaDesdeMongoTurnos);
router.post('/calcular-periodo-completo', nominaController.calcularNominaMasivaDesdeMongoTurnos); // Alias para el mismo endpoint

// Rutas para cálculo por áreas
router.get('/areas', nominaController.obtenerAreas);
router.post('/calcular-por-area', nominaController.calcularNominaPorArea);
router.post('/calcular-todas-las-areas', nominaController.calcularNominaPorTodasLasAreas);

module.exports = router;