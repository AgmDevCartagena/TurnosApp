const mongoose = require('mongoose');

/**
 * DetalleLiquidacion (subdocumento)
 * Una línea por cada concepto aplicado en la liquidación.
 */
const DetalleLiquidacionSchema = new mongoose.Schema({
  conceptoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConceptoNomina',
    default: null
  },
  codigoConcepto: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  nombreConcepto: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['devengado', 'deduccion', 'prestacion', 'informativo'],
    required: true
  },
  cantidad: {
    type: Number,
    default: 0
  },
  base: {
    type: Number,
    default: 0
  },
  porcentaje: {
    type: Number,
    default: 0
  },
  valor: {
    type: Number,
    required: true,
    default: 0
  },
  observacion: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: true });

/**
 * LiquidacionNomina
 * Historial persistente de cada cálculo de nómina.
 * Una vez calculada queda en estado 'borrador'. El admin la puede aprobar o anular.
 */
const LiquidacionNominaSchema = new mongoose.Schema({
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
  nombreEmpleado: {
    type: String,
    required: true,
    trim: true
  },
  areaNombre: {
    type: String,
    trim: true,
    default: ''
  },
  periodoInicio: {
    type: Date,
    required: [true, 'El período de inicio es requerido']
  },
  periodoFin: {
    type: Date,
    required: [true, 'El período de fin es requerido']
  },
  salarioBase: {
    type: Number,
    required: true,
    min: 0
  },
  diasTrabajados: {
    type: Number,
    default: 0
  },
  totalDevengado: {
    type: Number,
    default: 0
  },
  totalDeducciones: {
    type: Number,
    default: 0
  },
  netoPagar: {
    type: Number,
    default: 0
  },
  estado: {
    type: String,
    enum: {
      values: ['borrador', 'aprobada', 'anulada'],
      message: 'estado debe ser: borrador, aprobada o anulada'
    },
    default: 'borrador'
  },
  calculadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    default: null
  },
  aprobadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    default: null
  },
  fechaAprobacion: {
    type: Date,
    default: null
  },
  parametrosUsados: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  detalles: [DetalleLiquidacionSchema],
  observaciones: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

LiquidacionNominaSchema.index({ empresaId: 1, empleadoId: 1, periodoInicio: 1, periodoFin: 1 });
LiquidacionNominaSchema.index({ empresaId: 1, estado: 1 });
LiquidacionNominaSchema.index({ documentoEmpleado: 1, empresaId: 1 });

module.exports = mongoose.model('LiquidacionNomina', LiquidacionNominaSchema);
