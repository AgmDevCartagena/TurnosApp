/**
 * Servicio para generación de turnos por área
 * Maneja la lógica específica de generación según el tipo de empleado
 */

const Turno = require('../models/Turno');
const { esFestivo } = require('./festivosService');
const prisma   = require('../lib/prisma');

/**
 * Sincroniza un turno en PostgreSQL tras guardarlo en MongoDB.
 * Fire-and-forget: silencia errores para no bloquear la operación principal.
 */
async function syncTurnoPG(documentoEmpleado, datosTurno, mongoDocId) {
  try {
    const pgEmp = await prisma.empleado.findFirst({
      where:  { documento: documentoEmpleado },
      select: { id: true, empresaId: true, areaId: true }
    });
    if (!pgEmp) return;

    let areaId = pgEmp.areaId;
    if (!areaId && datosTurno.area && pgEmp.empresaId) {
      const areaPg = await prisma.area.findFirst({
        where: { empresaId: pgEmp.empresaId, nombre: datosTurno.area.toUpperCase() }
      });
      areaId = areaPg?.id || null;
    }

    const tiposValidos = ['ADMINISTRATIVO','TURNO_100','TURNO_300','TURNO_400','TECNICO','CONDUCTOR','PERSONALIZADO','MANUAL'];
    const tipoTurno = tiposValidos.includes(datosTurno.tipoTurno) ? datosTurno.tipoTurno : null;

    await prisma.turno.create({
      data: {
        empleadoId:        pgEmp.id,
        empresaId:         pgEmp.empresaId,
        areaId:            areaId,
        turno:             (datosTurno.turno || 'OTRO').substring(0, 60),
        tipoTurno,
        tablaDescanso:     datosTurno.tablaDescanso?.substring(0, 10) || null,
        fechaInicio:       new Date(datosTurno.fechaInicio),
        fechaFin:          new Date(datosTurno.fechaFin),
        horaInicio:        datosTurno.horaInicio?.substring(0, 5) || null,
        horaFin:           datosTurno.horaFin?.substring(0, 5) || null,
        esTurnoPartido:    datosTurno.esTurnoPartido || false,
        activo:            true,
        cronogramaMongoId: mongoDocId?.toString() || null
      }
    });
  } catch (err) {
    console.warn('\u26a0\ufe0f PG turno sync:', err.message);
  }
}

/**
 * Genera turnos para el área de administrativos
 */
async function generarTurnosAdministrativos(empleados, fechaInicio, fechaFin) {
  const turnosGenerados = [];
  const diasDescanso = [];
  
  for (let fecha = new Date(fechaInicio); fecha <= fechaFin; fecha.setDate(fecha.getDate() + 1)) {
    const fechaStr = fecha.toISOString().split('T')[0];
    const diaSemana = fecha.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
    
    // Verificar si es fin de semana
    const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
    
    // Verificar si es festivo
    const esFestivoHoy = esFestivo(new Date(fecha));
    
    if (!esFinDeSemana && !esFestivoHoy) {
      // Día laborable - generar turnos para todos los empleados
      for (const empleado of empleados) {
        const nuevoTurno = new Turno({
          empleado: empleado._id,
          fecha: new Date(fecha),
          turno: 'ADMINISTRATIVO',
          horaInicio: '08:00',
          horaFin: '17:00',
          area: 'ADMINISTRATIVOS'
        });
        
        await nuevoTurno.save();
        turnosGenerados.push(nuevoTurno);
      }
    } else {
      // Día de descanso
      diasDescanso.push({
        fecha: fechaStr,
        motivo: esFestivoHoy ? 'Festivo' : 'Fin de semana',
        empleadosAfectados: empleados.length
      });
    }
  }
  
  return {
    turnosGenerados: turnosGenerados.length,
    diasDescanso: diasDescanso.length,
    detalleDescansos: diasDescanso
  };
}

/**
 * Genera turnos para el área de taquilleros con lógica de tablas
 */
