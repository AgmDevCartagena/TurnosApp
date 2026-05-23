const mongoose = require('mongoose');

/**
 * ConceptoNomina
 * Define los conceptos que componen el cálculo de nómina por empresa.
 * Cada empresa puede tener sus propios conceptos configurables.
 *
 * tipo:
 *   devengado    → suma al total devengado
 *   deduccion    → resta del total devengado
 *   prestacion   → provisión/prestación social (no afecta neto directamente)
 *   informativo  → solo se muestra, no entra al cálculo
 *
 * referenciaParametro: código del ParametroNomina que provee el porcentaje/valor.
 * base: campo del resultado de cálculo sobre el que se aplica (ej: 'salarioBase', 'totalDevengado')
 */
const ConceptoNominaSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'empresaId es requerido'],
    index: true
  },
  codigo: {
    type: String,
    required: [true, 'El código del concepto es requerido'],
    trim: true,
    uppercase: true,
    maxlength: [60, 'El código no puede exceder 60 caracteres']
  },
  nombre: {
    type: String,
    required: [true, 'El nombre del concepto es requerido'],
    trim: true,
    maxlength: [120, 'El nombre no puede exceder 120 caracteres']
  },
  descripcion: {
    type: String,
    trim: true,
    default: ''
  },
  tipo: {
    type: String,
    enum: {
      values: ['devengado', 'deduccion', 'prestacion', 'informativo'],
      message: 'tipo debe ser: devengado, deduccion, prestacion o informativo'
    },
    required: [true, 'El tipo del concepto es requerido']
  },
  referenciaParametro: {
    type: String,
    trim: true,
    uppercase: true,
    default: null
  },
  base: {
    type: String,
    trim: true,
    default: 'salarioBase'
  },
  formula: {
    type: String,
    trim: true,
    default: null
  },
  afectaTotal: {
    type: Boolean,
    default: true
  },
  orden: {
    type: Number,
    default: 0
  },
  vigenciaDesde: {
    type: Date,
    required: [true, 'La vigencia desde es requerida']
  },
  vigenciaHasta: {
    type: Date,
    default: null
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo'],
    default: 'activo'
  }
}, {
  timestamps: true
});

ConceptoNominaSchema.index({ empresaId: 1, codigo: 1 }, { unique: true });
ConceptoNominaSchema.index({ empresaId: 1, tipo: 1, estado: 1 });

/**
 * Retorna todos los conceptos activos y vigentes para una empresa en una fecha.
 */
ConceptoNominaSchema.statics.obtenerVigentes = async function (empresaId, fecha = new Date()) {
  const fechaRef = new Date(fecha);
  return this.find({
    empresaId,
    estado: 'activo',
    vigenciaDesde: { $lte: fechaRef },
    $or: [
      { vigenciaHasta: null },
      { vigenciaHasta: { $gte: fechaRef } }
    ]
  }).sort({ orden: 1, tipo: 1 });
};

module.exports = mongoose.model('ConceptoNomina', ConceptoNominaSchema);
