/**
 * Servicio de integración entre módulo de turnos y nómina
 * Proporciona funciones para consultar turnos desde el módulo de nómina
 */

const Turno = require('./Turno');
const Empleado = require('./Empleado');

/**
 * Busca el turno de un empleado por documento y período específico
 */
async function buscarTurnoPorDocumentoYPeriodo(documento, mes, anio, empresaId = null) {
  try {
    const filtroEmp = { documento };
    if (empresaId) filtroEmp.empresaId = empresaId;
    const empleado = await Empleado.findOne(filtroEmp);
    
    if (!empleado) {
      return null;
    }

    // Buscar turno del empleado
    const filtroTurno = { empleadoId: empleado._id };
    if (empresaId) filtroTurno.empresaId = empresaId;
    const turno = await Turno.findOne(filtroTurno);
    
    if (!turno || !turno.historialTurnos || turno.historialTurnos.length === 0) {
      return null;
    }

    // Filtrar historial por mes y año
    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0, 23, 59, 59);

    const turnoDelPeriodo = turno.historialTurnos.find(ht => {
      const inicio = new Date(ht.fechaInicio);
      const fin = new Date(ht.fechaFin);
      return (inicio <= fechaFin && fin >= fechaInicio);
    });

    if (!turnoDelPeriodo) {
      return null;
    }

    // Retornar en formato compatible con nómina
    return {
      empleado: {
        nombre: empleado.nombre,
        documento: empleado.documento,
        cargo: empleado.cargo,
        area: empleado.area,
        salario: empleado.salario
      },
      turno: {
        area: turnoDelPeriodo.area,
        turno: turnoDelPeriodo.turno,
        tipoTurno: turnoDelPeriodo.tipoTurno,
        fechaInicio: turnoDelPeriodo.fechaInicio,
        fechaFin: turnoDelPeriodo.fechaFin,
        cronogramaDetallado: turnoDelPeriodo.cronogramaDetallado || []
      }
    };

  } catch (error) {
    console.error('Error en buscarTurnoPorDocumentoYPeriodo:', error);
    throw error;
  }
}

/**
 * Busca turnos por rango de fechas
 */
async function buscarTurnosPorPeriodo(mes, anio, empresaId = null) {
  try {
    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0, 23, 59, 59);

    const filtro = {
      'historialTurnos.fechaInicio': { $lte: fechaFin },
      'historialTurnos.fechaFin': { $gte: fechaInicio }
    };
    if (empresaId) filtro.empresaId = empresaId;

    const turnos = await Turno.find(filtro).populate('empleadoId');

    return turnos.map(turno => {
      const turnoDelPeriodo = turno.historialTurnos.find(ht => {
        const inicio = new Date(ht.fechaInicio);
        const fin = new Date(ht.fechaFin);
        return (inicio <= fechaFin && fin >= fechaInicio);
      });

      return {
        empleado: {
          nombre: turno.nombreEmpleado,
          documento: turno.documentoEmpleado,
          cargo: turno.cargo,
          salario: turno.salario
        },
        turno: turnoDelPeriodo || {}
      };
    });

  } catch (error) {
    console.error('Error en buscarTurnosPorPeriodo:', error);
    throw error;
  }
}

/**
 * Busca turno por documento y rango de fechas específico
 */