async function generarTurnosTaquilleros(empleados, fechaInicio, fechaFin, filtros = {}) {
  const turnosGenerados = [];
  const diasDescanso = [];
  const resumenTablas = {};
  
  // Cargar configuración de tablas de descanso
  const año = fechaInicio.getFullYear();
  const mes = fechaInicio.getMonth() + 1;
  
  try {
    // Intentar cargar tabla de descanso del año específico
    let tablasDescanso;
    try {
      tablasDescanso = require(`../utils/tablasDescanso${año}.json`);
    } catch {
      // Si no existe, usar 2025 como base
      tablasDescanso = require('../utils/tablasDescanso2025.json');
    }
    
    // Agrupar empleados por tabla
    const empleadosPorTabla = {};
    empleados.forEach(empleado => {
      const tabla = empleado.tabla || '1';
      if (!empleadosPorTabla[tabla]) {
        empleadosPorTabla[tabla] = [];
      }
      empleadosPorTabla[tabla].push(empleado);
    });
    
    // Generar turnos día por día
    for (let fecha = new Date(fechaInicio); fecha <= fechaFin; fecha.setDate(fecha.getDate() + 1)) {
      const fechaStr = fecha.toISOString().split('T')[0];
      const diaSemana = fecha.getDay();
      const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
      const esFestivoHoy = esFestivo(new Date(fecha));
      
      if (!esFestivoHoy) {
        if (esFinDeSemana) {
          // Lógica de tablas para fines de semana
          await procesarFinDeSemanaConTablas(
            fecha, empleadosPorTabla, tablasDescanso, 
            turnosGenerados, diasDescanso, año, mes
          );
        } else {
          // Día laborable - todos trabajan
          for (const empleado of empleados) {
            const turno = await crearTurnoTaquillero(empleado, fecha, 'LABORABLE');
            turnosGenerados.push(turno);
          }
        }
      } else {
        // Día festivo - nadie trabaja
        diasDescanso.push({
          fecha: fechaStr,
          motivo: 'Festivo',
          empleadosAfectados: empleados.length
        });
      }
    }
    
    // Generar resumen por tabla
    Object.keys(empleadosPorTabla).forEach(tabla => {
      resumenTablas[tabla] = {
        empleados: empleadosPorTabla[tabla].length,
        turnosGenerados: turnosGenerados.filter(t => 
          empleadosPorTabla[tabla].some(e => e._id.equals(t.empleado))
        ).length
      };
    });
    
  } catch (error) {
    throw new Error(`Error generando turnos para taquilleros: ${error.message}`);
  }
  
  return {
    turnosGenerados: turnosGenerados.length,
    diasDescanso: diasDescanso.length,
    resumenTablas,
    detalleDescansos: diasDescanso
  };
}

/**
 * Procesa los fines de semana aplicando lógica de tablas de descanso
 */
async function procesarFinDeSemanaConTablas(fecha, empleadosPorTabla, tablasDescanso, turnosGenerados, diasDescanso, año, mes) {
  const fechaStr = fecha.toISOString().split('T')[0];
  const dia = fecha.getDate();
  const mesNombre = obtenerNombreMes(mes);
  
  // Determinar qué tabla descansa este día
  let tablaQueDescansa = null;
  
  if (tablasDescanso && tablasDescanso.tablas) {
    for (const [tabla, config] of Object.entries(tablasDescanso.tablas)) {
      if (config.diasDescanso && config.diasDescanso[mesNombre]) {
        const tieneDescanso = config.diasDescanso[mesNombre].some(d => d.dia === dia);
        if (tieneDescanso) {
          tablaQueDescansa = tabla;
          break;
        }
      }
    }
  }
  
  // Procesar cada tabla
  for (const [tabla, empleados] of Object.entries(empleadosPorTabla)) {
    if (tabla === tablaQueDescansa) {
      // Esta tabla descansa
      diasDescanso.push({
        fecha: fechaStr,
        motivo: `Descanso programado - Tabla ${tabla}`,
        empleadosAfectados: empleados.length,
        tabla: tabla
      });
    } else {
      // Esta tabla trabaja
      for (const empleado of empleados) {
        const turno = await crearTurnoTaquillero(empleado, fecha, 'FIN_DE_SEMANA');
        turnosGenerados.push(turno);
      }
    }
  }
}

