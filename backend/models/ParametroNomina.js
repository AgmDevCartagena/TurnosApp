const mongoose = require('mongoose');

/**
 * ParametroNomina
 * Almacena valores financieros/legales con vigencia por empresa.
 * Ejemplos: SMLV, AUX_TRANSPORTE, RECARGO_NOCTURNO, PORCENTAJE_SALUD, etc.
 */
const ParametroNominaSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'empresaId es requerido'],
    index: true
  },
  codigo: {
    type: String,
    required: [true, 'El código del parámetro es requerido'],
    trim: true,
    uppercase: true,
    maxlength: [60, 'El código no puede exceder 60 caracteres']
  },
  nombre: {
    type: String,
    required: [true, 'El nombre del parámetro es requerido'],
    trim: true,
    maxlength: [120, 'El nombre no puede exceder 120 caracteres']
  },
  descripcion: {
    type: String,
    trim: true,
    default: ''
  },
  valor: {
    type: Number,
    required: [true, 'El valor del parámetro es requerido'],
    min: [0, 'El valor no puede ser negativo']
  },
  tipoValor: {
    type: String,
    enum: {
      values: ['porcentaje', 'valor_fijo', 'horas', 'dias'],
      message: 'tipoValor debe ser: porcentaje, valor_fijo, horas o dias'
    },
    default: 'valor_fijo'
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

// Índice único: mismo código, misma empresa, misma vigencia
ParametroNominaSchema.index(
  { empresaId: 1, codigo: 1, vigenciaDesde: 1 },
  { unique: true }
);
ParametroNominaSchema.index({ empresaId: 1, codigo: 1, estado: 1 });

/**
 * Obtiene el valor vigente de un parámetro para una empresa en una fecha dada.
 * Busca el parámetro activo más reciente cuya vigenciaDesde <= fecha
 * y vigenciaHasta es null o >= fecha.
 */
ParametroNominaSchema.statics.obtenerVigente = async function (empresaId, codigo, fecha = new Date()) {
  const fechaRef = new Date(fecha);
  const param = await this.findOne({
    empresaId,
    codigo: codigo.toUpperCase().trim(),
    estado: 'activo',
    vigenciaDesde: { $lte: fechaRef },
    $or: [
      { vigenciaHasta: null },
      { vigenciaHasta: { $gte: fechaRef } }
    ]
  }).sort({ vigenciaDesde: -1 });

  return param;
};

/**
 * Obtiene múltiples parámetros vigentes de una vez.
 * @returns {Object} mapa { CODIGO: valor }
 */
ParametroNominaSchema.statics.obtenerMapaVigente = async function (empresaId, codigos, fecha = new Date()) {
  const fechaRef = new Date(fecha);
  const params = await this.find({
    empresaId,
    codigo: { $in: codigos.map(c => c.toUpperCase().trim()) },
    estado: 'activo',
    vigenciaDesde: { $lte: fechaRef },
    $or: [
      { vigenciaHasta: null },
      { vigenciaHasta: { $gte: fechaRef } }
    ]
  }).sort({ vigenciaDesde: -1 });

  // Para cada código toma el más reciente (ya ordenado desc)
  const mapa = {};
  for (const p of params) {
    if (!(p.codigo in mapa)) {
      mapa[p.codigo] = p.valor;
    }
  }
  return mapa;
};

module.exports = mongoose.model('ParametroNomina', ParametroNominaSchema);
