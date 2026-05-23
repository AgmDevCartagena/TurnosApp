const mongoose = require('mongoose');

const EmpleadoSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null,
    index: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  apellidos: {
    type: String,
    trim: true,
    maxlength: [100, 'Los apellidos no pueden exceder 100 caracteres'],
    default: ''
  },
  documento: {
    type: String,
    required: [true, 'El documento es requerido'],
    trim: true,
    maxlength: [20, 'El documento no puede exceder 20 caracteres']
  },
  cargo: {
    type: String,
    trim: true,
    maxlength: [80, 'El cargo no puede exceder 80 caracteres'],
    default: ''
  },
  // Referencia dinámica al modelo Area (reemplaza enum hardcodeado)
  areaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
    default: null
  },
  // Campo legacy: nombre de área como string (retrocompatibilidad con turnos existentes)
  area: {
    type: String,
    trim: true,
    default: ''
  },
  salario: {
    type: Number,
    default: 0,
    min: [0, 'El salario no puede ser negativo']
  },
  tipoContrato: {
    type: String,
    enum: {
      values: ['indefinido', 'fijo', 'obra_labor', 'aprendizaje', 'prestacion_servicios'],
      message: 'Tipo de contrato no válido'
    },
    default: 'indefinido'
  },
  estado: {
    type: String,
    enum: {
      values: ['activo', 'inactivo', 'retirado'],
      message: 'Estado no válido'
    },
    default: 'activo'
  },
  fechaIngreso: {
    type: Date,
    default: null
  },
  fechaRetiro: {
    type: Date,
    default: null
  },
  fechaCumpleanos: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Índice único para documento por empresa
EmpleadoSchema.index({ documento: 1, empresaId: 1 }, { unique: true });
EmpleadoSchema.index({ empresaId: 1, estado: 1 });
EmpleadoSchema.index({ empresaId: 1, areaId: 1 });

module.exports = mongoose.model('Empleado', EmpleadoSchema);