/**
 * Crea un turno específico para taquillero
 */
async function crearTurnoTaquillero(empleado, fecha, tipoTurno) {
  const horarios = {
    'LABORABLE': { inicio: '06:00', fin: '14:00' },
    'FIN_DE_SEMANA': { inicio: '06:00', fin: '18:00' }
  };
  
  const horario = horarios[tipoTurno] || horarios['LABORABLE'];
  
  // NOTA: Con el nuevo modelo, subarea, turno y tabla se asignan al crear el turno, 
  // no se obtienen del empleado. Estos valores deben pasarse como parámetros.
  const nuevoTurno = new Turno({
    empleadoId: empleado._id,
    fecha: fecha,
    horaInicio: horario.inicio,
    horaFin: horario.fin,
    area: 'TAQUILLEROS',
    tipoTurno: tipoTurno,
    // Estos campos ahora deben pasarse como parámetros al asignar turnos:
    // subarea: (se asigna en asignación individual)
    // tablaDescanso: (se asigna en asignación individual) 
  });
  
  await nuevoTurno.save();
  return nuevoTurno;
}

/**
 * Función principal para generar turnos según el área
 */
async function generarTurnosArea(area, empleados, fechaInicio, fechaFin, filtros = {}) {
  switch (area) {
    case 'ADMINISTRATIVOS':
      return await generarTurnosAdministrativos(empleados, fechaInicio, fechaFin);
    case 'TAQUILLEROS':
      return await generarTurnosTaquilleros(empleados, fechaInicio, fechaFin, filtros);
    default:
      throw new Error(`Área ${area} no implementada`);
  }
}

/**
 * Función auxiliar para obtener nombre del mes
 */
function obtenerNombreMes(numeroMes) {
  const meses = {
    1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
    5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
    9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre'
  };
  return meses[numeroMes] || 'enero';
}

/**
 * Crea o actualiza un turno con historial
 * Si ya existe un documento para el empleado y hay fechas que se solapan,
 * SOBRESCRIBE las fechas solapadas del turno anterior
 * Si no existe, crea un nuevo documento
 */
