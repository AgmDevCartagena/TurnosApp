const mongoose = require('mongoose');

/**
 * NovedadNomina
 * Registra novedades que afectan el cálculo de nómina de un empleado.
 * Ejemplos: incapacidades, licencias, bonificaciones, descuentos adicionales.
 */
const NovedadNominaSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'empresaId es requerido'],
    index: true
  },
  empleadoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empleado',
    required: [true, 'empleadoId es requerido'],
    index: true
  },
  documentoEmpleado: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    enum: {
      values: [
        'incapacidad',
        'licencia_remunerada',
        'licencia_no_remunerada',
        'vacaciones',
        'bonificacion',
        'descuento',
        'embargo',
        'otro'
      ],
      message: 'Tipo de novedad no válido'
    },
    required: [true, 'El tipo de novedad es requerido']
  },
  descripcion: {
    type: String,
    trim: true,
    default: ''
  },
  fechaInicio: {
    type: Date,
    required: [true, 'La fecha de inicio es requerida']
  },
  fechaFin: {
    type: Date,
    required: [true, 'La fecha de fin es requerida']
  },
  cantidad: {
    type: Number,
    default: 0
  },
  valor: {
    type: Number,
    default: 0
  },
  observacion: {
    type: String,
    trim: true,
    default: ''
  },
  estado: {
    type: String,
    enum: ['activa', 'aplicada', 'anulada'],
    default: 'activa'
  },
  registradoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    default: null
  }
}, {
  timestamps: true
});

NovedadNominaSchema.index({ empresaId: 1, empleadoId: 1, fechaInicio: 1 });
NovedadNominaSchema.index({ empresaId: 1, tipo: 1, estado: 1 });

module.exports = mongoose.model('NovedadNomina', NovedadNominaSchema);
