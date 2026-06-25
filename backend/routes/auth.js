const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/auth');
const { validarUsuarioCrear, validarUsuarioEditar } = require('../middlewares/inputValidator');

// ── Rutas públicas ──────────────────────────────────────────────────────────
router.post('/login',            authController.login);
router.post('/logout',           authController.logout);
router.get('/verificar-sesion',  authController.verificarSesion);

// ── Rutas autenticadas ──────────────────────────────────────────────────────
router.get('/me',                requireAuth, authController.me);
router.post('/switch-company',   requireAuth, authController.switchCompany);
router.put('/mi-password',       requireAuth, authController.cambiarMiContrasena);

// ── CRUD de usuarios (admin / super_admin) ──────────────────────────────────
router.post('/usuarios',     requireAuth, validarUsuarioCrear, authController.crearUsuario);
router.get('/usuarios',               authController.listarUsuarios);
router.put('/usuarios/:id',  requireAuth, validarUsuarioEditar, authController.editarUsuario);
router.put('/usuarios/:id/password',  authController.cambiarContrasena);
router.delete('/usuarios/:id',        authController.eliminarUsuario);
router.patch('/usuarios/:id/estado',  authController.toggleEstadoUsuario);

// ── Configuración multiempresa de usuario ───────────────────────────────────
router.put('/usuarios/:id/empresas',                         requireAuth, authController.actualizarEmpresasUsuario);
router.put('/usuarios/:id/empresas/:empresaId/configuracion',requireAuth, authController.configurarUsuarioEnEmpresa);

// ── Catálogos ────────────────────────────────────────────────────────────────
router.get('/roles',    requireAuth, authController.listarRoles);
router.get('/permisos', requireAuth, authController.listarPermisos);

module.exports = router;