async function crearTurno(datosTurno, empresaId = null) {
  try {
    const { empleadoId, nombreEmpleado, documentoEmpleado, cargo, salario, ...datosDelTurno } = datosTurno;
    
    // Obtener las fechas del nuevo turno
    const nuevaFechaInicio = new Date(datosDelTurno.fechaInicio);
    const nuevaFechaFin = new Date(datosDelTurno.fechaFin);
    
    // Filtro base para buscar documento existente
    const filtroBase = { empleadoId };
    if (empresaId) filtroBase.empresaId = empresaId;

    // Buscar si ya existe un documento para este empleado
    let documentoTurno = await Turno.findOne(filtroBase);
    
    if (documentoTurno) {
      // YA EXISTE - Verificar solapamientos y sobrescribir
      console.log(`✅ Documento existente encontrado para empleado ${empleadoId}, verificando solapamientos...`);
      
      // Procesar cada turno del historial para eliminar días solapados
      documentoTurno.historialTurnos.forEach(turno => {
        if (turno.cronogramaDetallado && turno.cronogramaDetallado.length > 0) {
          // Filtrar los días que NO se solapan con el nuevo turno
          const diasNoSolapados = turno.cronogramaDetallado.filter(dia => {
            const fechaDia = new Date(dia.fecha);
            // Mantener solo los días que están FUERA del rango del nuevo turno
            return fechaDia < nuevaFechaInicio || fechaDia > nuevaFechaFin;
          });
          
          const diasEliminados = turno.cronogramaDetallado.length - diasNoSolapados.length;
          if (diasEliminados > 0) {
            console.log(`🔄 Sobrescribiendo ${diasEliminados} días del turno anterior (${turno.fechaInicio} - ${turno.fechaFin})`);
          }
          
          turno.cronogramaDetallado = diasNoSolapados;
          
          // Si el turno quedó sin días, marcarlo como inactivo
          if (diasNoSolapados.length === 0) {
            turno.activo = false;
            console.log(`⚠️ Turno anterior quedó vacío, marcado como inactivo`);
          } else {
            // Actualizar fechas del turno anterior según los días restantes
            const fechasRestantes = diasNoSolapados.map(d => new Date(d.fecha)).sort((a, b) => a - b);
            if (fechasRestantes.length > 0) {
              turno.fechaInicio = fechasRestantes[0];
              turno.fechaFin = fechasRestantes[fechasRestantes.length - 1];
            }
          }
        }
        
        // Desactivar el turno anterior (el nuevo será el activo)
        turno.activo = false;
      });
      
      // Agregar nuevo turno al historial
      documentoTurno.historialTurnos.push({
        ...datosDelTurno,
        fechaCreacion: new Date(),
        activo: true
      });
      
      // Actualizar turnoActual para consultas rápidas
      documentoTurno.turnoActual = {
        area: datosDelTurno.area,
        subarea: datosDelTurno.subarea,
        turno: datosDelTurno.turno,
        fechaInicio: datosDelTurno.fechaInicio,
        fechaFin: datosDelTurno.fechaFin,
        activo: true
      };
      
      // Actualizar datos del empleado (por si cambiaron)
      documentoTurno.nombreEmpleado = nombreEmpleado;
      documentoTurno.documentoEmpleado = documentoEmpleado;
      documentoTurno.cargo = cargo;
      documentoTurno.salario = salario;
      
      // Limpiar historial: eliminar turnos que quedaron sin días
      documentoTurno.historialTurnos = documentoTurno.historialTurnos.filter(
        turno => !turno.cronogramaDetallado || turno.cronogramaDetallado.length > 0
      );
      
      await documentoTurno.save();
      syncTurnoPG(documentoEmpleado, datosDelTurno, documentoTurno._id).catch(() => {});
      
      console.log(`📊 Historial actualizado: ${documentoTurno.historialTurnos.length} turnos en total`);
      
      return documentoTurno;
      
    } else {
      // NO EXISTE - Crear nuevo documento con el primer turno en el historial
      console.log(`🆕 Creando nuevo documento para empleado ${empleadoId}...`);
      
      const nuevoDocumento = new Turno({
        empleadoId,
        empresaId: empresaId || null,
        nombreEmpleado,
        documentoEmpleado,
        cargo,
        salario,
        turnoActual: {
          area: datosDelTurno.area,
          subarea: datosDelTurno.subarea,
          turno: datosDelTurno.turno,
          fechaInicio: datosDelTurno.fechaInicio,
          fechaFin: datosDelTurno.fechaFin,
          activo: true
        },
        historialTurnos: [{
          ...datosDelTurno,
          fechaCreacion: new Date(),
          activo: true
        }],
        fechaCreacion: new Date()
      });
      
      await nuevoDocumento.save();
      syncTurnoPG(documentoEmpleado, datosDelTurno, nuevoDocumento._id).catch(() => {});
      
      console.log(`✅ Documento creado con éxito, ID: ${nuevoDocumento._id}`);
      
      return nuevoDocumento;
    }
    
  } catch (error) {
    console.error('❌ Error en crearTurno:', error);
    throw new Error(`Error creando turno: ${error.message}`);
  }
}

/**
 * Obtiene el historial completo de turnos de un empleado
 */
