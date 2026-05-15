const mongoose = require('mongoose');

const AuditoriaSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    default: null
  },
  usuarioUsername: {
    type: String,
    default: 'sistema'
  },
  accion: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT',
      'CREAR_EMPRESA', 'ACTUALIZAR_EMPRESA', 'DESACTIVAR_EMPRESA',
      'CREAR_USUARIO', 'ACTUALIZAR_USUARIO', 'ELIMINAR_USUARIO', 'CAMBIAR_PASSWORD', 'CAMBIAR_ROL',
      'CREAR_EMPLEADO', 'ACTUALIZAR_EMPLEADO', 'ELIMINAR_EMPLEADO',
      'ASIGNAR_TURNO', 'ACTUALIZAR_TURNO', 'ELIMINAR_TURNO',
      'CALCULAR_NOMINA',
      'HABILITAR_MODULO', 'DESHABILITAR_MODULO',
      'MIGRACION'
    ]
  },
  entidad: {
    type: String,
    default: null
  },
  entidadId: {
    type: String,
    default: null
  },
  detalle: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ip: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

AuditoriaSchema.index({ empresaId: 1, createdAt: -1 });
AuditoriaSchema.index({ usuarioId: 1 });

module.exports = mongoose.model('Auditoria', AuditoriaSchema);
