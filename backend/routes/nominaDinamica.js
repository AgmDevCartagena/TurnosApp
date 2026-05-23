'use strict';

const express    = require('express');
const router     = express.Router();
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const ctrl       = require('../controllers/nominaDinamicaController');

// Todas las rutas requieren autenticación
router.use(requireAuth);

// ── Parámetros ────────────────────────────────────────────────────────────────
router.get( '/parametros',            ctrl.listarParametros);
router.post('/parametros',            requireAdmin, ctrl.crearParametro);
router.put( '/parametros/:id',        requireAdmin, ctrl.actualizarParametro);
router.patch('/parametros/:id/estado',requireAdmin, ctrl.cambiarEstadoParametro);

// ── Conceptos ─────────────────────────────────────────────────────────────────
router.get( '/conceptos',            ctrl.listarConceptos);
router.post('/conceptos',            requireAdmin, ctrl.crearConcepto);
router.put( '/conceptos/:id',        requireAdmin, ctrl.actualizarConcepto);
router.patch('/conceptos/:id/estado',requireAdmin, ctrl.cambiarEstadoConcepto);

// ── Cálculo ───────────────────────────────────────────────────────────────────
router.post('/calcular-individual', ctrl.calcularIndividual);
router.post('/calcular-por-area',   ctrl.calcularPorArea);

// ── Liquidaciones ─────────────────────────────────────────────────────────────
router.get( '/liquidaciones',            ctrl.listarLiquidaciones);
router.get( '/liquidaciones/:id',        ctrl.obtenerLiquidacion);
router.post('/liquidaciones/:id/aprobar',requireAdmin, ctrl.aprobarLiquidacion);
router.post('/liquidaciones/:id/anular', requireAdmin, ctrl.anularLiquidacion);

// ── Reportes ──────────────────────────────────────────────────────────────────
router.get('/reportes', ctrl.reportes);

module.exports = router;
