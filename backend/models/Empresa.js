const mongoose = require('mongoose');

const EmpresaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre de la empresa es requerido'],
    trim: true,
    maxlength: [150, 'El nombre no puede exceder 150 caracteres']
  },
  nit: {
    type: String,
    trim: true,
    default: ''
  },
  razonSocial: {
    type: String,
    trim: true,
    default: ''
  },
  estado: {
    type: String,
    enum: ['activa', 'inactiva'],
    default: 'activa'
  },
  logo: {
    type: String,
    default: null
  },
  colorTema: {
    type: String,
    default: '#667eea'
  },
  dominio: {
    type: String,
    trim: true,
    default: null
  },
  modulosHabilitados: {
    type: [String],
    enum: ['turnos', 'nomina'],
    default: ['turnos', 'nomina']
  }
}, {
  timestamps: true
});

EmpresaSchema.index({ nit: 1 }, { sparse: true });

module.exports = mongoose.model('Empresa', EmpresaSchema);
