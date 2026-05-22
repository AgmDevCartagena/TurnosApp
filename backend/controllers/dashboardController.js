const Empleado = require('../models/Empleado');
const Turno = require('../models/Turno');
const Usuario = require('../models/Usuario');

/**
 * Devuelve resumen de métricas para el dashboard del usuario autenticado.
 * Los datos se filtran por empresaId del tenant (null = super_admin ve todo).
 */
exports.resumen = async (req, res) => {
  try {
    const filtro = req.empresaId ? { empresaId: req.empresaId } : {};

    const [totalEmpleados, totalTurnos, totalUsuarios] = await Promise.all([
      Empleado.countDocuments(filtro),
      Turno.countDocuments(filtro),
      Usuario.countDocuments(req.empresaId ? { empresaId: req.empresaId } : {})
    ]);

    res.json({
      success: true,
      resumen: {
        totalEmpleados,
        totalTurnos,
        totalUsuarios
      }
    });
  } catch (error) {
    console.error('Error en dashboard resumen:', error);
    res.status(500).json({ success: false, error: 'Error al obtener resumen' });
  }
};
