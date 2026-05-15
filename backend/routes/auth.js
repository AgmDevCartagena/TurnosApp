const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas públicas
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/verificar-sesion', authController.verificarSesion);

// Cambiar contraseña propia (cualquier usuario logueado)
router.put('/mi-password', authController.cambiarMiContrasena);

// Rutas protegidas (solo admin)
router.post('/usuarios', authController.crearUsuario);
router.get('/usuarios', authController.listarUsuarios);
router.put('/usuarios/:id', authController.editarUsuario); // Editar usuario
router.put('/usuarios/:id/password', authController.cambiarContrasena); // Cambiar contraseña
router.delete('/usuarios/:id', authController.eliminarUsuario); // Eliminar usuario

module.exports = router;
