/**
 * Servicio para gestión de empleados
 * Maneja la lógica de negocio relacionada con empleados
 */

const Empleado = require('../models/Empleado');

/**
 * Obtiene todos los empleados con filtros opcionales
 */
async function obtenerEmpleados(area = null, empresaId = null) {
  try {
    const filtros = {};
    if (area) filtros.area = area;
    if (empresaId) filtros.empresaId = empresaId;
    return await Empleado.find(filtros);
  } catch (error) {
    throw new Error(`Error al obtener empleados: ${error.message}`);
  }
}

/**
 * Obtiene un empleado por su ID
 */
async function obtenerEmpleadoPorId(empleadoId, empresaId = null) {
  try {
    const filtro = { _id: empleadoId };
    if (empresaId) filtro.empresaId = empresaId;
    return await Empleado.findOne(filtro);
  } catch (error) {
    throw new Error(`Error al obtener empleado por ID: ${error.message}`);
  }
}

/**
 * Crea un nuevo empleado
 */
async function crearEmpleado(datosEmpleado, empresaId = null) {
  try {
    if (empresaId) datosEmpleado.empresaId = empresaId;
    const empleado = new Empleado(datosEmpleado);
    return await empleado.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Ya existe un empleado con esa cédula');
    }
    throw new Error(`Error al crear empleado: ${error.message}`);
  }
}

/**
 * Procesa datos CSV y crea múltiples empleados con validaciones completas
 */
async function procesarEmpleadosCSV(empleados) {
  if (!empleados || !Array.isArray(empleados)) {
    throw new Error('Se requiere un array de empleados');
  }

  const resultados = {
    exitosos: [],
    errores: [],
    duplicados: []
  };

  for (let i = 0; i < empleados.length; i++) {
    const emp = empleados[i];
    const filaNumero = i + 2; // +2 porque la fila 1 es el header y empezamos en 0
    
    try {
      // Validaciones básicas
      if (!emp.nombre || !emp.documento) {
        resultados.errores.push({
          fila: filaNumero,
          datos: emp,
          error: 'Nombre y documento son requeridos'
        });
        continue;
      }

      // Limpiar datos
      const nombreLimpio = emp.nombre.toString().trim();
      const documentoLimpio = emp.documento.toString().trim();
      const cargoLimpio = emp.cargo ? emp.cargo.toString().trim() : '';
      const salarioNumerico = emp.salario ? parseInt(emp.salario) : 0;
      
      // Determinar área automáticamente basada en el cargo
      let areaEmpleado = emp.area ? emp.area.toString().trim().toUpperCase() : '';
      if (!areaEmpleado) {
        areaEmpleado = determinarAreaPorCargo(cargoLimpio);
      }

      // Validaciones adicionales
      const validacion = validarDatosEmpleado(nombreLimpio, documentoLimpio);
      if (!validacion.valido) {
        resultados.errores.push({
          fila: filaNumero,
          datos: emp,
          error: validacion.error
        });
        continue;
      }

      // Verificar duplicados
      const filtroDup = { documento: documentoLimpio };
      if (empleados._empresaId) filtroDup.empresaId = empleados._empresaId;
      const empleadoExistente = await Empleado.findOne(filtroDup);
      if (empleadoExistente) {
        resultados.duplicados.push({
          fila: filaNumero,
          datos: emp,
          empleadoExistente: empleadoExistente.nombre
        });
        continue;
      }

      // Crear empleado
      const datosEmpleado = {
        nombre: nombreLimpio,
        documento: documentoLimpio,
        cargo: cargoLimpio,
        area: areaEmpleado,
        salario: salarioNumerico
      };

      // Agregar campos específicos según área
      if (areaEmpleado === 'TAQUILLEROS') {
        Object.assign(datosEmpleado, procesarDatosTaquillero(emp));
      }

      const nuevoEmpleado = new Empleado(datosEmpleado);
      await nuevoEmpleado.save();
      
      resultados.exitosos.push({
        fila: filaNumero,
        empleado: nuevoEmpleado,
        area: areaEmpleado
      });

    } catch (error) {
      resultados.errores.push({
        fila: filaNumero,
        datos: emp,
        error: error.message
      });
    }
  }

  return resultados;
}

/**
 * Determina el área de un empleado basado en su cargo
 */
