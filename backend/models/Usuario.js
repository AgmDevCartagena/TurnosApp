const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'El nombre de usuario es requerido'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [4, 'La contraseña debe tener al menos 4 caracteres']
  },
  nombre: {
    type: String,
    required: [true, 'El nombre completo es requerido'],
    trim: true
  },
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },
  rol: {
    type: String,
    enum: ['super_admin', 'admin', 'gestor_turnos', 'gestor_nomina', 'usuario', 'consulta'],
    default: 'usuario'
  },
  modulosPermitidos: {
    type: [String],
    enum: ['turnos', 'nomina'],
    default: ['turnos', 'nomina']
  },
  areasPermitidas: {
    type: [String],
    enum: ['ADMINISTRACION', 'CENTRO_CONTROL', 'CENTRO DE CONTROL', 'OPERACIONES', 'CONDUCTORES', 'MANTENIMIENTO', 'TAQUILLEROS'],
    default: []
  },
  activo: {
    type: Boolean,
    default: true
  },
  ultimoAcceso: {
    type: Date
  }
}, {
  timestamps: true
});

// Índice para búsqueda rápida
UsuarioSchema.index({ username: 1 });

module.exports = mongoose.model('Usuario', UsuarioSchema);