async function buscarTurnoPorDocumentoYRango(documento, fechaInicio, fechaFin, empresaId = null) {
  try {
    const filtroEmp = { documento };
    if (empresaId) filtroEmp.empresaId = empresaId;
    const empleado = await Empleado.findOne(filtroEmp);
    
    if (!empleado) {
      return null;
    }

    const filtroTurno = { empleadoId: empleado._id };
    if (empresaId) filtroTurno.empresaId = empresaId;
    const turno = await Turno.findOne(filtroTurno);
    
    if (!turno || !turno.historialTurnos || turno.historialTurnos.length === 0) {
      return null;
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    const turnoDelRango = turno.historialTurnos.find(ht => {
      const htInicio = new Date(ht.fechaInicio);
      const htFin = new Date(ht.fechaFin);
      return (htInicio <= fin && htFin >= inicio);
    });

    if (!turnoDelRango) {
      return null;
    }

    return {
      empleado: {
        nombre: empleado.nombre,
        documento: empleado.documento,
        cargo: empleado.cargo,
        area: empleado.area,
        salario: empleado.salario
      },
      turno: {
        area: turnoDelRango.area,
        turno: turnoDelRango.turno,
        tipoTurno: turnoDelRango.tipoTurno,
        fechaInicio: turnoDelRango.fechaInicio,
        fechaFin: turnoDelRango.fechaFin,
        cronogramaDetallado: turnoDelRango.cronogramaDetallado || []
      }
    };

  } catch (error) {
    console.error('Error en buscarTurnoPorDocumentoYRango:', error);
    throw error;
  }
}

/**
 * Busca todos los turnos en un rango de fechas
 */
async function buscarTurnosPorRango(fechaInicio, fechaFin, empresaId = null) {
  try {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    const filtro = {
      'historialTurnos.fechaInicio': { $lte: fin },
      'historialTurnos.fechaFin': { $gte: inicio }
    };
    if (empresaId) filtro.empresaId = empresaId;

    const turnos = await Turno.find(filtro);

    const resultado = [];

    turnos.forEach(turno => {
      const turnoDelRango = turno.historialTurnos.find(ht => {
        const htInicio = new Date(ht.fechaInicio);
        const htFin = new Date(ht.fechaFin);
        return (htInicio <= fin && htFin >= inicio);
      });

      if (turnoDelRango) {
        resultado.push({
          empleado: {
            nombre: turno.nombreEmpleado,
            documento: turno.documentoEmpleado,
            cargo: turno.cargo,
            salario: turno.salario
          },
          turno: {
            area: turnoDelRango.area,
            turno: turnoDelRango.turno,
            tipoTurno: turnoDelRango.tipoTurno,
            fechaInicio: turnoDelRango.fechaInicio,
            fechaFin: turnoDelRango.fechaFin,
            cronogramaDetallado: turnoDelRango.cronogramaDetallado || []
          }
        });
      }
    });

    return resultado;

  } catch (error) {
    console.error('Error en buscarTurnosPorRango:', error);
    throw error;
  }
}

/**
 * Busca turnos por área y rango de fechas
 */
async function buscarTurnosPorAreaYRango(area, fechaInicio, fechaFin, empresaId = null) {
  try {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    const filtro = {
      'turnoActual.area': area,
      'historialTurnos.fechaInicio': { $lte: fin },
      'historialTurnos.fechaFin': { $gte: inicio }
    };
    if (empresaId) filtro.empresaId = empresaId;

    const turnos = await Turno.find(filtro);

    const resultado = [];

    turnos.forEach(turno => {
      const turnoDelRango = turno.historialTurnos.find(ht => {
        const htInicio = new Date(ht.fechaInicio);
        const htFin = new Date(ht.fechaFin);
        return (htInicio <= fin && htFin >= inicio && ht.area === area);
      });

      if (turnoDelRango) {
        resultado.push({
          // Datos del empleado en el nivel raíz
          nombreEmpleado: turno.nombreEmpleado,
          documentoEmpleado: turno.documentoEmpleado,
          cargo: turno.cargo,
          salario: turno.salario,
          area: turnoDelRango.area,
          // Datos del turno
          turno: turnoDelRango.turno,
          tipoTurno: turnoDelRango.tipoTurno,
          fechaInicio: turnoDelRango.fechaInicio,
          fechaFin: turnoDelRango.fechaFin,
          // Historial de turnos con cronograma
          historialTurnos: [turnoDelRango]
        });
      }
    });

    return resultado;

  } catch (error) {
    console.error('Error en buscarTurnosPorAreaYRango:', error);
    throw error;
  }
}

/**
 * Obtiene turnos agrupados por área
 */
async function buscarTurnosAgrupadosPorArea(fechaInicio, fechaFin, empresaId = null) {
  try {
    const turnos = await buscarTurnosPorRango(fechaInicio, fechaFin, empresaId);
    
    const agrupados = {};

    turnos.forEach(item => {
      const area = item.turno.area;
      if (!agrupados[area]) {
        agrupados[area] = [];
      }
      agrupados[area].push(item);
    });

    return agrupados;

  } catch (error) {
    console.error('Error en buscarTurnosAgrupadosPorArea:', error);
    throw error;
  }
}

/**
 * Obtiene áreas disponibles en el sistema
 */
async function obtenerAreasDisponibles(empresaId = null) {
  try {
    const filtro = empresaId ? { empresaId } : {};
    const areas = await Turno.distinct('turnoActual.area', filtro);
    return areas.filter(area => area);
  } catch (error) {
    console.error('Error en obtenerAreasDisponibles:', error);
    throw error;
  }
}

module.exports = {
  buscarTurnoPorDocumentoYPeriodo,
  buscarTurnosPorPeriodo,
  buscarTurnoPorDocumentoYRango,
  buscarTurnosPorRango,
  buscarTurnosPorAreaYRango,
  buscarTurnosAgrupadosPorArea,
  obtenerAreasDisponibles
};