function determinarAreaPorCargo(cargo) {
  const cargoLower = cargo.toLowerCase();
  
  if (cargoLower.includes('vendedores de taquilla') || cargoLower.includes('supervisor de taquilla') || 
      cargoLower.includes('taquillero') || cargoLower.includes('cajero') || cargoLower.includes('recaudador')) {
    return 'TAQUILLEROS';
  } else if (cargoLower.includes('tecnico de mantenimiento') || cargoLower.includes('coordinador de mantenimiento') ||
             cargoLower.includes('tecnico') || cargoLower.includes('mecanico') || cargoLower.includes('electricista')) {
    return 'MANTENIMIENTO';
  } else if (cargoLower.includes('operador de centro de control') || cargoLower.includes('coordinador de centro de control') ||
             cargoLower.includes('operador') || cargoLower.includes('controlador') || cargoLower.includes('despachador')) {
    return 'CENTRO DE CONTROL';
  } else if (cargoLower.includes('conductor') || cargoLower.includes('chofer') || cargoLower.includes('piloto')) {
    return 'CONDUCTORES';
  } else {
    return 'ADMINISTRACION';
  }
}

/**
 * Valida los datos básicos de un empleado
 */
function validarDatosEmpleado(nombre, documento) {
  if (nombre.length < 2) {
    return { valido: false, error: 'El nombre debe tener al menos 2 caracteres' };
  }

  if (documento.length < 5) {
    return { valido: false, error: 'El documento debe tener al menos 5 caracteres' };
  }

  return { valido: true };
}

/**
 * Procesa datos específicos para taquilleros
 */
function procesarDatosTaquillero(emp) {
  const datos = {};
  
  // Subárea - Corregido para usar valores válidos del modelo
  if (emp.subarea) {
    const subarea = emp.subarea.toString().trim().toUpperCase();
    const subareasValidas = ['MEGABUS', 'MEGACABLE'];
    datos.subarea = subareasValidas.includes(subarea) ? subarea : 'MEGABUS';
  } else {
    datos.subarea = 'MEGABUS'; // Valor por defecto válido
  }
  
  // Turno asignado - Corregido para usar valores válidos del modelo
  if (emp.turnoAsignado || emp.turno) {
    const turno = (emp.turnoAsignado || emp.turno).toString().trim().toUpperCase();
    const turnosValidos = ['TURNO_100', 'TURNO_300', 'TURNO_400'];
    datos.turnoAsignado = turnosValidos.includes(turno) ? turno : 'TURNO_100';
  } else {
    datos.turnoAsignado = 'TURNO_100'; // Valor por defecto válido
  }
  
  // Tabla de descanso - Convertir a número
  if (emp.tabla) {
    const tabla = parseInt(emp.tabla.toString().trim());
    datos.tabla = [1, 2, 3, 4, 5].includes(tabla) ? tabla : 1;
  } else {
    datos.tabla = 1; // Valor por defecto válido
  }
  
  return datos;
}

/**
 * Completa datos específicos de taquilleros
 */
async function completarDatosTaquillero(cedula, datos) {
  try {
    const empleado = await Empleado.findOne({ cedula });
    
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }
    
    if (empleado.area !== 'TAQUILLEROS') {
      throw new Error('Solo se pueden actualizar datos de taquilleros');
    }
    
    Object.assign(empleado, datos);
    return await empleado.save();
  } catch (error) {
    throw new Error(`Error al completar datos: ${error.message}`);
  }
}

/**
 * Busca empleados por nombre o cédula
 */
async function buscarEmpleados(termino, empresaId = null) {
  try {
    const regex = new RegExp(termino, 'i');
    const filtro = { $or: [{ nombre: regex }, { cedula: regex }] };
    if (empresaId) filtro.empresaId = empresaId;
    return await Empleado.find(filtro);
  } catch (error) {
    throw new Error(`Error en búsqueda: ${error.message}`);
  }
}

module.exports = {
  obtenerEmpleados,
  obtenerEmpleadoPorId,
  crearEmpleado,
  procesarEmpleadosCSV,
  completarDatosTaquillero,
  buscarEmpleados,
  determinarAreaPorCargo,
  validarDatosEmpleado,
  procesarDatosTaquillero
};