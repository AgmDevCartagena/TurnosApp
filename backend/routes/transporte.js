'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/transporteController');
const { requireAuth } = require('../middlewares/auth');

router.use(requireAuth);

// ── Conductores ──────────────────────────────────────────────────────────────
router.get   ('/conductores',              ctrl.listarConductores);
router.post  ('/conductores',              ctrl.crearConductor);
router.put   ('/conductores/:id',          ctrl.actualizarConductor);
router.patch ('/conductores/:id/estado',   ctrl.cambiarEstadoConductor);

// ── Vehículos ────────────────────────────────────────────────────────────────
router.get   ('/vehiculos',                ctrl.listarVehiculos);
router.post  ('/vehiculos',                ctrl.crearVehiculo);
router.put   ('/vehiculos/:id',            ctrl.actualizarVehiculo);
router.patch ('/vehiculos/:id/estado',     ctrl.cambiarEstadoVehiculo);

// ── Ubicaciones ──────────────────────────────────────────────────────────────
router.get   ('/ubicaciones',              ctrl.listarUbicaciones);
router.post  ('/ubicaciones',              ctrl.crearUbicacion);
router.put   ('/ubicaciones/:id',          ctrl.actualizarUbicacion);
router.patch ('/ubicaciones/:id/estado',   ctrl.cambiarEstadoUbicacion);

// ── Configuración de turnos ───────────────────────────────────────────────────
router.get   ('/config-turnos',              ctrl.listarConfigTurnos);
router.post  ('/config-turnos',              ctrl.crearConfigTurno);
router.put   ('/config-turnos/:id',          ctrl.actualizarConfigTurno);
router.patch ('/config-turnos/:id/estado',   ctrl.cambiarEstadoConfigTurno);

// ── Programaciones ────────────────────────────────────────────────────────────
router.get   ('/programaciones',                                 ctrl.listarProgramaciones);
router.get   ('/programaciones/:id',                             ctrl.obtenerProgramacion);
router.post  ('/programaciones',                                 ctrl.crearProgramacion);
router.put   ('/programaciones/:id',                             ctrl.actualizarProgramacion);
router.patch ('/programaciones/:id/estado',                      ctrl.cambiarEstadoProgramacion);
router.delete('/programaciones/:id',                             ctrl.eliminarProgramacion);

// ── Detalles de programación ──────────────────────────────────────────────────
router.post  ('/programaciones/:id/detalles',                                ctrl.agregarDetalle);
router.put   ('/programaciones/:id/detalles/:detalleId',                     ctrl.actualizarDetalle);
router.delete('/programaciones/:id/detalles/:detalleId',                     ctrl.eliminarDetalle);

// ── Aprobación individual por persona (Coordinador de Área) ──────────────────
router.patch ('/programaciones/:id/personas/:detalleId/aprobar',             ctrl.aprobarDetalle);
router.patch ('/programaciones/:id/personas/:detalleId/rechazar',            ctrl.rechazarDetalle);

// ── Importar desde texto WhatsApp ─────────────────────────────────────────────
router.post  ('/importar-texto',                                 ctrl.importarTexto);
router.post  ('/programaciones/:id/confirmar-importacion',       ctrl.confirmarImportacion);

// ── Generar desde turnos del sistema ─────────────────────────────────────────
router.post  ('/programaciones/generar-desde-turnos',            ctrl.generarDesdeTurnos);

// ── Servicios de alimentación ─────────────────────────────────────────────────
router.post  ('/programaciones/:id/calcular-servicios',          ctrl.calcularServicios);
router.put   ('/programaciones/:id/servicios/:servicioId/responsable', ctrl.asignarResponsableServicio);

// ── Novedades ────────────────────────────────────────────────────────────────
router.get   ('/programaciones/:id/novedades',                   ctrl.listarNovedades);
router.post  ('/programaciones/:id/novedades',                   ctrl.registrarNovedad);

// ── Exportación ──────────────────────────────────────────────────────────────
router.get   ('/programaciones/:id/formato-whatsapp',            ctrl.formatoWhatsApp);

module.exports = router;
