const mongoose = require('mongoose');

// Sub-esquema para el cronograma detallado de cada día
const CronogramaDetalladoSchema = new mongoose.Schema({
  fecha: { type: String, required: true }, // YYYY-MM-DD
  diaSemana: { type: String, required: true }, // Lunes, Martes, etc.
  tipoDay: { 
    type: String, 
    enum: ['LABORABLE', 'DESCANSO', 'FESTIVO', 'FIN_SEMANA'],
    required: true 
  },
  horaInicio: { type: String }, // "05:00" o null si es descanso
  horaFin: { type: String }, // "14:15" o null si es descanso
  observaciones: { type: String }, // "Descanso por tabla A", "Festivo: Día de la Independencia", etc.
  esFestivo: { type: Boolean, default: false },
  esDescanso: { type: Boolean, default: false }
}, { _id: false });

// Sub-esquema para cada registro de turno en el historial
const HistorialTurnoSchema = new mongoose.Schema({
  // Campos de fecha y horario
  fecha: { type: Date },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  horaInicio: { type: String },
  horaFin: { type: String },
  
  // Área y configuración
  area: { 
    type: String, 
    enum: ['TAQUILLEROS', 'CONDUCTORES', 'MANTENIMIENTO', 'OPERACIONES', 'ADMINISTRACION', 'CENTRO DE CONTROL'],
    required: true 
  },
  subarea: { type: String },
  
  // Tipo de turno y tabla de descanso
  turno: { type: String, required: true },
  tipoTurno: { 
    type: String, 
    enum: ['ADMINISTRATIVO', 'TURNO_100', 'TURNO_300', 'TURNO_400', 'TECNICO', 'CONDUCTOR', 'PERSONALIZADO', 'MANUAL']
  },
  tablaDescanso: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E', 'F', 'TABLA_1', 'TABLA_2', 'TABLA_3', 'TABLA_4', 'TABLA_5'],
    required: false,
    default: undefined
  },
  
  // Campos para turnos partidos (TURNO_400)
  esTurnoPartido: { type: Boolean, default: false },
  horaInicio2: { type: String },
  horaFin2: { type: String },
  
  // Cronograma detallado día por día
  cronogramaDetallado: [CronogramaDetalladoSchema],

  // Metadatos del turno
  festivo: { type: Boolean, default: false },
  activo: { type: Boolean, default: true },
  fechaCreacion: { type: Date, default: Date.now }
}, { _id: true }); // Mantener _id para identificar cada turno en el historial

// Esquema principal de Turno - UN DOCUMENTO POR EMPLEADO
const TurnoSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null,
    index: true
  },
  // Datos del empleado (inmutables en el documento)
  empleadoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Empleado', 
    required: true,
    index: true
  },
  nombreEmpleado: { type: String, required: true },
  documentoEmpleado: { type: String, required: true },
  cargo: { type: String },
  salario: { type: Number, default: 0 },
  
  // Turno actual (último asignado) - para consultas rápidas
  turnoActual: {
    area: { type: String },
    subarea: { type: String },
    turno: { type: String },
    fechaInicio: { type: Date },
    fechaFin: { type: Date },
    activo: { type: Boolean, default: true }
  },
  
  // ⭐ HISTORIAL DE TODOS LOS TURNOS ASIGNADOS
  historialTurnos: [HistorialTurnoSchema],
  
  // Metadatos del documento
  fechaCreacion: { type: Date, default: Date.now },
  ultimaActualizacion: { type: Date, default: Date.now }
});

// Middleware para actualizar ultimaActualizacion automáticamente
TurnoSchema.pre('save', function(next) {
  this.ultimaActualizacion = new Date();
  next();
});

// Índices para mejorar rendimiento de consultas
TurnoSchema.index({ 'historialTurnos.fechaInicio': 1, 'historialTurnos.fechaFin': 1 });
TurnoSchema.index({ 'historialTurnos.area': 1 });
TurnoSchema.index({ 'turnoActual.activo': 1 });

module.exports = mongoose.model('Turno', TurnoSchema);
