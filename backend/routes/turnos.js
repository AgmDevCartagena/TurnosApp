const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const turnoController = require('../controllers/turnoController');
const festivos = require('../utils/festivos2025.json');

// Configuración de multer para carga de archivos
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de archivo no válido. Use CSV o Excel'));
    }
  }
});

router.get('/empleados', turnoController.obtenerEmpleados);
router.post('/empleados', turnoController.crearEmpleado);
router.post('/empleados/csv', turnoController.crearEmpleadosCSV);
router.post('/empleados/carga-masiva', upload.single('file'), turnoController.cargaMasivaEmpleados);
router.post('/empleados/completar-taquillero', turnoController.completarDatosTaquillero);
router.get('/empleado/:id/turnos', turnoController.obtenerTurnosEmpleado);

// Nuevas rutas para historial de turnos
router.get('/empleado/:id/historial', turnoController.obtenerHistorialEmpleado);
router.get('/empleado/:id/turno-actual', turnoController.obtenerTurnoActualEmpleado);

// ❌ Función asignarTurno eliminada - usar solo asignarTurnosTaquilleros
router.get('/semana', turnoController.obtenerTurnosSemana);

// Nuevas rutas para turnos por área
router.post('/generar-turnos-area', turnoController.generarTurnosPorArea);

// Nueva ruta para generar tablas de descanso para cualquier año
router.post('/generar-tablas-descanso', turnoController.generarTablasDescansoAño);

// Nueva ruta para generar festivos de Colombia para cualquier año
router.post('/generar-festivos', turnoController.generarFestivosAño);

// Nuevas rutas para configuración de horarios
router.get('/configuracion-horarios', turnoController.obtenerConfiguracionHorarios);
router.post('/validar-horario', turnoController.validarHorarioTurno);

// Nueva ruta para obtener días de descanso específicos por tabla
router.post('/dias-descanso-tabla', turnoController.obtenerDiasDescansoTabla);

// Nueva ruta para asignar turnos a taquilleros individuales
router.post('/asignar-taquilleros', turnoController.asignarTurnosTaquilleros);

// Nueva ruta para asignar turnos administrativos (Lun-Vie 8am-6pm)
router.post('/asignar-administrativos', turnoController.asignarTurnosAdministrativos);

// Nueva ruta para asignar turnos Centro de Control (turnos rotativos mañana/tarde)
router.post('/asignar-centro-control', turnoController.asignarTurnosCentroControl);

// Nueva ruta para asignar turnos Operaciones (turnos rotativos mañana/tarde)
router.post('/asignar-operaciones', (req, res, next) => {
  console.log('🔥 MIDDLEWARE ANTES DEL CONTROLADOR OPERACIONES');
  console.log('🔥 Body:', req.body);
  console.log('🔥 Función del controlador:', typeof turnoController.asignarTurnosOperaciones);
  next();
}, turnoController.asignarTurnosOperaciones);

// Nueva ruta para asignar turnos a Conductores (horario libre con días de descanso personalizados)
router.post('/asignar-conductores', turnoController.asignarTurnosConductores);

// Nueva ruta para asignar turnos a Mantenimiento (horario libre con días de descanso personalizados)
router.post('/asignar-mantenimiento', turnoController.asignarTurnosMantenimiento);

// Nueva ruta para obtener áreas disponibles
router.get('/areas', turnoController.obtenerAreas);

// Nueva ruta para asignar turnos por área (múltiples empleados)
router.post('/asignar-area', turnoController.asignarTurnosPorArea);

// Nueva ruta para asignar turnos individuales
router.post('/asignar', turnoController.asignarTurnoIndividual);

// Nueva ruta para consultar turnos con filtros
router.get('/consultar', turnoController.consultarTurnos);

// Rutas para actualizar y eliminar turnos
router.put('/turno/:id', turnoController.actualizarTurno);
router.delete('/turno/:id', turnoController.eliminarTurno);

// Nueva ruta para eliminar empleado
router.delete('/empleados/:id', turnoController.eliminarEmpleado);

// endpoint to get festivos JSON
router.get('/festivos', (req, res) => {
  res.json(festivos);
});

// Endpoint temporal para debug - consultar documento por ID
router.get('/debug/:id', async (req, res) => {
  try {
    const turnosService = require('../services/turnosService');
    const turno = await turnosService.obtenerTurnoPorId(req.params.id);
    res.json(turno);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