async function obtenerHistorialEmpleado(empleadoId, empresaId = null) {
  try {
    const filtro = { empleadoId };
    if (empresaId) filtro.empresaId = empresaId;
    const documento = await Turno.findOne(filtro);
    
    if (!documento) {
      return {
        empleadoId,
        historial: [],
        mensaje: 'No se encontraron turnos asignados para este empleado'
      };
    }
    
    return {
      empleadoId: documento.empleadoId,
      nombreEmpleado: documento.nombreEmpleado,
      documentoEmpleado: documento.documentoEmpleado,
      turnoActual: documento.turnoActual,
      historialTurnos: documento.historialTurnos.sort((a, b) => b.fechaCreacion - a.fechaCreacion),
      totalTurnos: documento.historialTurnos.length
    };
    
  } catch (error) {
    throw new Error(`Error obteniendo historial del empleado: ${error.message}`);
  }
}

/**
 * Obtiene el turno actual activo de un empleado
 */
async function obtenerTurnoActual(empleadoId, empresaId = null) {
  try {
    const filtro = { empleadoId };
    if (empresaId) filtro.empresaId = empresaId;
    const documento = await Turno.findOne(filtro);
    
    if (!documento || !documento.turnoActual.activo) {
      return null;
    }
    
    // Buscar el turno activo en el historial
    const turnoActivo = documento.historialTurnos.find(t => t.activo);
    
    return {
      empleadoId: documento.empleadoId,
      nombreEmpleado: documento.nombreEmpleado,
      turnoActual: documento.turnoActual,
      detalleCompleto: turnoActivo
    };
    
  } catch (error) {
    throw new Error(`Error obteniendo turno actual: ${error.message}`);
  }
}

/**
 * Obtiene turnos con filtros
 */
async function obtenerTurnos(filtro = {}, empresaId = null) {
  try {
    if (empresaId) filtro.empresaId = empresaId;
    // Buscar en todos los documentos de turnos
    const documentos = await Turno.find(filtro).sort({ ultimaActualizacion: -1 });
    
    // Aplanar el historial de turnos para devolverlos en formato compatible
    const turnosAplanados = [];
    
    documentos.forEach(doc => {
      doc.historialTurnos.forEach(turno => {
        turnosAplanados.push({
          _id: turno._id,
          empleadoId: doc.empleadoId,
          nombreEmpleado: doc.nombreEmpleado,
          documentoEmpleado: doc.documentoEmpleado,
          cargo: doc.cargo,
          salario: doc.salario,
          ...turno.toObject(),
          documentoId: doc._id // Referencia al documento principal
        });
      });
    });
    
    return turnosAplanados;
  } catch (error) {
    throw new Error(`Error obteniendo turnos: ${error.message}`);
  }
}

/**
 * Obtiene un turno específico por ID del empleado y ID del turno en el historial
 */
async function obtenerTurnoPorId(turnoId) {
  try {
    // Buscar el documento que contiene este turno en su historial
    const documento = await Turno.findOne({ 'historialTurnos._id': turnoId });
    
    if (!documento) {
      return null;
    }
    
    // Encontrar el turno específico en el historial
    const turno = documento.historialTurnos.id(turnoId);
    
    if (!turno) {
      return null;
    }
    
    return {
      _id: turno._id,
      empleadoId: documento.empleadoId,
      nombreEmpleado: documento.nombreEmpleado,
      documentoEmpleado: documento.documentoEmpleado,
      cargo: documento.cargo,
      salario: documento.salario,
      ...turno.toObject(),
      documentoId: documento._id
    };
    
  } catch (error) {
    throw new Error(`Error obteniendo turno: ${error.message}`);
  }
}

/**
 * Obtiene turnos con empleados poblados (para compatibilidad con código existente)
 */
async function obtenerTurnosConEmpleados(filtro = {}, empresaId = null) {
  try {
    const turnos = await obtenerTurnos(filtro, empresaId);
    return turnos;
  } catch (error) {
    throw new Error(`Error obteniendo turnos con empleados: ${error.message}`);
  }
}

module.exports = {
  generarTurnosAdministrativos,
  generarTurnosTaquilleros,
  generarTurnosArea,
  procesarFinDeSemanaConTablas,
  crearTurnoTaquillero,
  crearTurno,
  obtenerTurnos,
  obtenerTurnoPorId,
  obtenerTurnosConEmpleados,
  obtenerHistorialEmpleado,
  obtenerTurnoActual
};