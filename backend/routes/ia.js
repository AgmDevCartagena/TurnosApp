const express  = require('express');
const router   = express.Router();

const { requireAuth, requireModulo, requirePermiso, requirePermisoStrict } = require('../middlewares/auth');
const { requireTenant } = require('../middlewares/tenant');
const ia = require('../controllers/iaController');

router.use(requireAuth);
router.use(requireTenant);
router.use(requireModulo('ia'));

// ── Catálogo de proveedores (solo requiere acceso al módulo) ──
router.get ('/providers',             ia.listarProveedores);
router.get ('/providers/models',      requirePermiso('ia.configurar'), ia.listarModelosProveedor);

// ── Verificar conexión ──
router.post('/verificar-conexion',    requirePermiso('ia.configurar'),       ia.verificarConexion);

// ── API Key por empresa (BYOK) ──
router.put   ('/api-key',             requirePermisoStrict('ia.configurar'), ia.registrarApiKey);
router.delete('/api-key',             requirePermisoStrict('ia.configurar'), ia.eliminarApiKey);

// ── Configuración ──
router.get ('/configuracion',         requirePermiso('ia.configurar'),       ia.obtenerConfiguracion);
router.put ('/configuracion',         requirePermisoStrict('ia.configurar'), ia.actualizarConfiguracion);

// ── Validación determinística (sin IA) ──
router.post('/validar',               requirePermiso('ia.validar_programacion'), ia.validarProgramacion);

// ── Simulación (sin IA) ──
router.post('/simular',               requirePermiso('ia.simular_cambios'),  ia.simularCambio);

// ── Asistente conversacional (con IA) ──
router.post('/chat',                  requirePermiso('ia.consultar'),        ia.chat);

// ── Propuestas ──
router.get ('/propuestas',            requirePermiso('ia.generar_propuesta'), ia.listarPropuestas);
router.post('/propuestas',            requirePermiso('ia.generar_propuesta'), ia.crearPropuesta);
router.get ('/propuestas/:id',        requirePermiso('ia.generar_propuesta'), ia.obtenerPropuesta);
router.patch('/propuestas/:id/aprobar', requirePermisoStrict('ia.aprobar_propuesta'), ia.aprobarPropuesta);
router.patch('/propuestas/:id/rechazar', requirePermisoStrict('ia.aprobar_propuesta'), ia.rechazarPropuesta);

// ── Auditoría ──
router.get ('/auditoria',             requirePermiso('ia.ver_auditoria'),    ia.listarAuditoria);

module.exports = router;
