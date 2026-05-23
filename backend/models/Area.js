const mongoose = require('mongoose');

const AreaSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'empresaId es requerido'],
    index: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre del área es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  codigo: {
    type: String,
    trim: true,
    default: ''
  },
  descripcion: {
    type: String,
    trim: true,
    default: ''
  },
  estado: {
    type: String,
    enum: ['activa', 'inactiva'],
    default: 'activa'
  }
}, {
  timestamps: true
});

// Normalizar nombre y código a mayúsculas antes de guardar
AreaSchema.pre('save', function (next) {
  if (this.isModified('nombre') && this.nombre) {
    this.nombre = this.nombre.toUpperCase().trim();
  }
  if (this.isModified('codigo') && this.codigo) {
    this.codigo = this.codigo.toUpperCase().trim();
  }
  next();
});

// Índice único: nombre por empresa (evita duplicados activos)
AreaSchema.index({ empresaId: 1, nombre: 1 }, { unique: true });
AreaSchema.index({ empresaId: 1, estado: 1 });

module.exports = mongoose.model('Area', AreaSchema);
