const mongoose = require('mongoose');

const EmpleadoSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },
  nombre: { 
    type: String, 
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
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
    maxlength: [50, 'El cargo no puede exceder 50 caracteres'],
    default: ''
  },
  area: {
    type: String,
    required: [true, 'El área de trabajo es requerida'],
    enum: {
      values: ['TAQUILLEROS', 'CONDUCTORES', 'MANTENIMIENTO', 'OPERACIONES', 'ADMINISTRACION', 'CENTRO DE CONTROL'],
      message: 'Área de trabajo no válida'
    }
  },
  salario: { 
    type: Number, 
    default: 0,
    min: [0, 'El salario no puede ser negativo']
  },
  fechaIngreso: {
    type: Date,
    default: null
  },
  fechaCumpleanos: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // Agrega createdAt y updatedAt automáticamente
});

// Índice único para documento
EmpleadoSchema.index({ documento: 1, empresaId: 1 }, { unique: true });
EmpleadoSchema.index({ empresaId: 1 });

module.exports = mongoose.model('Empleado', EmpleadoSchema);
