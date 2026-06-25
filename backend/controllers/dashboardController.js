const prisma = require('../lib/prisma');

/**
 * Devuelve resumen de métricas para el dashboard del usuario autenticado.
 * Los datos se filtran por pgEmpresaId del tenant (null = super_admin ve todo).
 * Usa PostgreSQL (Prisma) como fuente de verdad para garantizar aislamiento multiempresa.
 */
exports.resumen = async (req, res) => {
  try {
    const filtro = req.pgEmpresaId ? { empresaId: req.pgEmpresaId } : {};

    const [totalEmpleados, totalTurnos, totalUsuarios] = await Promise.all([
      prisma.empleado.count({ where: filtro }),
      prisma.turno.count({ where: filtro }),
      prisma.usuario.count({ where: filtro })
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
