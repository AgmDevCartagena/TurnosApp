'use strict';

const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/rolesController');
const { requireAuth, requirePermiso, requirePermisoStrict } = require('../middlewares/auth');

// Todos los endpoints requieren sesión activa
router.use(requireAuth);

// ── Catálogo de permisos ──────────────────────────────────────────────────────
router.get('/permisos', requirePermiso('roles.ver'), ctrl.listarPermisos);

// ── CRUD Roles ────────────────────────────────────────────────────────────────
router.get('/',    requirePermiso('roles.ver'),    ctrl.listarRoles);
router.get('/:id', requirePermiso('roles.ver'),    ctrl.obtenerRol);
router.post('/',   requirePermiso('roles.crear'),  ctrl.crearRol);
router.put('/:id', requirePermiso('roles.editar'), ctrl.editarRol);
router.patch('/:id/estado', requirePermiso('roles.editar'),   ctrl.toggleEstadoRol);
router.delete('/:id',       requirePermiso('roles.eliminar'), ctrl.eliminarRol);

// ── Gestión de permisos del rol ───────────────────────────────────────────────
router.get('/:id/permisos', requirePermiso('roles.ver'),               ctrl.obtenerPermisosDeRol);
router.put('/:id/permisos', requirePermisoStrict('roles.asignar_permisos'), ctrl.actualizarPermisosDeRol);

module.exports = router;
