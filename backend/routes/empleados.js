'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/empleadoController');

// GET    /api/empleados
router.get('/',          ctrl.listarEmpleados);
// GET    /api/empleados/:id
router.get('/:id',       ctrl.obtenerEmpleado);
// POST   /api/empleados
router.post('/',         ctrl.crearEmpleado);
// PUT    /api/empleados/:id
router.put('/:id',       ctrl.actualizarEmpleado);
// DELETE /api/empleados/:id
router.delete('/:id',    ctrl.eliminarEmpleado);
// GET    /api/empleados/:id/turnos
router.get('/:id/turnos', ctrl.obtenerTurnosEmpleado);

module.exports = router;
