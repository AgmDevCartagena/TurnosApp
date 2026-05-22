/**
 * Controlador de Turnos - Solo Función Avanzada con Cronograma Detallado
 * 
 * ==================== FUNCIONES DISPONIBLES ====================
 * 
 *  SOLO TURNOS AVANZADOS (con cronograma detallado día por día):
 *     asignarTurnosTaquilleros() - Para taquilleros con scheduling completo
 *     Incluye campo cronogramaDetallado[] en BD
 *     Horarios específicos por día, festivos, descansos
 *     Observaciones automáticas
 *
 *  FUNCIÓN SIMPLE ELIMINADA - No más conflictos entre funciones
 * 
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const Turno = require('../models/Turno');
const Empleado = require('../models/Empleado');
const empleadosService = require('../services/empleadosService');
const festivosService = require('../services/festivosService');
const tablasDescansoService = require('../services/tablasDescansoService');
const turnosService = require('../services/turnosService');
const horariosService = require('../services/horariosService');

// ========== HELPER PARA FECHAS ==========
/**
 * Clona una fecha sin problemas de zona horaria
 * Si recibe un objeto Date, lo clona usando año/mes/día
 * Si recibe un string, lo parsea correctamente
 */
function clonarFechaLocal(fecha) {
  if (!fecha) {
    return new Date(); // Fallback a fecha actual
  }
  
  if (fecha instanceof Date) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  }
  
  // Si es un string
  if (typeof fecha === 'string') {
    // Si contiene 'T', es formato ISO
    if (fecha.includes('T')) {
      const fechaStr = fecha.split('T')[0];
      const [año, mes, dia] = fechaStr.split('-').map(Number);
      return new Date(año, mes - 1, dia);
    }
    // Si es string en formato YYYY-MM-DD
    const [año, mes, dia] = fecha.split('-').map(Number);
    return new Date(año, mes - 1, dia);
  }
  
  // Si es un objeto con toISOString (Date-like de Mongoose)
  if (fecha.toISOString) {
    const d = new Date(fecha);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  
  // Fallback: intentar crear Date directamente
  const d = new Date(fecha);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Elimina días solapados del historial de turnos existente
 * @param {Object} documentoTurno - Documento de turno del empleado
 * @param {Date} nuevaFechaInicio - Fecha de inicio del nuevo turno
 * @param {Date} nuevaFechaFin - Fecha de fin del nuevo turno
 */
function eliminarDiasSolapados(documentoTurno, nuevaFechaInicio, nuevaFechaFin) {
  if (!documentoTurno.historialTurnos || documentoTurno.historialTurnos.length === 0) {
    return;
  }
  
  const inicio = clonarFechaLocal(nuevaFechaInicio);
  const fin = clonarFechaLocal(nuevaFechaFin);
  
  documentoTurno.historialTurnos.forEach(turno => {
    if (turno.cronogramaDetallado && turno.cronogramaDetallado.length > 0) {
      // Filtrar los días que NO se solapan con el nuevo turno
      const diasOriginales = turno.cronogramaDetallado.length;
      turno.cronogramaDetallado = turno.cronogramaDetallado.filter(dia => {
        const fechaDia = clonarFechaLocal(dia.fecha);
        // Mantener solo los días que están FUERA del rango del nuevo turno
        return fechaDia < inicio || fechaDia > fin;
      });
      
      const diasEliminados = diasOriginales - turno.cronogramaDetallado.length;
      if (diasEliminados > 0) {
        console.log(`🔄 Sobrescribiendo ${diasEliminados} días del turno anterior`);
      }
      
      // Si el turno quedó sin días, marcarlo como inactivo
      if (turno.cronogramaDetallado.length === 0) {
        turno.activo = false;
      } else {
        // Actualizar fechas del turno anterior según los días restantes
        const fechasRestantes = turno.cronogramaDetallado.map(d => clonarFechaLocal(d.fecha)).sort((a, b) => a - b);
        if (fechasRestantes.length > 0) {
          turno.fechaInicio = fechasRestantes[0];
          turno.fechaFin = fechasRestantes[fechasRestantes.length - 1];
        }
      }
    }
    
    // Desactivar el turno anterior (el nuevo será el activo)
    turno.activo = false;
  });
  
  // Limpiar historial: eliminar turnos que quedaron sin días
  documentoTurno.historialTurnos = documentoTurno.historialTurnos.filter(
    turno => !turno.cronogramaDetallado || turno.cronogramaDetallado.length > 0
  );
}

// ========== CONTROLADORES DE EMPLEADOS ==========

exports.obtenerEmpleados = async (req, res) => {
  try {
    let { area } = req.query;

    // Mapeo de áreas para compatibilidad (Usuario usa CENTRO_CONTROL, Empleado usa CENTRO DE CONTROL)
    const mapeoAreas = {
      'CENTRO_CONTROL': 'CENTRO DE CONTROL',
      'CENTRO DE CONTROL': 'CENTRO DE CONTROL'
    };

    // Función para normalizar área
    const normalizarArea = (a) => mapeoAreas[a] || a;

    // Verificar permisos de área si no es admin
    if (req.session.usuario && req.session.usuario.rol !== 'admin') {
      const areasPermitidasOriginales = req.session.usuario.areasPermitidas || [];
      // Normalizar las áreas permitidas
      const areasPermitidas = areasPermitidasOriginales.map(normalizarArea);

      console.log('🔍 Usuario:', req.session.usuario.username);
      console.log('🔍 Áreas permitidas (original):', areasPermitidasOriginales);
      console.log('🔍 Áreas permitidas (normalizado):', areasPermitidas);

      // Si se solicita un área específica, verificar que esté permitida
      if (area) {
        const areaNormalizada = normalizarArea(area);
        if (!areasPermitidas.includes(areaNormalizada)) {
          return res.status(403).json({ error: 'No tienes permiso para ver empleados de esta área' });
        }
      } else {
        // Si no se especifica área, filtrar por todas las permitidas
        const todosEmpleados = await empleadosService.obtenerEmpleados(null, req.empresaId);
        console.log('🔍 Total empleados en BD:', todosEmpleados.length);
        const empleadosFiltrados = todosEmpleados.filter(e => {
          const areaEmpleado = normalizarArea(e.area);
          const tienePermiso = areasPermitidas.includes(areaEmpleado);
          return tienePermiso;
        });
        console.log('🔍 Empleados filtrados:', empleadosFiltrados.length);
        return res.json(empleadosFiltrados);
      }
    }

    const empleados = await empleadosService.obtenerEmpleados(area, req.empresaId);
    res.json(empleados);
  } catch (error) {
    console.error('❌ Error en obtenerEmpleados:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.crearEmpleado = async (req, res) => {
  try {
    const empleado = await empleadosService.crearEmpleado(req.body, req.empresaId);
    res.status(201).json({ message: 'Empleado creado exitosamente', empleado });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.crearEmpleadosCSV = async (req, res) => {
  try {
    console.log(' DEBUG CSV - Datos recibidos:', req.body);
    const { empleados } = req.body;
    console.log(' DEBUG CSV - Array empleados:', empleados?.length || 'undefined');
    const resultados = await empleadosService.procesarEmpleadosCSV(empleados, req.empresaId);

    res.json({
      mensaje: 'Importación CSV completada',
      resumen: {
        exitosos: resultados.exitosos.length,
        errores: resultados.errores.length,
        duplicados: resultados.duplicados.length,
        total: empleados.length
      },
      detalles: {
        exitosos: resultados.exitosos,
        errores: resultados.errores,
        duplicados: resultados.duplicados
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.completarDatosTaquillero = async (req, res) => {
  try {
    const { cedula } = req.params;
    const empleado = await empleadosService.completarDatosTaquillero(cedula, req.body);
    res.json({ message: 'Datos completados exitosamente', empleado });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ========== CONSULTAS DE TURNOS ==========

exports.obtenerTurnosSemana = async (req, res) => {
  try {
    const { inicioSemana, finSemana, busqueda } = req.query;

    let filtro = {
      fecha: {
        $gte: new Date(inicioSemana),
        $lte: new Date(finSemana)
      }
    };

    if (busqueda) {
      filtro.$or = [
        { 'empleadoId.nombre': { $regex: busqueda, $options: 'i' } },
        { 'empleadoId.documento': { $regex: busqueda, $options: 'i' } }
      ];
    }

    const turnos = await turnosService.obtenerTurnosConEmpleados(filtro, req.empresaId);
    res.json(turnos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========== CONSULTAS DE HISTORIAL DE TURNOS ==========

/**
 * Obtiene el historial completo de turnos de un empleado
 * GET /api/empleado/:id/historial
 */
exports.obtenerHistorialEmpleado = async (req, res) => {
  try {
    const { id: empleadoId } = req.params;

    const historial = await turnosService.obtenerHistorialEmpleado(empleadoId, req.empresaId);

    res.json({
      success: true,
      data: historial
    });

  } catch (error) {
    console.error('Error obteniendo historial del empleado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obtiene el turno actual activo de un empleado
 * GET /api/empleado/:id/turno-actual
 */
exports.obtenerTurnoActualEmpleado = async (req, res) => {
  try {
    const { id: empleadoId } = req.params;

    const turnoActual = await turnosService.obtenerTurnoActual(empleadoId, req.empresaId);

    if (!turnoActual) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró un turno activo para este empleado'
      });
    }

    res.json({
      success: true,
      data: turnoActual
    });

  } catch (error) {
    console.error('Error obteniendo turno actual del empleado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== ASIGNACIÓN DE TURNOS A TAQUILLEROS (FUNCIÓN AVANZADA) ==========

/**
 * FUNCIÓN AVANZADA - Asignar turnos con CRONOGRAMA DETALLADO día por día
 * Esta función genera turnos completos con desglose día por día incluyendo:
 * - Horarios específicos por cada día de la semana
 * - Detección automática de festivos y domingos
 * - Integración con tabla de descanso
 * - Observaciones automáticas para casos especiales
 * EXCLUSIVA para taquilleros con asignaciones semanales/quincenales
 */
exports.asignarTurnosTaquilleros = async (req, res) => {
  try {
    console.log('===== FUNCIÓN AVANZADA INICIADA =====');
    console.log('CRONOGRAMA DETALLADO - asignarTurnosTaquilleros');
    console.log('DEBUG - Iniciando asignación con CRONOGRAMA DETALLADO');
    const { asignaciones } = req.body;

    if (!asignaciones || !Array.isArray(asignaciones) || asignaciones.length === 0) {
      return res.status(400).json({
        error: 'Se requiere un array de asignaciones con al menos un elemento'
      });
    }

    const resultados = [];

    // Procesar cada asignación
    for (const asignacion of asignaciones) {
      const { empleadoId, nombre, subarea, turno, tablaDescanso, fechaInicio, fechaFin } = asignacion;

      try {
        // Verificar que el empleado existe
        const empleado = await empleadosService.obtenerEmpleadoPorId(empleadoId, req.empresaId);

        if (!empleado) {
          resultados.push({
            empleadoId,
            nombre,
            success: false,
            error: 'Empleado no encontrado'
          });
          continue;
        }

        // Generar cronograma detallado día por día
        console.log('🔄 Generando cronograma para:', { subarea, turno, tablaDescanso, fechaInicio, fechaFin });
        const cronogramaDetallado = await generarCronogramaDetallado({
          subarea,
          turno,
          tablaDescanso,
          fechaInicio,
          fechaFin
        });
        console.log('📊 Cronograma generado, items:', cronogramaDetallado?.length);
        console.log('📋 Primeros 2 días:', cronogramaDetallado?.slice(0, 2));

        // Crear el turno CON CRONOGRAMA DETALLADO (función avanzada)
        const nuevoTurno = {
          empleadoId,
          nombreEmpleado: empleado.nombre,
          documentoEmpleado: empleado.documento,
          area: empleado.area,
          cargo: empleado.cargo,
          salario: empleado.salario || 0,
          subarea,
          turno,
          tablaDescanso,
          fechaInicio,
          fechaFin,
          cronogramaDetallado, // ⭐ CAMPO EXCLUSIVO DE ESTA FUNCIÓN CON DATOS COMPLETOS
          fechaCreacion: new Date(),
          activo: true
        };

        console.log('Guardando turno CON CRONOGRAMA DETALLADO:', {
          empleado: nuevoTurno.nombreEmpleado,
          cronogramaItems: nuevoTurno.cronogramaDetallado?.length || 0
        });

        const turnoCreado = await turnosService.crearTurno(nuevoTurno, req.empresaId);

        console.log('Turno con CRONOGRAMA DETALLADO creado exitosamente:', {
          id: turnoCreado._id,
          cronogramaGuardado: !!turnoCreado.cronogramaDetallado
        });

        // Preparar información completa para el frontend
        const turnoCompleto = {
          empleado: {
            id: empleado._id,
            nombre: empleado.nombre,
            documento: empleado.documento,
            area: empleado.area
          },
          configuracion: {
            subarea,
            turno,
            tablaDescanso,
            fechaInicio,
            fechaFin
          },
          cronogramaDetallado: turnoCreado.cronogramaDetallado || [],
          tablaDescansoInfo: {
            tabla: tablaDescanso,
            totalDiasDescanso: cronogramaDetallado.filter(d => d.esDescanso).length,
            fechasDescansoEnRango: cronogramaDetallado.filter(d => d.esDescanso).map(d => d.fecha)
          }
        };

        resultados.push({
          empleadoId,
          nombre: empleado.nombre,
          documento: empleado.documento,
          turnoId: turnoCreado._id,
          success: true,
          mensaje: 'Turno con cronograma detallado creado exitosamente',
          turnoCompleto
        });

      } catch (error) {
        console.error('Error procesando asignación:', error);
        resultados.push({
          empleadoId,
          nombre: nombre || 'Desconocido',
          success: false,
          error: error.message
        });
      }
    }

    // Preparar respuesta final
    const exitosos = resultados.filter(r => r.success);
    const fallidos = resultados.filter(r => !r.success);

    res.json({
      message: 'Asignación completada: ' + exitosos.length + ' exitosos, ' + fallidos.length + ' fallidos',
      totalProcesados: resultados.length,
      exitosos: exitosos.length,
      fallidos: fallidos.length,
      resultados
    });

  } catch (error) {
    console.error('Error en asignación de turnos:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========== ASIGNACIÓN DE TURNOS ADMINISTRATIVOS ==========

/**
 * Asigna turnos administrativos con horario fijo Lun-Vie 7am-5pm
 * Hora de almuerzo: 12pm-1pm (1 hora)
 * Jornada: 9 horas (8 horas laborables + 1 hora almuerzo)
 * Los fines de semana y festivos quedan como días de descanso
 */
exports.asignarTurnosAdministrativos = async (req, res) => {
  try {
    const { empleados, fechaInicio, fechaFin } = req.body;

    if (!empleados || empleados.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un empleado administrativo' });
    }

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Debe proporcionar fechaInicio y fechaFin' });
    }

    // Validar fechas
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }

    if (inicio > fin) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    // Cargar festivos
    const festivosData = JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/festivos2025.json'), 'utf-8'));
    const festivos = Array.isArray(festivosData)
      ? festivosData.map(f => f.date || f.fecha)
      : (festivosData.festivos || []).map(f => f.date || f.fecha);

    // Procesar cada empleado
    const resultados = [];

    for (const empleadoId of empleados) {
      let nombre = 'Desconocido'; // Declarar fuera del try para usar en catch

      try {
        // Obtener datos del empleado
        const empleado = await Empleado.findById(empleadoId);

        if (!empleado) {
          resultados.push({
            empleadoId,
            nombre: 'Desconocido',
            success: false,
            error: 'Empleado no encontrado'
          });
          continue;
        }

        nombre = empleado.nombre; // Actualizar nombre
        const { documento, cargo, salario } = empleado;

        // Generar cronograma administrativo
        const cronograma = generarCronogramaAdministrativo(inicio, fin, festivos);

        // Crear registro de turno administrativo usando el servicio (con historial)
        const nuevoTurno = await turnosService.crearTurno({
          empleadoId,
          nombreEmpleado: nombre,
          documentoEmpleado: documento,
          cargo: cargo || 'Administrativo',
          salario: salario || 0,
          area: 'ADMINISTRACION',
          subarea: 'OFICINA',
          turno: 'FIJO_LUN_VIE',
          tipoTurno: 'ADMINISTRATIVO',
          horaInicio: '07:00',
          horaFin: '17:00',
          horaAlmuerzoInicio: '12:00',
          horaAlmuerzoFin: '13:00',
          fechaInicio: inicio,
          fechaFin: fin,
          cronogramaDetallado: cronograma
        });

        resultados.push({
          empleadoId,
          nombre,
          success: true,
          turnoId: nuevoTurno._id,
          diasLaborables: cronograma.filter(d => d.tipoDay === 'LABORABLE').length,
          diasDescanso: cronograma.filter(d => d.tipoDay === 'DESCANSO' || d.tipoDay === 'FIN_SEMANA').length
        });

      } catch (error) {
        resultados.push({
          empleadoId,
          nombre: nombre, // Ahora está definido en el scope externo
          success: false,
          error: error.message
        });
      }
    }

    // Preparar respuesta
    const exitosos = resultados.filter(r => r.success);
    const fallidos = resultados.filter(r => !r.success);

    res.json({
      message: `Turnos administrativos asignados: ${exitosos.length} exitosos, ${fallidos.length} fallidos`,
      totalProcesados: resultados.length,
      exitosos: exitosos.length,
      fallidos: fallidos.length,
      resultados
    });

  } catch (error) {
    console.error('Error en asignación de turnos administrativos:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Genera cronograma detallado para empleados administrativos
 * Horario fijo: Lunes a Viernes 7:00am - 5:00pm (10 horas con 1 hora almuerzo = 8 horas laborables)
 * Hora de almuerzo: 12:00pm - 1:00pm
 * Sábados, domingos y festivos: Descanso
 */
function generarCronogramaAdministrativo(fechaInicio, fechaFin, festivos) {
  const cronograma = [];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  let fechaActual = clonarFechaLocal(fechaInicio);
  const fechaLimite = clonarFechaLocal(fechaFin);

  while (fechaActual <= fechaLimite) {
    const año = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    const fechaStr = `${año}-${mes}-${dia}`;
    const diaSemanaIdx = fechaActual.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    const diaSemana = diasSemana[diaSemanaIdx];

    const esFestivo = festivos.includes(fechaStr);
    const esFinDeSemana = diaSemanaIdx === 0 || diaSemanaIdx === 6; // Domingo o Sábado

    let detalleDia;

    if (esFestivo) {
      // Festivo - Día de descanso
      detalleDia = {
        fecha: fechaStr,
        diaSemana,
        tipoDay: 'DESCANSO', // Usar tipoDay en lugar de tipoDia
        horaInicio: null,
        horaFin: null,
        observaciones: 'Festivo',
        esFestivo: true,
        esDescanso: true
      };
    } else if (esFinDeSemana) {
      // Fin de semana - Día de descanso
      detalleDia = {
        fecha: fechaStr,
        diaSemana,
        tipoDay: 'FIN_SEMANA', // Usar tipoDay y FIN_SEMANA
        horaInicio: null,
        horaFin: null,
        observaciones: 'Fin de semana',
        esFestivo: false,
        esDescanso: true
      };
    } else {
      // Día laborable - Lunes a Viernes 7am-5pm (8 horas laborables + 1 hora almuerzo)
      detalleDia = {
        fecha: fechaStr,
        diaSemana,
        tipoDay: 'LABORABLE',
        horaInicio: '07:00',
        horaFin: '17:00',
        horaAlmuerzoInicio: '12:00',
        horaAlmuerzoFin: '13:00',
        observaciones: 'Horario administrativo - 7am a 5pm (almuerzo 12pm-1pm)',
        esFestivo: false,
        esDescanso: false
      };
    }

    cronograma.push(detalleDia);

    // Avanzar al siguiente día
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return cronograma;
}

// ========== ASIGNACIÓN DE TURNOS CENTRO DE CONTROL ==========

/**
 * Asigna turnos a operadores de Centro de Control
 * Turno Mañana: Lun-Vie 4:30-12:30, Sáb 4:30-14:30, Dom/Festivos 5:00-14:00
 * Turno Tarde: Lun-Vie 15:30-23:30, Sáb 14:30-23:30, Dom/Festivos 14:00-23:30
 */
exports.asignarTurnosCentroControl = async (req, res) => {
  try {
    const { empleados, fechaInicio, fechaFin, turno, tablaDescanso, configuracionManual } = req.body;

    console.log('🔍 Backend recibió:');
    console.log('  - req.body completo:', JSON.stringify(req.body, null, 2));
    console.log('  - turno:', turno);
    console.log('  - configuracionManual existe:', !!configuracionManual);
    console.log('  - configuracionManual keys:', configuracionManual ? Object.keys(configuracionManual).length : 0);
    console.log('  - configuracionManual type:', typeof configuracionManual);

    if (!empleados || empleados.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un operador de Centro de Control' });
    }

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Debe proporcionar fechaInicio y fechaFin' });
    }

    // Verificar si es modo manual
    const esModoManual = turno === 'MANUAL' && configuracionManual;
    console.log('  - esModoManual:', !!esModoManual);

    if (!esModoManual) {
      // Modo automático: validaciones existentes
      if (!turno || !['MAÑANA', 'TARDE', 'FIJO'].includes(turno)) {
        return res.status(400).json({ error: 'Debe especificar el turno: MAÑANA, TARDE o FIJO' });
      }

      // Validar tabla de descanso solo para turnos MAÑANA y TARDE
      if ((turno === 'MAÑANA' || turno === 'TARDE') && (!tablaDescanso || !['TABLA_1', 'TABLA_2', 'TABLA_3'].includes(tablaDescanso))) {
        return res.status(400).json({ error: 'Debe especificar la tabla de descanso para turnos MAÑANA y TARDE: TABLA_1, TABLA_2 o TABLA_3' });
      }
    } else {
      // Modo manual: validar que exista configuracionManual
      if (!configuracionManual || Object.keys(configuracionManual).length === 0) {
        return res.status(400).json({ error: 'Debe proporcionar la configuración manual de turnos día por día' });
      }
    }

    // Validar fechas
    const [añoInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
    const [añoFin, mesFin, diaFin] = fechaFin.split('-').map(Number);
    const inicio = new Date(añoInicio, mesInicio - 1, diaInicio);
    const fin = new Date(añoFin, mesFin - 1, diaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }

    if (inicio > fin) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    // Cargar festivos
    const festivosArray = JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/festivos2025.json'), 'utf-8'));
    const festivos = {};
    festivosArray.forEach(f => {
      const fecha = f.date || f.fecha;
      festivos[fecha] = f.name || f.nombre;
    });

    // Cargar tablas de descanso solo si no es turno FIJO ni modo manual
    let tablasCCData = null;
    if (!esModoManual && turno !== 'FIJO') {
      tablasCCData = JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/tablasCentroControl2025.json'), 'utf-8'));
    }

    // Procesar cada empleado
    const resultados = [];

    for (const empleadoId of empleados) {
      let nombre = 'Desconocido';

      try {
        // Obtener datos del empleado
        const empleado = await Empleado.findById(empleadoId);

        if (!empleado) {
          resultados.push({
            empleadoId,
            nombre: 'Desconocido',
            success: false,
            error: 'Empleado no encontrado'
          });
          continue;
        }

        nombre = empleado.nombre;
        const { documento, cargo, salario } = empleado;

        let cronograma;
        let codigoTurno;

        if (esModoManual) {
          // Modo manual: usar configuración personalizada
          cronograma = generarCronogramaManualCentroControl(inicio, fin, festivos, configuracionManual);
          codigoTurno = 'CC_MANUAL';
        } else {
          // Modo automático: usar función existente
          cronograma = generarCronogramaCentroControl(inicio, fin, Object.keys(festivos), turno, tablaDescanso, tablasCCData);

          if (turno === 'MAÑANA') {
            codigoTurno = 'CC_MAÑANA';
          } else if (turno === 'TARDE') {
            codigoTurno = 'CC_TARDE';
          } else {
            codigoTurno = 'CC_FIJO';
          }
        }

        // Buscar turno existente del empleado
        let turnoExistente = await Turno.findOne({ empleadoId });

        if (turnoExistente) {
          // Eliminar días solapados de turnos anteriores (sobrescribir)
          eliminarDiasSolapados(turnoExistente, inicio, fin);

          // Agregar nuevo turno al historial
          const nuevoHistorial = {
            fechaInicio: inicio,
            fechaFin: fin,
            area: 'CENTRO DE CONTROL',
            subarea: 'OPERACIONES',
            turno: codigoTurno,
            tipoTurno: esModoManual ? 'MANUAL' : 'PERSONALIZADO',
            cronogramaDetallado: cronograma,
            activo: true
          };

          // Solo agregar tablaDescanso si no es modo manual
          if (!esModoManual && tablaDescanso) {
            nuevoHistorial.tablaDescanso = tablaDescanso;
          }

          turnoExistente.historialTurnos.push(nuevoHistorial);

          // Actualizar turnoActual
          turnoExistente.turnoActual = {
            fechaInicio: inicio,
            fechaFin: fin,
            area: 'CENTRO DE CONTROL',
            subarea: 'OPERACIONES',
            turno: codigoTurno,
            tipoTurno: esModoManual ? 'MANUAL' : 'PERSONALIZADO'
          };

          await turnoExistente.save();
        } else {
          // Crear nuevo documento de turno
          const primerHistorial = {
            fechaInicio: inicio,
            fechaFin: fin,
            area: 'CENTRO DE CONTROL',
            subarea: 'OPERACIONES',
            turno: codigoTurno,
            tipoTurno: esModoManual ? 'MANUAL' : 'PERSONALIZADO',
            cronogramaDetallado: cronograma,
            activo: true
          };

          // Solo agregar tablaDescanso si no es modo manual
          if (!esModoManual && tablaDescanso) {
            primerHistorial.tablaDescanso = tablaDescanso;
          }

          turnoExistente = new Turno({
            empleadoId,
            nombreEmpleado: nombre,
            documentoEmpleado: documento,
            cargo: cargo || 'Operador Centro Control',
            salario: salario || 0,
            historialTurnos: [primerHistorial],
            turnoActual: {
              fechaInicio: inicio,
              fechaFin: fin,
              area: 'CENTRO DE CONTROL',
              subarea: 'OPERACIONES',
              turno: codigoTurno,
              tipoTurno: esModoManual ? 'MANUAL' : 'PERSONALIZADO'
            }
          });

          await turnoExistente.save();
          console.log(`✅ Turno guardado exitosamente para ${nombre} (ID: ${turnoExistente._id})`);
        }

        resultados.push({
          empleado: nombre,
          documento: documento,
          cargo: cargo || 'Operador Centro Control',
          turnosAsignados: cronograma.length,
          subarea: 'OPERACIONES',
          turno: esModoManual ? 'CC_MANUAL' : codigoTurno,
          tabla: esModoManual ? 'Configuración manual día por día' : tablaDescanso,
          cronograma: cronograma,
          success: true,
          turnoId: turnoExistente._id,
          diasLaborables: cronograma.filter(d => d.tipoDay === 'LABORABLE').length,
          diasDescanso: cronograma.filter(d => d.tipoDay === 'DESCANSO').length
        });

      } catch (error) {
        console.error(`❌ Error guardando turno para empleado ${empleadoId}:`, error);
        resultados.push({
          empleadoId,
          nombre: nombre,
          success: false,
          error: error.message
        });
      }
    }

    // Preparar respuesta
    const exitosos = resultados.filter(r => r.success);
    const fallidos = resultados.filter(r => !r.success);

    res.json({
      message: `Turnos Centro de Control asignados: ${exitosos.length} exitosos, ${fallidos.length} fallidos`,
      totalProcesados: resultados.length,
      exitosos: exitosos.length,
      fallidos: fallidos.length,
      resultados
    });

  } catch (error) {
    console.error('Error en asignación de turnos Centro de Control:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Asignar turnos a Operaciones (igual que Centro de Control pero con horarios diferentes)
 * Mañana: 5:00 AM - 2:15 PM
 * Tarde: 2:05 PM - 11:30 PM
 */
/**
 * Asignar turnos a Operaciones (modo manual y automático)
 * Mañana: 5:00 AM - 2:15 PM
 * Tarde: 2:05 PM - 11:30 PM
 */
exports.asignarTurnosOperaciones = async (req, res) => {
  try {
    const { empleados, fechaInicio, fechaFin, turno, tablaDescanso, configuracionManual } = req.body;

    console.log('🔍 Backend Operaciones recibió:');
    console.log('  - turno:', turno);
    console.log('  - configuracionManual existe:', !!configuracionManual);

    if (!empleados || empleados.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un operador' });
    }

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Debe proporcionar fechaInicio y fechaFin' });
    }

    // Verificar si es modo manual
    const esModoManual = turno === 'MANUAL' && configuracionManual;

    console.log('  - esModoManual:', esModoManual);

    if (!esModoManual) {
      if (!turno || !['MAÑANA', 'TARDE'].includes(turno)) {
        return res.status(400).json({ error: 'Debe especificar el turno: MAÑANA o TARDE' });
      }

      if (!tablaDescanso || !['TABLA_1', 'TABLA_2', 'TABLA_3'].includes(tablaDescanso)) {
        return res.status(400).json({ error: 'Debe especificar la tabla de descanso para turnos MAÑANA y TARDE' });
      }
    } else {
      console.log('  - Modo Manual activado, configuración recibida');
      if (!configuracionManual || Object.keys(configuracionManual).length === 0) {
        return res.status(400).json({ error: 'Debe proporcionar la configuración manual de turnos día por día' });
      }
    }

    // Validar fechas
    const [añoInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
    const [añoFin, mesFin, diaFin] = fechaFin.split('-').map(Number);
    const inicio = new Date(añoInicio, mesInicio - 1, diaInicio);
    const fin = new Date(añoFin, mesFin - 1, diaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }

    if (inicio > fin) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    // Cargar festivos
    const festivosArray = JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/festivos2025.json'), 'utf-8'));
    const festivos = {};
    festivosArray.forEach(f => {
      const fecha = f.date || f.fecha;
      festivos[fecha] = f.name || f.nombre;
    });

    // Cargar tablas de descanso solo si no es turno FIJO ni modo manual
    let tablasCCData = null;
    if (!esModoManual && turno !== 'FIJO') {
      tablasCCData = JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/tablasCentroControl2025.json'), 'utf-8'));
    }

    // Procesar cada empleado
    const resultados = [];

    for (const empleadoId of empleados) {
      let nombre = 'Desconocido';

      try {
        const empleado = await Empleado.findById(empleadoId);

        if (!empleado) {
          resultados.push({
            empleadoId,
            nombre: 'Desconocido',
            success: false,
            error: 'Empleado no encontrado'
          });
          continue;
        }

        nombre = empleado.nombre;
        const { documento, cargo, salario } = empleado;

        let cronograma;
        let codigoTurno;

        if (esModoManual) {
          cronograma = generarCronogramaManualOperaciones(inicio, fin, festivos, configuracionManual);
          codigoTurno = 'OP_MANUAL';
        } else {
          cronograma = generarCronogramaOperaciones(inicio, fin, Object.keys(festivos), turno, tablaDescanso, tablasCCData);

          if (turno === 'MAÑANA') {
            codigoTurno = 'OP_MAÑANA';
          } else if (turno === 'TARDE') {
            codigoTurno = 'OP_TARDE';
          } else {
            codigoTurno = 'OP_FIJO';
          }
        }

        // Buscar turno existente del empleado
        let turnoExistente = await Turno.findOne({ empleadoId });

        if (turnoExistente) {
          // Eliminar días solapados de turnos anteriores (sobrescribir)
          eliminarDiasSolapados(turnoExistente, inicio, fin);

          const nuevoHistorial = {
            fechaInicio: inicio,
            fechaFin: fin,
            area: 'OPERACIONES',
            subarea: 'OPERACIONES',
            turno: codigoTurno,
            tipoTurno: esModoManual ? 'MANUAL' : 'PERSONALIZADO',
            cronogramaDetallado: cronograma,
            activo: true
          };

          if (!esModoManual && tablaDescanso) {
            nuevoHistorial.tablaDescanso = tablaDescanso;
          }

          turnoExistente.historialTurnos.push(nuevoHistorial);

          turnoExistente.turnoActual = {
            fechaInicio: inicio,
            fechaFin: fin,
            area: 'OPERACIONES',
            subarea: 'OPERACIONES',
            turno: codigoTurno,
            tipoTurno: esModoManual ? 'MANUAL' : 'PERSONALIZADO'
          };

          await turnoExistente.save();
          console.log(`✅ Turno guardado exitosamente para ${nombre} (ID: ${turnoExistente._id})`);
        } else {
          const primerHistorial = {
            fechaInicio: inicio,
            fechaFin: fin,
            area: 'OPERACIONES',
            subarea: 'OPERACIONES',
            turno: codigoTurno,
            tipoTurno: esModoManual ? 'MANUAL' : 'PERSONALIZADO',
            cronogramaDetallado: cronograma,
            activo: true
          };

          if (!esModoManual && tablaDescanso) {
            primerHistorial.tablaDescanso = tablaDescanso;
          }

          turnoExistente = new Turno({
            empleadoId,
            nombreEmpleado: nombre,
            documentoEmpleado: documento,
            cargo: cargo || 'Operador',
            salario: salario || 0,
            historialTurnos: [primerHistorial],
            turnoActual: {
              fechaInicio: inicio,
              fechaFin: fin,
              area: 'OPERACIONES',
              subarea: 'OPERACIONES',
              turno: codigoTurno,
              tipoTurno: esModoManual ? 'MANUAL' : 'PERSONALIZADO'
            }
          });

          await turnoExistente.save();
          console.log(`✅ Turno guardado exitosamente para ${nombre} (ID: ${turnoExistente._id})`);
        }

        resultados.push({
          empleado: nombre,
          documento: documento,
          cargo: cargo || 'Operador',
          turnosAsignados: cronograma.length,
          subarea: 'OPERACIONES',
          turno: esModoManual ? 'OP_MANUAL' : codigoTurno,
          tabla: esModoManual ? 'Configuración manual día por día' : tablaDescanso,
          cronograma: cronograma,
          success: true,
          turnoId: turnoExistente._id,
          diasLaborables: cronograma.filter(d => d.tipoDay === 'LABORABLE').length,
          diasDescanso: cronograma.filter(d => d.tipoDay === 'DESCANSO').length
        });

      } catch (error) {
        console.error(`❌ Error guardando turno para empleado ${empleadoId}:`, error);
        resultados.push({
          empleadoId,
          nombre: nombre,
          success: false,
          error: error.message
        });
      }
    }

    const exitosos = resultados.filter(r => r.success);
    const fallidos = resultados.filter(r => !r.success);

    res.json({
      message: `Turnos Operaciones asignados: ${exitosos.length} exitosos, ${fallidos.length} fallidos`,
      totalProcesados: resultados.length,
      exitosos: exitosos.length,
      fallidos: fallidos.length,
      resultados
    });

  } catch (error) {
    console.error('❌ Error CAPTURADO en asignación de turnos Operaciones:', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Message:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Genera cronograma manual para Operaciones según configuración día por día
 * Mañana: 5:00 AM - 2:15 PM (todos los días igual)
 * Tarde: 2:05 PM - 11:30 PM (todos los días igual)
 */
function generarCronogramaManualOperaciones(fechaInicio, fechaFin, festivos, configuracionManual) {
  const cronograma = [];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  let fechaActual = clonarFechaLocal(fechaInicio);
  const fechaLimite = clonarFechaLocal(fechaFin);

  while (fechaActual <= fechaLimite) {
    const año = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    const fechaString = `${año}-${mes}-${dia}`;

    const diaSemanaIdx = fechaActual.getDay();
    const diaSemana = diasSemana[diaSemanaIdx];

    const esFestivo = festivos[fechaString] !== undefined;

    const configDia = configuracionManual[fechaString];

    if (!configDia) {
      fechaActual.setDate(fechaActual.getDate() + 1);
      continue;
    }

    const turnoDelDia = configDia.turno;

    let detalleDia;

    if (turnoDelDia === 'DESCANSO') {
      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'DESCANSO',
        horaInicio: null,
        horaFin: null,
        observaciones: 'Descanso manual',
        esFestivo: esFestivo,
        esDescanso: true
      };
    } else {
      let horaInicio, horaFin;

      if (turnoDelDia === 'MAÑANA') {
        horaInicio = '05:00';
        horaFin = '14:15';
      } else if (turnoDelDia === 'TARDE') {
        horaInicio = '14:05';
        horaFin = '23:30';
      } else if (turnoDelDia === 'FIJO') {
        horaInicio = '08:00';
        horaFin = '17:00';
      } else {
        horaInicio = '05:00';
        horaFin = '14:15';
      }

      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'LABORABLE',
        horaInicio,
        horaFin,
        observaciones: `${turnoDelDia} - Configuración manual`,
        esFestivo: esFestivo,
        esDescanso: false
      };
    }

    cronograma.push(detalleDia);
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return cronograma;
}

/**
 * @deprecated Reemplazada por la declaración posterior. Conservada por compatibilidad histórica.
 */
function generarCronogramaOperacionesLegacy(fechaInicio, fechaFin, festivos, turno, tablaDescanso, tablasCCData) {
  const cronograma = [];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Si es turno FIJO, generar horario administrativo
  if (turno === 'FIJO') {
    let fechaActual = clonarFechaLocal(fechaInicio);
    const fechaLimite = clonarFechaLocal(fechaFin);

    while (fechaActual <= fechaLimite) {
      const año = fechaActual.getFullYear();
      const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
      const dia = String(fechaActual.getDate()).padStart(2, '0');
      const fechaString = `${año}-${mes}-${dia}`;

      const diaSemanaIdx = fechaActual.getDay();
      const diaSemana = diasSemana[diaSemanaIdx];
      const esFestivo = festivos.includes(fechaString);
      const esFinDeSemana = diaSemanaIdx === 0 || diaSemanaIdx === 6;

      let detalleDia;

      if (esFinDeSemana || esFestivo) {
        detalleDia = {
          fecha: fechaString,
          diaSemana,
          tipoDay: esFestivo ? 'FESTIVO' : 'FIN_SEMANA',
          horaInicio: null,
          horaFin: null,
          observaciones: esFestivo ? 'Festivo' : 'Fin de semana',
          esFestivo: esFestivo,
          esDescanso: true
        };
      } else {
        detalleDia = {
          fecha: fechaString,
          diaSemana,
          tipoDay: 'LABORABLE',
          horaInicio: '08:00',
          horaFin: '17:00',
          observaciones: 'Horario administrativo',
          esFestivo: false,
          esDescanso: false
        };
      }

      cronograma.push(detalleDia);
      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    return cronograma;
  }

  // Para turnos MAÑANA y TARDE con tabla de descanso
  const diasDescanso = tablasCCData[tablaDescanso] || [];

  let fechaActual = clonarFechaLocal(fechaInicio);
  const fechaLimite = clonarFechaLocal(fechaFin);

  while (fechaActual <= fechaLimite) {
    const año = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    const fechaString = `${año}-${mes}-${dia}`;

    const diaSemanaIdx = fechaActual.getDay();
    const diaSemana = diasSemana[diaSemanaIdx];
    const esFestivo = festivos.includes(fechaString);
    const esDescanso = diasDescanso.includes(fechaString);

    let detalleDia;

    if (esDescanso) {
      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'DESCANSO',
        horaInicio: null,
        horaFin: null,
        observaciones: `Descanso según ${tablaDescanso}`,
        esFestivo: false,
        esDescanso: true
      };
    } else if (esFestivo) {
      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'FESTIVO',
        horaInicio: turno === 'MAÑANA' ? '05:00' : '14:05',
        horaFin: turno === 'MAÑANA' ? '14:15' : '23:30',
        observaciones: 'Festivo',
        esFestivo: true,
        esDescanso: false
      };
    } else {
      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'LABORABLE',
        horaInicio: turno === 'MAÑANA' ? '05:00' : '14:05',
        horaFin: turno === 'MAÑANA' ? '14:15' : '23:30',
        observaciones: turno === 'MAÑANA' ? 'Turno Mañana 5:00-14:15' : 'Turno Tarde 14:05-23:30',
        esFestivo: false,
        esDescanso: false
      };
    }

    cronograma.push(detalleDia);
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return cronograma;
}

/**
 * Genera cronograma manual para Centro de Control según configuración día por día
 * El usuario especifica manualmente el turno de cada día
 */
function generarCronogramaManualCentroControl(fechaInicio, fechaFin, festivos, configuracionManual) {
  const cronograma = [];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  let fechaActual = clonarFechaLocal(fechaInicio);
  const fechaLimite = clonarFechaLocal(fechaFin);

  while (fechaActual <= fechaLimite) {
    const año = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    const fechaString = `${año}-${mes}-${dia}`;

    const diaSemanaIdx = fechaActual.getDay();
    const diaSemana = diasSemana[diaSemanaIdx];

    const esFestivo = festivos[fechaString] !== undefined;

    // Obtener configuración del día desde el frontend
    const configDia = configuracionManual[fechaString];

    if (!configDia) {
      // Si no hay configuración, saltar este día
      fechaActual.setDate(fechaActual.getDate() + 1);
      continue;
    }

    const turnoDelDia = configDia.turno;

    let detalleDia;

    if (turnoDelDia === 'DESCANSO') {
      // Día de descanso
      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'DESCANSO',
        horaInicio: null,
        horaFin: null,
        observaciones: 'Descanso manual',
        esFestivo: esFestivo,
        esDescanso: true
      };
    } else {
      // Día laborable - determinar horario según el turno
      let horaInicio, horaFin;

      if (turnoDelDia === 'MAÑANA') {
        if (esFestivo || diaSemanaIdx === 0) {
          horaInicio = '05:00';
          horaFin = '14:30'; // Actualizado para festivos
        } else if (diaSemanaIdx === 6) {
          horaInicio = '04:30';
          horaFin = '14:30';
        } else {
          horaInicio = '04:30';
          horaFin = '12:30';
        }
      } else if (turnoDelDia === 'TARDE') {
        if (esFestivo || diaSemanaIdx === 0) {
          horaInicio = '14:30'; // Actualizado para festivos
          horaFin = '23:30';
        } else if (diaSemanaIdx === 6) {
          horaInicio = '14:30';
          horaFin = '23:30';
        } else {
          horaInicio = '15:30';
          horaFin = '23:30';
        }
      } else if (turnoDelDia === 'FIJO') {
        horaInicio = '08:00';
        horaFin = '17:00';
      } else {
        // Default a mañana
        horaInicio = '04:30';
        horaFin = '12:30';
      }

      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'LABORABLE',
        horaInicio,
        horaFin,
        observaciones: `${turnoDelDia} - Configuración manual`,
        esFestivo: esFestivo,
        esDescanso: false
      };
    }

    cronograma.push(detalleDia);
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return cronograma;
}

/**
 * Genera cronograma detallado para Centro de Control con días de descanso
 * Turno Mañana: Lun-Vie 4:30-12:30, Sáb 4:30-14:30, Dom/Festivos 5:00-14:00
 * Turno Tarde: Lun-Vie 15:30-23:30, Sáb 14:30-23:30, Dom/Festivos 14:00-23:30
 * Turno Fijo: Lun-Vie 8:00-17:00, Sáb/Dom/Festivos descanso
 * Incluye días de descanso según tabla asignada (excepto turno FIJO)
 */
function generarCronogramaCentroControl(fechaInicio, fechaFin, festivos, turno, tablaDescanso, tablasCCData) {
  const cronograma = [];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  let fechaActual = clonarFechaLocal(fechaInicio);
  const fechaLimite = clonarFechaLocal(fechaFin);

  while (fechaActual <= fechaLimite) {
    const año = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    const fechaStr = `${año}-${mes}-${dia}`;
    const diaSemanaIdx = fechaActual.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    const diaSemana = diasSemana[diaSemanaIdx];

    const esFestivo = festivos.includes(fechaStr);
    const esFinDeSemana = diaSemanaIdx === 0 || diaSemanaIdx === 6; // Domingo o Sábado

    let detalleDia;

    // Turno FIJO: Lun-Vie 8:00-17:00, descanso Sáb/Dom/Festivos
    if (turno === 'FIJO') {
      if (esFestivo || esFinDeSemana) {
        // Descanso en festivos y fines de semana
        detalleDia = {
          fecha: fechaStr,
          diaSemana,
          tipoDay: 'DESCANSO',
          horaInicio: null,
          horaFin: null,
          observaciones: esFestivo ? 'Festivo' : 'Fin de semana',
          esFestivo: esFestivo,
          esDescanso: true
        };
      } else {
        // Lunes a Viernes - Horario fijo
        detalleDia = {
          fecha: fechaStr,
          diaSemana,
          tipoDay: 'LABORABLE',
          horaInicio: '08:00',
          horaFin: '17:00',
          observaciones: 'Turno Fijo',
          esFestivo: false,
          esDescanso: false
        };
      }
    } else {
      // Turnos MAÑANA y TARDE con tabla de descanso
      // Verificar si es día de descanso según la tabla
      let esDescanso = false;
      const mesNombre = mes === 11 ? 'noviembre' : mes === 12 ? 'diciembre' : null;

      if (mesNombre && tablasCCData && tablasCCData.tablas[mesNombre]) {
        const diasDescanso = tablasCCData.tablas[mesNombre][tablaDescanso]?.dias || [];
        esDescanso = diasDescanso.includes(dia);
      }

      if (esDescanso) {
        // Día de descanso según tabla
        detalleDia = {
          fecha: fechaStr,
          diaSemana,
          tipoDay: 'DESCANSO',
          horaInicio: null,
          horaFin: null,
          observaciones: `Descanso por ${tablaDescanso.replace('_', ' ')}`,
          esFestivo: false,
          esDescanso: true
        };
      } else {
        // Día laborable - determinar horario
        let horaInicio, horaFin;

        if (turno === 'MAÑANA') {
          if (esFestivo || diaSemanaIdx === 0) {
            // Domingo o Festivo
            horaInicio = '05:00';
            horaFin = '14:00';
          } else if (diaSemanaIdx === 6) {
            // Sábado
            horaInicio = '04:30';
            horaFin = '14:30';
          } else {
            // Lunes a Viernes
            horaInicio = '04:30';
            horaFin = '12:30';
          }
        } else { // TARDE
          if (esFestivo || diaSemanaIdx === 0) {
            // Domingo o Festivo
            horaInicio = '14:00';
            horaFin = '23:30';
          } else if (diaSemanaIdx === 6) {
            // Sábado
            horaInicio = '14:30';
            horaFin = '23:30';
          } else {
            // Lunes a Viernes
            horaInicio = '15:30';
            horaFin = '23:30';
          }
        }

        detalleDia = {
          fecha: fechaStr,
          diaSemana,
          tipoDay: 'LABORABLE',
          horaInicio,
          horaFin,
          observaciones: esFestivo ? 'Festivo - Horario especial' : `Turno ${turno}`,
          esFestivo: esFestivo,
          esDescanso: false
        };
      }
    } // Cierre del else de MAÑANA y TARDE

    cronograma.push(detalleDia);

    // Avanzar al siguiente día
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return cronograma;
}

// ========== ASIGNACIÓN DE TURNOS OPERACIONES ==========

// FUNCIÓN DUPLICADA ELIMINADA - Ver línea 754 para la versión actualizada con soporte de modo manual

/**
 * Genera cronograma detallado para Operaciones con días de descanso
 * Turno Mañana: Lun-Sáb 5:00-14:00, Dom 5:30-14:00
 * Turno Tarde: Lun-Dom 14:00-23:30
 * Incluye días de descanso según tabla asignada
 */
function generarCronogramaOperaciones(fechaInicio, fechaFin, festivos, turno, tablaDescanso, tablasCCData) {
  const cronograma = [];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  let fechaActual = clonarFechaLocal(fechaInicio);
  const fechaLimite = clonarFechaLocal(fechaFin);

  while (fechaActual <= fechaLimite) {
    const año = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    const fechaStr = `${año}-${mes}-${dia}`;
    const diaSemanaIdx = fechaActual.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    const diaSemana = diasSemana[diaSemanaIdx];
    const diaNum = fechaActual.getDate();
    const mesNum = fechaActual.getMonth() + 1; // 0-indexed

    const esFestivo = festivos.includes(fechaStr);

    // Verificar si es día de descanso según la tabla
    let esDescanso = false;
    const mesNombre = mesNum === 11 ? 'noviembre' : mesNum === 12 ? 'diciembre' : null;

    if (mesNombre && tablasCCData.tablas[mesNombre]) {
      const diasDescanso = tablasCCData.tablas[mesNombre][tablaDescanso]?.dias || [];
      esDescanso = diasDescanso.includes(diaNum);
    }

    let detalleDia;

    if (esDescanso) {
      // Día de descanso según tabla
      detalleDia = {
        fecha: fechaStr,
        diaSemana,
        tipoDay: 'DESCANSO',
        horaInicio: null,
        horaFin: null,
        observaciones: `Descanso por ${tablaDescanso.replace('_', ' ')}`,
        esFestivo: false,
        esDescanso: true
      };
    } else {
      // Día laborable - determinar horario
      let horaInicio, horaFin;

      if (turno === 'MAÑANA') {
        if (diaSemanaIdx === 0) {
          // Domingo
          horaInicio = '05:30';
          horaFin = '14:00';
        } else {
          // Lunes a Sábado
          horaInicio = '05:00';
          horaFin = '14:00';
        }
      } else { // TARDE
        // Lunes a Domingo - mismo horario
        horaInicio = '14:00';
        horaFin = '23:30';
      }

      detalleDia = {
        fecha: fechaStr,
        diaSemana,
        tipoDay: 'LABORABLE',
        horaInicio,
        horaFin,
        observaciones: esFestivo ? 'Festivo - Horario normal' : `Turno ${turno}`,
        esFestivo: esFestivo,
        esDescanso: false
      };
    }

    cronograma.push(detalleDia);

    // Avanzar al siguiente día
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return cronograma;
}

// ========== OTRAS FUNCIONES REQUERIDAS ==========

exports.obtenerTurnosEmpleado = async (req, res) => {
  try {
    const { id: empleadoId } = req.params;
    const { inicio, fin } = req.query;

    const empleado = await empleadosService.obtenerEmpleadoPorId(empleadoId, req.empresaId);
    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    let filtro = { empleadoId };
    if (inicio && fin) {
      filtro.fecha = {
        $gte: inicio,
        $lte: fin
      };
    }

    const turnos = await turnosService.obtenerTurnos(filtro, req.empresaId);
    res.json(turnos);
  } catch (error) {
    console.error('Error obteniendo turnos del empleado:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.generarTurnosPorArea = async (req, res) => {
  try {
    const resultado = await turnosService.generarTurnosPorArea(req.body);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generarTablasDescansoAño = async (req, res) => {
  try {
    const { año } = req.body;
    const resultado = tablasDescansoService.generarPatronTablasDescanso(año);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerDiasDescansoTabla = async (req, res) => {
  try {
    const { tablaDescanso, año = 2025 } = req.body;
    const patron = tablasDescansoService.generarPatronTablasDescanso(año);
    const tabla = patron.tablas[tablaDescanso];

    if (!tabla) {
      return res.status(404).json({ error: 'Tabla de descanso no encontrada' });
    }

    res.json(tabla);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generarFestivosAño = async (req, res) => {
  try {
    const { año } = req.body;
    const resultado = festivosService.generarFestivosAño(año);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerConfiguracionHorarios = async (req, res) => {
  try {
    const configuracion = horariosService.obtenerConfiguracionCompleta();
    res.json(configuracion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.validarHorarioTurno = async (req, res) => {
  try {
    const { subarea, turno } = req.body;
    const esValido = horariosService.validarTurnoSubarea(subarea, turno);
    res.json({ valido: esValido });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========== GENERADOR DE CRONOGRAMA DETALLADO ==========

async function generarCronogramaDetallado({ subarea, turno, tablaDescanso, fechaInicio, fechaFin }) {
  const cronograma = [];
  // festivosService ya está importado al inicio del archivo

  // Normalizar formato de turno: "T100" -> "TURNO_100", pero si ya viene como "TURNO_100" dejarlo igual
  let turnoNormalizado;
  if (turno.startsWith('TURNO_')) {
    // Ya viene normalizado
    turnoNormalizado = turno;
  } else if (turno.startsWith('T')) {
    // Formato "T100" -> "TURNO_100"
    turnoNormalizado = turno.replace('T', 'TURNO_');
  } else {
    // Por si viene como "100" -> "TURNO_100"  
    turnoNormalizado = 'TURNO_' + turno;
  }
  console.log('🔄 Turno normalizado:', turno, '->', turnoNormalizado);
  console.log('Parámetros recibidos:', { subarea, turno, turnoNormalizado, tablaDescanso, fechaInicio, fechaFin });

  // Cargar días de descanso directamente del archivo JSON
  const tablasDescansoJSON = JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/tablasDescanso2025.json'), 'utf-8'));
  const diasDescansoTabla = [];

  // Normalizar formato de tabla: "TABLA_1" -> "1", "TABLA_4" -> "4"
  let tablaKey = tablaDescanso;
  if (tablaDescanso && tablaDescanso.startsWith('TABLA_')) {
    tablaKey = tablaDescanso.replace('TABLA_', '');
  }
  
  console.log('🔍 Buscando tabla:', tablaDescanso, '-> normalizada a:', tablaKey);
  console.log('🔍 Tablas disponibles en JSON:', Object.keys(tablasDescansoJSON.tablas));

  // Buscar tabla en el JSON
  const tablaDatos = tablasDescansoJSON.tablas[tablaKey];
  
  if (tablaDatos && tablaDatos.diasDescanso) {
    console.log('📊 Tabla encontrada:', tablaDatos.descripcion);
    console.log('📊 Meses disponibles:', Object.keys(tablaDatos.diasDescanso));
    
    // Convertir días a fechas completas YYYY-MM-DD
    const mesesMap = { 'octubre': 10, 'noviembre': 11, 'diciembre': 12 };
    
    for (const [nombreMes, dias] of Object.entries(tablaDatos.diasDescanso)) {
      const numMes = mesesMap[nombreMes];
      if (numMes) {
        console.log(`📅 Procesando ${nombreMes}: días`, dias);
        dias.forEach(dia => {
          const fechaStr = `2025-${numMes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
          diasDescansoTabla.push(fechaStr);
        });
      }
    }
    
    console.log('✅ Total días de descanso cargados:', diasDescansoTabla.length);
    console.log('📅 Todas las fechas:', diasDescansoTabla);
  } else {
    console.log('⚠️ No se encontró la tabla:', tablaKey);
  }

  // Configuración de horarios por turno y subárea
  const configuracionHorarios = {
    MEGABUS: {
      TURNO_100: {
        'LUNES': { inicio: '05:00', fin: '14:30' },
        'MARTES': { inicio: '05:00', fin: '14:30' },
        'MIERCOLES': { inicio: '05:00', fin: '14:30' },
        'JUEVES': { inicio: '05:00', fin: '14:30' },
        'VIERNES': { inicio: '05:00', fin: '14:30' },
        'SABADO': { inicio: '05:00', fin: '14:30' },
        'DOMINGO': { inicio: '05:30', fin: '14:30' },
        'FESTIVO': { inicio: '05:30', fin: '14:30' }
      },
      TURNO_300: {
        'LUNES': { inicio: '14:00', fin: '23:30' },
        'MARTES': { inicio: '14:00', fin: '23:30' },
        'MIERCOLES': { inicio: '14:00', fin: '23:30' },
        'JUEVES': { inicio: '14:00', fin: '23:30' },
        'VIERNES': { inicio: '14:00', fin: '23:30' },
        'SABADO': { inicio: '14:00', fin: '23:30' },
        'DOMINGO': { inicio: '14:15', fin: '23:30' },
        'FESTIVO': { inicio: '14:15', fin: '23:30' }
      },
      TURNO_400: {
        'LUNES': { inicio: '08:00', fin: '12:00', inicio2: '17:00', fin2: '21:00' },
        'MARTES': { inicio: '08:00', fin: '12:00', inicio2: '17:00', fin2: '21:00' },
        'MIERCOLES': { inicio: '08:00', fin: '12:00', inicio2: '17:00', fin2: '21:00' },
        'JUEVES': { inicio: '08:00', fin: '12:00', inicio2: '17:00', fin2: '21:00' },
        'VIERNES': { inicio: '08:00', fin: '12:00', inicio2: '17:00', fin2: '21:00' },
        'SABADO': { inicio: '08:00', fin: '12:00', inicio2: '17:00', fin2: '21:00' },
        'DOMINGO': { inicio: '08:00', fin: '12:00', inicio2: '17:00', fin2: '21:00' },
        'FESTIVO': { inicio: '08:00', fin: '12:00', inicio2: '17:00', fin2: '21:00' }
      }
    },
    MEGACABLE: {
      TURNO_100: {
        'LUNES': { inicio: '05:00', fin: '13:30' },
        'MARTES': { inicio: '05:00', fin: '13:30' },
        'MIERCOLES': { inicio: '05:00', fin: '13:30' },
        'JUEVES': { inicio: '05:00', fin: '13:30' },
        'VIERNES': { inicio: '05:00', fin: '13:30' },
        'SABADO': { inicio: '05:00', fin: '13:00' },
        'DOMINGO': { inicio: '06:00', fin: '13:00' },
        'FESTIVO': { inicio: '06:00', fin: '13:00' }
      },
      TURNO_300: {
        'LUNES': { inicio: '13:30', fin: '22:30' },
        'MARTES': { inicio: '13:30', fin: '22:30' },
        'MIERCOLES': { inicio: '13:30', fin: '22:30' },
        'JUEVES': { inicio: '13:30', fin: '22:30' },
        'VIERNES': { inicio: '13:30', fin: '22:30' },
        'SABADO': { inicio: '13:00', fin: '21:00' },
        'DOMINGO': { inicio: '13:00', fin: '20:00' },
        'FESTIVO': { inicio: '13:00', fin: '20:00' }
      }
    }
  };

  // Mapeo de días en mayúsculas sin acentos para coincidir con configuración
  const nombresDias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const nombresCompletos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  console.log('Configuración disponible para subárea:', Object.keys(configuracionHorarios));
  console.log('Turnos disponibles para', subarea, ':', Object.keys(configuracionHorarios[subarea] || {}));

  // Iterar por cada día en el rango
  const fechaActual = new Date(fechaInicio + 'T00:00:00'); // Forzar hora local
  const fechaFinal = new Date(fechaFin + 'T00:00:00'); // Forzar hora local

  while (fechaActual <= fechaFinal) {
    const fechaStr = fechaActual.toISOString().split('T')[0];
    const diaSemanaNum = fechaActual.getDay();
    const diaSemana = nombresDias[diaSemanaNum];
    const nombreCompleto = nombresCompletos[diaSemanaNum];
    const diaDelMes = fechaActual.getDate();

    let diaInfo = {
      fecha: fechaStr,
      diaSemana: nombreCompleto + ' ' + diaDelMes,
      tipoDay: 'LABORABLE',
      horaInicio: '',
      horaFin: '',
      observaciones: '',
      esFestivo: false,
      esDescanso: false
    };

    console.log('Procesando fecha: ' + fechaStr + ', día: ' + diaSemana + ' (' + nombreCompleto + ' ' + diaDelMes + ')');

    // Verificar si es día de descanso por tabla
    if (diasDescansoTabla.includes(fechaStr)) {
      diaInfo.tipoDay = 'DESCANSO';
      diaInfo.esDescanso = true;
      diaInfo.observaciones = 'Descanso por Tabla ' + tablaDescanso;
    }
    // Verificar si es festivo
    else if (esFestivo(new Date(fechaActual))) {
      diaInfo.tipoDay = 'FESTIVO';
      diaInfo.esFestivo = true;
      diaInfo.observaciones = 'Día festivo';

      const horarios = configuracionHorarios[subarea]?.[turnoNormalizado]?.['FESTIVO'];
      if (horarios) {
        diaInfo.horaInicio = horarios.inicio || '';
        diaInfo.horaFin = horarios.fin || '';
        if (horarios.inicio2) {
          diaInfo.observaciones += ' - Turno partido: ' + horarios.inicio + '-' + horarios.fin + ' y ' + horarios.inicio2 + '-' + horarios.fin2;
        }
      }
    }
    // Día laborable normal
    else {
      const horarios = configuracionHorarios[subarea]?.[turnoNormalizado]?.[diaSemana];
      console.log('Buscando horarios para: subarea=' + subarea + ', turno=' + turnoNormalizado + ', dia=' + diaSemana);

      if (horarios) {
        diaInfo.horaInicio = horarios.inicio || '';
        diaInfo.horaFin = horarios.fin || '';

        if (horarios.inicio2) {
          diaInfo.observaciones = 'Turno partido: ' + horarios.inicio + '-' + horarios.fin + ' y ' + horarios.inicio2 + '-' + horarios.fin2;
        }
        console.log('Horarios asignados:', diaInfo.horaInicio, '-', diaInfo.horaFin);
      } else {
        console.log('No se encontraron horarios para la configuración especificada');
      }
    }

    cronograma.push(diaInfo);

    // Avanzar al siguiente día
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  console.log('Cronograma generado: ' + cronograma.length + ' días');
  return cronograma;
}

// ========== ASIGNACIÓN DE TURNOS CONDUCTORES ==========

/**
 * Asigna turnos a conductores con configuración libre
 * El usuario especifica: fechas, horarios y días específicos de descanso
 */
/**
 * Asignar turnos a Conductores (modo manual y automático)
 * Diurno: 6:00 AM - 6:00 PM (12 horas)
 * Nocturno: 6:00 PM - 6:00 AM (12 horas)
 */
exports.asignarTurnosConductores = async (req, res) => {
  try {
    const { empleados, fechaInicio, fechaFin, turno, tablaDescanso, configuracionManual } = req.body;

    console.log('🔍 Backend Conductores recibió:');
    console.log('  - turno:', turno);
    console.log('  - configuracionManual existe:', !!configuracionManual);

    if (!empleados || empleados.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un conductor' });
    }

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Debe proporcionar fechaInicio y fechaFin' });
    }

    // Verificar si es modo manual
    const esModoManual = turno === 'MANUAL' && configuracionManual;

    if (!esModoManual) {
      if (!turno || !['DIURNO', 'NOCTURNO'].includes(turno)) {
        return res.status(400).json({ error: 'Debe especificar el turno: DIURNO o NOCTURNO' });
      }

      if (!tablaDescanso || !['TABLA_1', 'TABLA_2', 'TABLA_3'].includes(tablaDescanso)) {
        return res.status(400).json({ error: 'Debe especificar la tabla de descanso' });
      }
    } else {
      if (!configuracionManual || Object.keys(configuracionManual).length === 0) {
        return res.status(400).json({ error: 'Debe proporcionar la configuración manual de turnos día por día' });
      }
    }

    // Validar fechas
    const [añoInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
    const [añoFin, mesFin, diaFin] = fechaFin.split('-').map(Number);
    const inicio = new Date(añoInicio, mesInicio - 1, diaInicio);
    const fin = new Date(añoFin, mesFin - 1, diaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }

    if (inicio > fin) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    // Cargar festivos
    const festivosArray = JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/festivos2025.json'), 'utf-8'));
    const festivos = {};
    festivosArray.forEach(f => {
      const fecha = f.date || f.fecha;
      festivos[fecha] = f.name || f.nombre;
    });

    // Cargar tablas de descanso solo si no es modo manual
    let tablasCCData = null;
    if (!esModoManual) {
      tablasCCData = JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/tablasCentroControl2025.json'), 'utf-8'));
    }

    // Procesar cada empleado
    const resultados = [];

    for (const empleadoId of empleados) {
      let nombre = 'Desconocido';

      try {
        const empleado = await Empleado.findById(empleadoId);

        if (!empleado) {
          resultados.push({
            empleadoId,
            nombre: 'Desconocido',
            success: false,
            error: 'Empleado no encontrado'
          });
          continue;
        }

        nombre = empleado.nombre;
        const { documento, cargo, salario } = empleado;

        let cronograma;
        let codigoTurno;

        if (esModoManual) {
          cronograma = generarCronogramaManualConductores(inicio, fin, festivos, configuracionManual);
          codigoTurno = 'COND_MANUAL';
        } else {
          cronograma = generarCronogramaConductoresAuto(inicio, fin, Object.keys(festivos), turno, tablaDescanso, tablasCCData);

          if (turno === 'DIURNO') {
            codigoTurno = 'COND_DIURNO';
          } else {
            codigoTurno = 'COND_NOCTURNO';
          }
        }

        // Buscar turno existente del empleado
        let turnoExistente = await Turno.findOne({ empleadoId });

        if (turnoExistente) {
          // Eliminar días solapados de turnos anteriores (sobrescribir)
          eliminarDiasSolapados(turnoExistente, inicio, fin);

          const nuevoHistorial = {
            fechaInicio: inicio,
            fechaFin: fin,
            area: 'CONDUCTORES',
            subarea: 'CONDUCTORES',
            turno: codigoTurno,
            tipoTurno: esModoManual ? 'MANUAL' : 'CONDUCTOR',
            cronogramaDetallado: cronograma,
            activo: true
          };

          if (!esModoManual && tablaDescanso) {
            nuevoHistorial.tablaDescanso = tablaDescanso;
          }

          turnoExistente.historialTurnos.push(nuevoHistorial);

          turnoExistente.turnoActual = {
            fechaInicio: inicio,
            fechaFin: fin,
            area: 'CONDUCTORES',
            subarea: 'CONDUCTORES',
            turno: codigoTurno,
            tipoTurno: esModoManual ? 'MANUAL' : 'CONDUCTOR'
          };

          await turnoExistente.save();
          console.log(`✅ Turno guardado exitosamente para ${nombre} (ID: ${turnoExistente._id})`);
        } else {
          const primerHistorial = {
            fechaInicio: inicio,
            fechaFin: fin,
            area: 'CONDUCTORES',
            subarea: 'CONDUCTORES',
            turno: codigoTurno,
            tipoTurno: esModoManual ? 'MANUAL' : 'CONDUCTOR',
            cronogramaDetallado: cronograma,
            activo: true
          };

          if (!esModoManual && tablaDescanso) {
            primerHistorial.tablaDescanso = tablaDescanso;
          }

          turnoExistente = new Turno({
            empleadoId,
            nombreEmpleado: nombre,
            documentoEmpleado: documento,
            cargo: cargo || 'Conductor',
            salario: salario || 0,
            historialTurnos: [primerHistorial],
            turnoActual: {
              fechaInicio: inicio,
              fechaFin: fin,
              area: 'CONDUCTORES',
              subarea: 'CONDUCTORES',
              turno: codigoTurno,
              tipoTurno: esModoManual ? 'MANUAL' : 'CONDUCTOR'
            }
          });

          await turnoExistente.save();
          console.log(`✅ Turno guardado exitosamente para ${nombre} (ID: ${turnoExistente._id})`);
        }

        resultados.push({
          empleado: nombre,
          documento: documento,
          cargo: cargo || 'Conductor',
          turnosAsignados: cronograma.length,
          subarea: 'CONDUCTORES',
          turno: esModoManual ? 'COND_MANUAL' : codigoTurno,
          tabla: esModoManual ? 'Configuración manual día por día' : tablaDescanso,
          cronograma: cronograma,
          success: true,
          turnoId: turnoExistente._id,
          diasLaborables: cronograma.filter(d => d.tipoDay === 'LABORABLE').length,
          diasDescanso: cronograma.filter(d => d.tipoDay === 'DESCANSO').length
        });

      } catch (error) {
        console.error(`❌ Error guardando turno para conductor ${empleadoId}:`, error);
        resultados.push({
          empleadoId,
          nombre: nombre,
          success: false,
          error: error.message
        });
      }
    }

    const exitosos = resultados.filter(r => r.success);
    const fallidos = resultados.filter(r => !r.success);

    res.json({
      message: `Turnos Conductores asignados: ${exitosos.length} exitosos, ${fallidos.length} fallidos`,
      totalProcesados: resultados.length,
      exitosos: exitosos.length,
      fallidos: fallidos.length,
      resultados
    });

  } catch (error) {
    console.error('Error en asignación de turnos Conductores:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Genera cronograma manual para Conductores según configuración día por día
 * Diurno: 6:00 AM - 6:00 PM (12 horas)
 * Nocturno: 6:00 PM - 6:00 AM (12 horas)
 */
function generarCronogramaManualConductores(fechaInicio, fechaFin, festivos, configuracionManual) {
  const cronograma = [];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  let fechaActual = clonarFechaLocal(fechaInicio);
  const fechaLimite = clonarFechaLocal(fechaFin);

  while (fechaActual <= fechaLimite) {
    const año = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    const fechaString = `${año}-${mes}-${dia}`;

    const diaSemanaIdx = fechaActual.getDay();
    const diaSemana = diasSemana[diaSemanaIdx];

    const esFestivo = festivos[fechaString] !== undefined;

    const configDia = configuracionManual[fechaString];

    if (!configDia) {
      fechaActual.setDate(fechaActual.getDate() + 1);
      continue;
    }

    const turnoDelDia = configDia.turno;

    let detalleDia;

    if (turnoDelDia === 'DESCANSO') {
      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'DESCANSO',
        horaInicio: null,
        horaFin: null,
        observaciones: 'Descanso manual',
        esFestivo: esFestivo,
        esDescanso: true
      };
    } else {
      let horaInicio, horaFin;

      if (turnoDelDia === 'DIURNO') {
        horaInicio = '06:00';
        horaFin = '18:00';
      } else if (turnoDelDia === 'NOCTURNO') {
        horaInicio = '18:00';
        horaFin = '06:00';
      } else {
        horaInicio = '06:00';
        horaFin = '18:00';
      }

      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'LABORABLE',
        horaInicio,
        horaFin,
        observaciones: `${turnoDelDia} - Configuración manual`,
        esFestivo: esFestivo,
        esDescanso: false
      };
    }

    cronograma.push(detalleDia);
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return cronograma;
}

/**
 * Genera cronograma automático para Conductores con tabla de descanso
 */
function generarCronogramaConductoresAuto(fechaInicio, fechaFin, festivos, turno, tablaDescanso, tablasCCData) {
  const cronograma = [];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diasDescanso = tablasCCData[tablaDescanso] || [];

  let fechaActual = clonarFechaLocal(fechaInicio);
  const fechaLimite = clonarFechaLocal(fechaFin);

  while (fechaActual <= fechaLimite) {
    const año = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    const fechaString = `${año}-${mes}-${dia}`;

    const diaSemanaIdx = fechaActual.getDay();
    const diaSemana = diasSemana[diaSemanaIdx];
    const esFestivo = festivos.includes(fechaString);
    const esDescanso = diasDescanso.includes(fechaString);

    let detalleDia;
    let horaInicio, horaFin;

    if (turno === 'DIURNO') {
      horaInicio = '06:00';
      horaFin = '18:00';
    } else if (turno === 'NOCTURNO') {
      horaInicio = '18:00';
      horaFin = '06:00';
    }

    if (esDescanso) {
      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'DESCANSO',
        horaInicio: null,
        horaFin: null,
        observaciones: `Descanso según ${tablaDescanso}`,
        esFestivo: false,
        esDescanso: true
      };
    } else if (esFestivo) {
      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'FESTIVO',
        horaInicio,
        horaFin,
        observaciones: 'Festivo',
        esFestivo: true,
        esDescanso: false
      };
    } else {
      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'LABORABLE',
        horaInicio,
        horaFin,
        observaciones: `Turno ${turno}`,
        esFestivo: false,
        esDescanso: false
      };
    }

    cronograma.push(detalleDia);
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return cronograma;
}

// ========== ASIGNACIÃ“N DE TURNOS MANTENIMIENTO ==========

/**
 * Asignar turnos a Mantenimiento (modo manual y automático)
 * Mañana: 6:00 AM - 2:00 PM
 * Tarde: 2:00 PM - 10:00 PM
 * Noche: 10:00 PM - 6:00 AM
 */
exports.asignarTurnosMantenimiento = async (req, res) => {
  try {
    const { empleados, fechaInicio, fechaFin, turno, tablaDescanso, configuracionManual } = req.body;

    console.log('🔍 Backend Mantenimiento recibió:');
    console.log('  - turno:', turno);
    console.log('  - configuracionManual existe:', !!configuracionManual);

    if (!empleados || empleados.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un empleado' });
    }

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Debe proporcionar fechaInicio y fechaFin' });
    }

    // Verificar si es modo manual
    const esModoManual = turno === 'MANUAL' && configuracionManual;

    if (!esModoManual) {
      if (!turno || !['MAÑANA', 'TARDE', 'NOCHE'].includes(turno)) {
        return res.status(400).json({ error: 'Debe especificar el turno: MAÑANA, TARDE o NOCHE' });
      }

      if (!tablaDescanso || !['TABLA_1', 'TABLA_2', 'TABLA_3'].includes(tablaDescanso)) {
        return res.status(400).json({ error: 'Debe especificar la tabla de descanso' });
      }
    } else {
      if (!configuracionManual || Object.keys(configuracionManual).length === 0) {
        return res.status(400).json({ error: 'Debe proporcionar la configuración manual de turnos día por día' });
      }
    }

    // Validar fechas
    const [añoInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
    const [añoFin, mesFin, diaFin] = fechaFin.split('-').map(Number);
    const inicio = new Date(añoInicio, mesInicio - 1, diaInicio);
    const fin = new Date(añoFin, mesFin - 1, diaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }

    if (inicio > fin) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    // Cargar festivos
    const festivosArray = JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/festivos2025.json'), 'utf-8'));
    const festivos = {};
    festivosArray.forEach(f => {
      const fecha = f.date || f.fecha;
      festivos[fecha] = f.name || f.nombre;
    });

    // Cargar tablas de descanso solo si no es modo manual
    let tablasCCData = null;
    if (!esModoManual) {
      tablasCCData = JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/tablasCentroControl2025.json'), 'utf-8'));
    }

    // Procesar cada empleado
    const resultados = [];

    for (const empleadoId of empleados) {
      let nombre = 'Desconocido';

      try {
        const empleado = await Empleado.findById(empleadoId);

        if (!empleado) {
          resultados.push({
            empleadoId,
            nombre: 'Desconocido',
            success: false,
            error: 'Empleado no encontrado'
          });
          continue;
        }

        nombre = empleado.nombre;
        const { documento, cargo, salario } = empleado;

        let cronograma;
        let codigoTurno;

        if (esModoManual) {
          cronograma = generarCronogramaManualMantenimiento(inicio, fin, festivos, configuracionManual);
          codigoTurno = 'MANT_MANUAL';
        } else {
          cronograma = generarCronogramaMantenimientoAuto(inicio, fin, Object.keys(festivos), turno, tablaDescanso, tablasCCData);

          if (turno === 'MAÑANA') {
            codigoTurno = 'MANT_MAÑANA';
          } else if (turno === 'TARDE') {
            codigoTurno = 'MANT_TARDE';
          } else {
            codigoTurno = 'MANT_NOCHE';
          }
        }

        // Buscar turno existente del empleado
        let turnoExistente = await Turno.findOne({ empleadoId });

        if (turnoExistente) {
          // Eliminar días solapados de turnos anteriores (sobrescribir)
          eliminarDiasSolapados(turnoExistente, inicio, fin);

          const nuevoHistorial = {
            fechaInicio: inicio,
            fechaFin: fin,
            area: 'MANTENIMIENTO',
            subarea: 'MANTENIMIENTO',
            turno: codigoTurno,
            tipoTurno: esModoManual ? 'MANUAL' : 'TECNICO',
            cronogramaDetallado: cronograma,
            activo: true
          };

          if (!esModoManual && tablaDescanso) {
            nuevoHistorial.tablaDescanso = tablaDescanso;
          }

          turnoExistente.historialTurnos.push(nuevoHistorial);

          turnoExistente.turnoActual = {
            fechaInicio: inicio,
            fechaFin: fin,
            area: 'MANTENIMIENTO',
            subarea: 'MANTENIMIENTO',
            turno: codigoTurno,
            tipoTurno: esModoManual ? 'MANUAL' : 'TECNICO'
          };

          await turnoExistente.save();
          console.log(`✅ Turno guardado exitosamente para ${nombre} (ID: ${turnoExistente._id})`);
        } else {
          const primerHistorial = {
            fechaInicio: inicio,
            fechaFin: fin,
            area: 'MANTENIMIENTO',
            subarea: 'MANTENIMIENTO',
            turno: codigoTurno,
            tipoTurno: esModoManual ? 'MANUAL' : 'TECNICO',
            cronogramaDetallado: cronograma,
            activo: true
          };

          if (!esModoManual && tablaDescanso) {
            primerHistorial.tablaDescanso = tablaDescanso;
          }

          turnoExistente = new Turno({
            empleadoId,
            nombreEmpleado: nombre,
            documentoEmpleado: documento,
            cargo: cargo || 'Técnico Mantenimiento',
            salario: salario || 0,
            historialTurnos: [primerHistorial],
            turnoActual: {
              fechaInicio: inicio,
              fechaFin: fin,
              area: 'MANTENIMIENTO',
              subarea: 'MANTENIMIENTO',
              turno: codigoTurno,
              tipoTurno: esModoManual ? 'MANUAL' : 'TECNICO'
            }
          });

          await turnoExistente.save();
          console.log(`✅ Turno guardado exitosamente para ${nombre} (ID: ${turnoExistente._id})`);
        }

        resultados.push({
          empleado: nombre,
          documento: documento,
          cargo: cargo || 'Técnico Mantenimiento',
          turnosAsignados: cronograma.length,
          subarea: 'MANTENIMIENTO',
          turno: esModoManual ? 'MANT_MANUAL' : codigoTurno,
          tabla: esModoManual ? 'Configuración manual día por día' : tablaDescanso,
          cronograma: cronograma,
          success: true,
          turnoId: turnoExistente._id,
          diasLaborables: cronograma.filter(d => d.tipoDay === 'LABORABLE').length,
          diasDescanso: cronograma.filter(d => d.tipoDay === 'DESCANSO').length
        });

      } catch (error) {
        console.error(`❌ Error guardando turno para empleado ${empleadoId}:`, error);
        resultados.push({
          empleadoId,
          nombre: nombre,
          success: false,
          error: error.message
        });
      }
    }

    const exitosos = resultados.filter(r => r.success);
    const fallidos = resultados.filter(r => !r.success);

    res.json({
      message: `Turnos Mantenimiento asignados: ${exitosos.length} exitosos, ${fallidos.length} fallidos`,
      totalProcesados: resultados.length,
      exitosos: exitosos.length,
      fallidos: fallidos.length,
      resultados
    });

  } catch (error) {
    console.error('Error en asignación de turnos Mantenimiento:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Genera cronograma manual para Mantenimiento según configuración día por día
 * Mañana: 6:00 AM - 2:00 PM
 * Tarde: 2:00 PM - 10:00 PM
 * Noche: 10:00 PM - 6:00 AM
 */
function generarCronogramaManualMantenimiento(fechaInicio, fechaFin, festivos, configuracionManual) {
  const cronograma = [];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  let fechaActual = clonarFechaLocal(fechaInicio);
  const fechaLimite = clonarFechaLocal(fechaFin);

  while (fechaActual <= fechaLimite) {
    const año = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    const fechaString = `${año}-${mes}-${dia}`;

    const diaSemanaIdx = fechaActual.getDay();
    const diaSemana = diasSemana[diaSemanaIdx];

    const esFestivo = festivos[fechaString] !== undefined;

    const configDia = configuracionManual[fechaString];

    if (!configDia) {
      fechaActual.setDate(fechaActual.getDate() + 1);
      continue;
    }

    const turnoDelDia = configDia.turno;

    let detalleDia;

    if (turnoDelDia === 'DESCANSO') {
      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'DESCANSO',
        horaInicio: null,
        horaFin: null,
        observaciones: 'Descanso manual',
        esFestivo: esFestivo,
        esDescanso: true
      };
    } else {
      let horaInicio, horaFin;

      if (turnoDelDia === 'MAÑANA') {
        horaInicio = '06:00';
        horaFin = '14:00';
      } else if (turnoDelDia === 'TARDE') {
        horaInicio = '14:00';
        horaFin = '22:00';
      } else if (turnoDelDia === 'NOCHE') {
        horaInicio = '22:00';
        horaFin = '06:00';
      } else {
        horaInicio = '06:00';
        horaFin = '14:00';
      }

      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'LABORABLE',
        horaInicio,
        horaFin,
        observaciones: `${turnoDelDia} - Configuración manual`,
        esFestivo: esFestivo,
        esDescanso: false
      };
    }

    cronograma.push(detalleDia);
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return cronograma;
}

/**
 * Genera cronograma automático para Mantenimiento con tabla de descanso
 */
function generarCronogramaMantenimientoAuto(fechaInicio, fechaFin, festivos, turno, tablaDescanso, tablasCCData) {
  const cronograma = [];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diasDescanso = tablasCCData[tablaDescanso] || [];

  let fechaActual = clonarFechaLocal(fechaInicio);
  const fechaLimite = clonarFechaLocal(fechaFin);

  while (fechaActual <= fechaLimite) {
    const año = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    const fechaString = `${año}-${mes}-${dia}`;

    const diaSemanaIdx = fechaActual.getDay();
    const diaSemana = diasSemana[diaSemanaIdx];
    const esFestivo = festivos.includes(fechaString);
    const esDescanso = diasDescanso.includes(fechaString);

    let detalleDia;
    let horaInicio, horaFin;

    if (turno === 'MAÑANA') {
      horaInicio = '06:00';
      horaFin = '14:00';
    } else if (turno === 'TARDE') {
      horaInicio = '14:00';
      horaFin = '22:00';
    } else if (turno === 'NOCHE') {
      horaInicio = '22:00';
      horaFin = '06:00';
    }

    if (esDescanso) {
      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'DESCANSO',
        horaInicio: null,
        horaFin: null,
        observaciones: `Descanso según ${tablaDescanso}`,
        esFestivo: false,
        esDescanso: true
      };
    } else if (esFestivo) {
      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'FESTIVO',
        horaInicio,
        horaFin,
        observaciones: 'Festivo',
        esFestivo: true,
        esDescanso: false
      };
    } else {
      detalleDia = {
        fecha: fechaString,
        diaSemana,
        tipoDay: 'LABORABLE',
        horaInicio,
        horaFin,
        observaciones: `Turno ${turno}`,
        esFestivo: false,
        esDescanso: false
      };
    }

    cronograma.push(detalleDia);
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return cronograma;
}

// ========== NUEVOS CONTROLADORES PARA REACT ==========

exports.obtenerAreas = async (req, res) => {
  try {
    const filtroEmpresa = req.empresaId ? { empresaId: req.empresaId } : {};
    let areas = await Empleado.distinct('area', filtroEmpresa);

    console.log('🔍 DEBUG obtenerAreas:');
    console.log('  - Áreas en BD:', areas);
    console.log('  - Usuario en sesión:', req.session.usuario);

    // Mapeo de áreas para compatibilidad
    const mapeoAreas = {
      'CENTRO_CONTROL': 'CENTRO DE CONTROL',
      'CENTRO DE CONTROL': 'CENTRO DE CONTROL'
    };
    const normalizarArea = (a) => mapeoAreas[a] || a;

    // Filtrar áreas si el usuario no es admin
    if (req.session.usuario && req.session.usuario.rol !== 'admin') {
      const areasPermitidasOriginales = req.session.usuario.areasPermitidas || [];
      // Normalizar las áreas permitidas del usuario
      const areasPermitidas = areasPermitidasOriginales.map(normalizarArea);

      console.log('  - Áreas permitidas (original):', areasPermitidasOriginales);
      console.log('  - Áreas permitidas (normalizado):', areasPermitidas);

      // Filtrar áreas por permisos
      areas = areas.filter(area => {
        const areaNormalizada = normalizarArea(area);
        const permitida = areasPermitidas.includes(areaNormalizada);
        console.log(`  - Comparando "${area}" (norm: "${areaNormalizada}") -> ${permitida ? '✅' : '❌'}`);
        return permitida;
      });

      console.log('  - Áreas filtradas finales:', areas);
    }

    res.json({ areas });
  } catch (error) {
    console.error('❌ Error en obtenerAreas:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.asignarTurnoIndividual = async (req, res) => {
  try {
    const { 
      empleadoId, 
      fechaInicio, 
      fechaFin, 
      horaInicio, 
      horaFin,
      horaAlmuerzoInicio,
      horaAlmuerzoFin,
      incluirAlmuerzo,
      diasDescanso = [] // Array con los días de la semana que descansa [0=Domingo, 1=Lunes, ..., 6=Sábado]
    } = req.body;

    const empleado = await Empleado.findById(empleadoId);
    if (!empleado) throw new Error('Empleado no encontrado');

    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');
    
    let turnosCreados = 0;
    let diasDescansoCount = 0;
    const cronogramaDetallado = [];
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const fechaActual = new Date(inicio);
    while (fechaActual <= fin) {
      const diaSemanaIdx = fechaActual.getDay(); // 0=Domingo, 6=Sábado
      const diaSemana = diasSemana[diaSemanaIdx];
      const año = fechaActual.getFullYear();
      const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
      const dia = String(fechaActual.getDate()).padStart(2, '0');
      const fechaStr = `${año}-${mes}-${dia}`;

      // Verificar si es día de descanso
      const esDescanso = diasDescanso.includes(diaSemanaIdx);

      if (esDescanso) {
        // Día de descanso
        cronogramaDetallado.push({
          fecha: fechaStr,
          diaSemana,
          tipoDay: 'DESCANSO',
          horaInicio: null,
          horaFin: null,
          horaAlmuerzoInicio: null,
          horaAlmuerzoFin: null,
          observaciones: 'Día de descanso',
          esFestivo: false,
          esDescanso: true
        });
        diasDescansoCount++;
      } else {
        // Día laborable
        cronogramaDetallado.push({
          fecha: fechaStr,
          diaSemana,
          tipoDay: 'LABORABLE',
          horaInicio,
          horaFin,
          horaAlmuerzoInicio: incluirAlmuerzo ? horaAlmuerzoInicio : null,
          horaAlmuerzoFin: incluirAlmuerzo ? horaAlmuerzoFin : null,
          observaciones: incluirAlmuerzo 
            ? `Horario: ${horaInicio} - ${horaFin} (Almuerzo: ${horaAlmuerzoInicio} - ${horaAlmuerzoFin})`
            : `Horario: ${horaInicio} - ${horaFin}`,
          esFestivo: false,
          esDescanso: false
        });
        turnosCreados++;
      }

      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    // Buscar turno existente del empleado o crear uno nuevo
    let turnoExistente = await Turno.findOne({ empleadoId });

    if (turnoExistente) {
      // Eliminar días solapados de turnos anteriores (sobrescribir)
      eliminarDiasSolapados(turnoExistente, inicio, fin);

      // Agregar nuevo turno al historial
      turnoExistente.historialTurnos.push({
        fechaInicio: inicio,
        fechaFin: fin,
        area: empleado.area,
        subarea: 'GENERAL',
        turno: 'INDIVIDUAL',
        tipoTurno: 'PERSONALIZADO',
        horaInicio,
        horaFin,
        cronogramaDetallado,
        activo: true
      });

      // Actualizar turnoActual
      turnoExistente.turnoActual = {
        fechaInicio: inicio,
        fechaFin: fin,
        area: empleado.area,
        subarea: 'GENERAL',
        turno: 'INDIVIDUAL',
        activo: true
      };

      await turnoExistente.save();
    } else {
      // Crear nuevo documento de turno
      turnoExistente = new Turno({
        empleadoId,
        nombreEmpleado: empleado.nombre,
        documentoEmpleado: empleado.documento,
        cargo: empleado.cargo || 'Empleado',
        salario: empleado.salario || 0,
        historialTurnos: [{
          fechaInicio: inicio,
          fechaFin: fin,
          area: empleado.area,
          subarea: 'GENERAL',
          turno: 'INDIVIDUAL',
          tipoTurno: 'PERSONALIZADO',
          horaInicio,
          horaFin,
          cronogramaDetallado,
          activo: true
        }],
        turnoActual: {
          fechaInicio: inicio,
          fechaFin: fin,
          area: empleado.area,
          subarea: 'GENERAL',
          turno: 'INDIVIDUAL',
          activo: true
        }
      });

      await turnoExistente.save();
    }

    res.json({ 
      success: true,
      message: 'Turnos asignados exitosamente', 
      turnosCreados,
      diasDescanso: diasDescansoCount,
      totalDias: turnosCreados + diasDescansoCount,
      empleado: empleado.nombre,
      turnoId: turnoExistente._id
    });
  } catch (error) {
    console.error('Error en asignación individual:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.asignarTurnosPorArea = async (req, res) => {
  try {
    const {
      area,
      empleadosIds,
      fechaInicio,
      fechaFin,
      horaInicio,
      horaFin,
      tipoAsignacion,
      // Campos específicos para taquilleros
      subarea,
      turnoTaquillero,
      tablaDescanso
    } = req.body;

    console.log('📋 Asignación por área recibida:', { area, empleadosIds: empleadosIds?.length, subarea, turnoTaquillero, tablaDescanso });

    let turnosCreados = 0;
    const turnosDetalle = [];

    // Crear fechas en UTC para evitar problemas de zona horaria
    const [añoInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
    const [añoFin, mesFin, diaFin] = fechaFin.split('-').map(Number);
    const inicio = new Date(añoInicio, mesInicio - 1, diaInicio);
    const fin = new Date(añoFin, mesFin - 1, diaFin);

    // Formatear fechas localmente sin toISOString
    const formatearFecha = (fecha) => {
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      return `${año}-${mes}-${dia}`;
    };

    console.log('📅 Rango de fechas:', {
      fechaInicio,
      fechaFin,
      inicioCalculado: formatearFecha(inicio),
      finCalculado: formatearFecha(fin)
    });

    // Si es área de taquilleros, usar el servicio especializado de horarios
    if (area === 'TAQUILLEROS' && subarea && turnoTaquillero) {
      console.log('🎫 Procesando turnos para TAQUILLEROS');
      const horariosService = require('../services/horariosService');
      const tablasDescansoService = require('../services/tablasDescansoService');
      const festivosArray = require('../utils/festivos2025.json');
      const Empleado = require('../models/Empleado');

      // Convertir array de festivos a objeto para búsqueda rápida
      const festivos = {};
      festivosArray.forEach(f => {
        festivos[f.date] = f.name;
      });

      console.log('🎉 Festivos cargados:', Object.keys(festivos).length);

      // Obtener patrón de días de descanso
      const patronTablas = tablasDescansoService.generarPatronTablasDescanso(2025);
      const tablaNumero = tablaDescanso.replace('TABLA_', '');
      let diasDescansoTabla = [];

      // Construir array de fechas de descanso completas (YYYY-MM-DD)
      if (patronTablas.tablasNumericas[tablaNumero]) {
        const tablaDatos = patronTablas.tablasNumericas[tablaNumero];
        for (const mes in tablaDatos.diasDescanso) {
          tablaDatos.diasDescanso[mes].forEach(diaInfo => {
            diasDescansoTabla.push(diaInfo.fecha); // "2025-10-01" formato
          });
        }
      }

      console.log(`📋 Días de descanso para ${tablaDescanso}:`, diasDescansoTabla);

      // Función helper para formatear fechas
      const formatearFechaLocal = (fecha) => {
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
      };

      for (const empleadoId of empleadosIds) {
        const empleado = await Empleado.findById(empleadoId);
        if (!empleado) continue;

        // Buscar o crear documento de turno para este empleado
        let documentoTurno = await Turno.findOne({ empleadoId });

        if (!documentoTurno) {
          // Crear nuevo documento para el empleado
          documentoTurno = new Turno({
            empleadoId: empleado._id,
            nombreEmpleado: empleado.nombre,
            documentoEmpleado: empleado.documento,
            cargo: empleado.cargo,
            salario: empleado.salario || 0,
            historialTurnos: []
          });
        }

        // Generar cronograma detallado
        const cronogramaDetallado = [];
        let turnosEmpleado = 0;

        // Usar valores numéricos para evitar problemas de zona horaria
        let fechaActual = new Date(inicio.getTime());

        console.log(`🔍 Iniciando cronograma para ${empleado.nombre}:`, {
          inicioOriginal: formatearFechaLocal(inicio),
          finOriginal: formatearFechaLocal(fin),
          primeraFecha: formatearFechaLocal(fechaActual)
        });

        while (fechaActual <= fin) {
          // Crear fecha string manualmente en formato local YYYY-MM-DD
          const año = fechaActual.getFullYear();
          const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
          const dia = String(fechaActual.getDate()).padStart(2, '0');
          const fechaString = `${año}-${mes}-${dia}`;

          const esFestivo = festivos[fechaString] ? true : false;
          const esDescanso = diasDescansoTabla.includes(fechaString);
          const diaSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][fechaActual.getDay()];

          let diaDetalle;

          if (esDescanso) {
            // Día de descanso según tabla
            diaDetalle = {
              fecha: fechaString,
              diaSemana: diaSemana,
              tipoDay: 'DESCANSO',
              horaInicio: '',
              horaFin: '',
              observaciones: `Descanso según ${tablaDescanso}`,
              esFestivo: false,
              esDescanso: true
            };
          } else {
            // Día laborable - obtener horario
            try {
              const horario = horariosService.obtenerHorario(subarea, turnoTaquillero, fechaActual, esFestivo);

              diaDetalle = {
                fecha: fechaString,
                diaSemana: diaSemana,
                tipoDay: esFestivo ? 'FESTIVO' : 'LABORABLE',
                horaInicio: horario.horaInicio,
                horaFin: horario.horaFin,
                observaciones: horario.descripcion || '',
                esFestivo: esFestivo,
                esDescanso: false
              };
              turnosEmpleado++;
            } catch (horarioError) {
              console.error(`❌ Error obteniendo horario para ${fechaString}:`, horarioError.message);
              continue;
            }
          }

          cronogramaDetallado.push(diaDetalle);
          fechaActual.setDate(fechaActual.getDate() + 1);
        }

        // Agregar nuevo turno al historial
        const nuevoTurno = {
          fechaInicio: new Date(inicio),
          fechaFin: new Date(fin),
          area: area,
          subarea: subarea,
          turno: turnoTaquillero,
          tipoTurno: turnoTaquillero,
          tablaDescanso: tablaDescanso.toString(),
          cronogramaDetallado: cronogramaDetallado,
          activo: true,
          fechaCreacion: new Date()
        };

        // Eliminar días solapados de turnos anteriores (sobrescribir)
        eliminarDiasSolapados(documentoTurno, inicio, fin);

        // Agregar nuevo turno
        documentoTurno.historialTurnos.push(nuevoTurno);

        // Actualizar turnoActual
        documentoTurno.turnoActual = {
          area: area,
          subarea: subarea,
          turno: turnoTaquillero,
          fechaInicio: new Date(inicio),
          fechaFin: new Date(fin),
          activo: true
        };

        await documentoTurno.save();
        turnosCreados += turnosEmpleado;

        turnosDetalle.push({
          empleado: empleado.nombre,
          documento: empleado.documento,
          turnosAsignados: turnosEmpleado,
          subarea: subarea,
          turno: turnoTaquillero,
          tabla: tablaDescanso,
          cronograma: cronogramaDetallado.map(dia => ({
            fecha: dia.fecha,
            diaSemana: dia.diaSemana,
            tipoDay: dia.tipoDay,
            horaInicio: dia.horaInicio,
            horaFin: dia.horaFin,
            esDescanso: dia.esDescanso,
            esFestivo: dia.esFestivo
          }))
        });
      }

      console.log(`✅ Total turnos creados para TAQUILLEROS: ${turnosCreados}`);
    } else {
      // Lógica normal para otras áreas
      const Empleado = require('../models/Empleado');

      for (const empleadoId of empleadosIds) {
        const empleado = await Empleado.findById(empleadoId);
        if (!empleado) continue;

        const fechaActual = new Date(inicio);
        let turnosEmpleado = 0;

        while (fechaActual <= fin) {
          const diaSemana = fechaActual.getDay();
          let debeCrearTurno = true;
          let horaInicioTurno = horaInicio || '08:00';
          let horaFinTurno = horaFin || '17:00';

          // Lógica según tipo de asignación
          if (tipoAsignacion === 'ADMINISTRATIVO') {
            // Administrativos solo trabajan Lun-Vie
            if (diaSemana === 0 || diaSemana === 6) {
              debeCrearTurno = false;
            } else {
              horaInicioTurno = '08:00';
              horaFinTurno = '16:00';
            }
          }

          if (debeCrearTurno) {
            const turno = new Turno({
              empleado: empleadoId,
              fecha: new Date(fechaActual),
              horaInicio: horaInicioTurno,
              horaFin: horaFinTurno,
              area: area,
              tipo: 'TRABAJO'
            });
            await turno.save();
            turnosCreados++;
            turnosEmpleado++;
          }

          fechaActual.setDate(fechaActual.getDate() + 1);
        }

        turnosDetalle.push({
          empleado: empleado.nombre,
          documento: empleado.documento,
          turnosAsignados: turnosEmpleado
        });
      }
    }

    res.json({
      message: 'Turnos asignados por área exitosamente',
      turnosCreados,
      empleados: empleadosIds.length,
      detalle: turnosDetalle
    });
  } catch (error) {
    console.error('❌ Error en asignarTurnosPorArea:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.consultarTurnos = async (req, res) => {
  try {
    const { busqueda, inicio, fin, area } = req.query;
    
    // Buscar todos los turnos
    let query = {};
    
    // Filtrar por búsqueda de empleado
    if (busqueda) {
      query.$or = [
        { nombreEmpleado: { $regex: busqueda, $options: 'i' } },
        { documentoEmpleado: { $regex: busqueda, $options: 'i' } }
      ];
    }
    
    // Filtrar por área
    if (area) {
      query['turnoActual.area'] = area;
    }

    const turnosDocumentos = await Turno.find(query).sort({ nombreEmpleado: 1 });
    
    // Extraer turnos del historial dentro del rango de fechas
    const resultado = [];
    
    turnosDocumentos.forEach(doc => {
      doc.historialTurnos.forEach(historial => {
        // Verificar si el historial está dentro del rango de fechas
        if (inicio && fin) {
          const inicioFiltro = clonarFechaLocal(inicio);
          const finFiltro = clonarFechaLocal(fin);
          const historicoInicio = clonarFechaLocal(historial.fechaInicio);
          const historicoFin = clonarFechaLocal(historial.fechaFin);
          
          // Si no hay solapamiento, saltar
          if (historicoFin < inicioFiltro || historicoInicio > finFiltro) {
            return;
          }
        }
        
        // Extraer días del cronograma detallado que estén en el rango
        if (historial.cronogramaDetallado && historial.cronogramaDetallado.length > 0) {
          historial.cronogramaDetallado.forEach(dia => {
            // Debug: log del tipo de fecha
            if (!dia.fecha) {
              console.log('⚠️ dia.fecha es null/undefined');
              return;
            }
            
            let fechaDia;
            try {
              // Intentar crear la fecha de forma robusta
              if (dia.fecha instanceof Date) {
                fechaDia = new Date(dia.fecha.getFullYear(), dia.fecha.getMonth(), dia.fecha.getDate());
              } else if (typeof dia.fecha === 'string') {
                const fechaStr = dia.fecha.includes('T') ? dia.fecha.split('T')[0] : dia.fecha;
                const [año, mes, d] = fechaStr.split('-').map(Number);
                fechaDia = new Date(año, mes - 1, d);
              } else if (dia.fecha.toISOString) {
                // Objeto Date-like de Mongoose
                const isoStr = dia.fecha.toISOString().split('T')[0];
                const [año, mes, d] = isoStr.split('-').map(Number);
                fechaDia = new Date(año, mes - 1, d);
              } else {
                // Último intento: crear Date directamente
                const tempDate = new Date(dia.fecha);
                fechaDia = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate());
              }
            } catch (err) {
              console.log('⚠️ Error parseando fecha:', dia.fecha, typeof dia.fecha, err.message);
              return;
            }
            
            // Verificar que la fecha es válida
            if (isNaN(fechaDia.getTime())) {
              console.log('⚠️ Fecha inválida después de parsear:', dia.fecha, typeof dia.fecha);
              return;
            }
            
            // Verificar si este día está en el rango
            if (inicio && fin) {
              const inicioFiltro = clonarFechaLocal(inicio);
              const finFiltro = clonarFechaLocal(fin);
              if (fechaDia < inicioFiltro || fechaDia > finFiltro) {
                return;
              }
            }
            
            // Normalizar la fecha a string YYYY-MM-DD usando fechaDia ya parseada
            const año = fechaDia.getFullYear();
            const mes = String(fechaDia.getMonth() + 1).padStart(2, '0');
            const diaNum = String(fechaDia.getDate()).padStart(2, '0');
            const fechaStr = `${año}-${mes}-${diaNum}`;
            
            resultado.push({
              _id: `${doc._id}_${historial._id}_${fechaStr}`,
              turnoDocId: doc._id,
              historialId: historial._id,
              empleado: {
                _id: doc.empleadoId,
                nombre: doc.nombreEmpleado,
                documento: doc.documentoEmpleado,
                cargo: doc.cargo,
                area: historial.area
              },
              fecha: fechaStr,
              diaSemana: dia.diaSemana,
              horaInicio: dia.horaInicio || '',
              horaFin: dia.horaFin || '',
              tipo: dia.esDescanso ? 'DESCANSO' : (dia.esFestivo ? 'FESTIVO' : 'TRABAJO'),
              tipoDay: dia.tipoDay,
              observaciones: dia.observaciones || '',
              esFestivo: dia.esFestivo,
              esDescanso: dia.esDescanso,
              area: historial.area,
              turnoTipo: historial.tipoTurno
            });
          });
        }
      });
    });
    
    // Ordenar por fecha
    resultado.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    res.json(resultado);
  } catch (error) {
    console.error('Error en consultarTurnos:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Actualizar un turno existente (día específico en el cronograma)
 */
exports.actualizarTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const { horaInicio, horaFin, tipo, observaciones } = req.body;

    // El ID viene en formato: turnoDocId_historialId_fecha
    const partes = id.split('_');
    if (partes.length < 3) {
      return res.status(400).json({ error: 'ID de turno inválido' });
    }
    
    const turnoDocId = partes[0];
    const historialId = partes[1];
    const fechaDia = partes.slice(2).join('_'); // Por si la fecha tiene guiones bajos
    
    // Buscar el documento
    const turnoDoc = await Turno.findById(turnoDocId);
    if (!turnoDoc) {
      return res.status(404).json({ error: 'Documento de turno no encontrado' });
    }
    
    // Buscar el historial específico
    const historial = turnoDoc.historialTurnos.id(historialId);
    if (!historial) {
      return res.status(404).json({ error: 'Historial de turno no encontrado' });
    }
    
    // Buscar el día específico en el cronograma
    const diaIndex = historial.cronogramaDetallado.findIndex(d => d.fecha === fechaDia);
    if (diaIndex === -1) {
      return res.status(404).json({ error: 'Día no encontrado en el cronograma' });
    }
    
    // Actualizar los campos del día
    const dia = historial.cronogramaDetallado[diaIndex];
    
    if (horaInicio !== undefined) dia.horaInicio = horaInicio;
    if (horaFin !== undefined) dia.horaFin = horaFin;
    if (observaciones !== undefined) dia.observaciones = observaciones;
    
    // Actualizar tipo
    if (tipo) {
      if (tipo === 'DESCANSO') {
        dia.tipoDay = 'DESCANSO';
        dia.esDescanso = true;
        dia.esFestivo = false;
        dia.horaInicio = null;
        dia.horaFin = null;
      } else if (tipo === 'FESTIVO') {
        dia.tipoDay = 'FESTIVO';
        dia.esFestivo = true;
        dia.esDescanso = false;
      } else if (tipo === 'TRABAJO') {
        dia.tipoDay = 'LABORABLE';
        dia.esDescanso = false;
        dia.esFestivo = false;
      } else if (tipo === 'VACACIONES' || tipo === 'INCAPACIDAD' || tipo === 'PERMISO') {
        dia.tipoDay = 'DESCANSO';
        dia.esDescanso = true;
        dia.esFestivo = false;
        dia.horaInicio = null;
        dia.horaFin = null;
        dia.observaciones = tipo;
      }
    }
    
    await turnoDoc.save();

    res.json({ 
      success: true, 
      message: 'Turno actualizado correctamente',
      dia: dia
    });
  } catch (error) {
    console.error('Error al actualizar turno:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Eliminar un turno (día específico del cronograma)
 */
exports.eliminarTurno = async (req, res) => {
  try {
    const { id } = req.params;

    // El ID viene en formato: turnoDocId_historialId_fecha
    const partes = id.split('_');
    if (partes.length < 3) {
      return res.status(400).json({ error: 'ID de turno inválido' });
    }
    
    const turnoDocId = partes[0];
    const historialId = partes[1];
    const fechaDia = partes.slice(2).join('_');
    
    // Buscar el documento
    const turnoDoc = await Turno.findById(turnoDocId);
    if (!turnoDoc) {
      return res.status(404).json({ error: 'Documento de turno no encontrado' });
    }
    
    // Buscar el historial específico
    const historial = turnoDoc.historialTurnos.id(historialId);
    if (!historial) {
      return res.status(404).json({ error: 'Historial de turno no encontrado' });
    }
    
    // Eliminar el día del cronograma
    const diaIndex = historial.cronogramaDetallado.findIndex(d => d.fecha === fechaDia);
    if (diaIndex === -1) {
      return res.status(404).json({ error: 'Día no encontrado en el cronograma' });
    }
    
    historial.cronogramaDetallado.splice(diaIndex, 1);
    
    await turnoDoc.save();

    res.json({ 
      success: true, 
      message: 'Turno eliminado correctamente' 
    });
  } catch (error) {
    console.error('Error al eliminar turno:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.eliminarEmpleado = async (req, res) => {
  try {
    const empleado = await Empleado.findByIdAndDelete(req.params.id);
    if (!empleado) throw new Error('Empleado no encontrado');

    // TambiÃ©n eliminar los turnos asociados
    await Turno.deleteMany({ empleado: req.params.id });

    res.json({ message: 'Empleado eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.cargaMasivaEmpleados = async (req, res) => {
  // Función auxiliar para parsear fechas en diferentes formatos
  const parsearFecha = (fechaStr) => {
    if (!fechaStr) return null;

    fechaStr = fechaStr.trim();
    let fecha = null;

    // Formato DD/MM/YYYY
    if (fechaStr.includes('/')) {
      const partes = fechaStr.split('/');
      if (partes.length === 3) {
        const dia = parseInt(partes[0]);
        const mes = parseInt(partes[1]) - 1; // Mes en JS es 0-indexed
        const anio = parseInt(partes[2]);
        fecha = new Date(anio, mes, dia);
      }
    }
    // Formato YYYY-MM-DD o DD-MM-YYYY
    else if (fechaStr.includes('-')) {
      const partes = fechaStr.split('-');
      if (partes.length === 3) {
        if (partes[0].length === 4) {
          // YYYY-MM-DD
          fecha = new Date(fechaStr);
        } else {
          // DD-MM-YYYY
          const dia = parseInt(partes[0]);
          const mes = parseInt(partes[1]) - 1;
          const anio = parseInt(partes[2]);
          fecha = new Date(anio, mes, dia);
        }
      }
    }

    return fecha && !isNaN(fecha.getTime()) ? fecha : null;
  };

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibiÃ ningÃºn archivo' });
    }

    const fileBuffer = req.file.buffer.toString('utf8');
    const filename = req.file.originalname.toLowerCase();

    let empleados = [];
    let errores = 0;
    let insertados = 0;

    // Procesar CSV
    if (filename.endsWith('.csv')) {
      const lines = fileBuffer.split('\n').map(line => line.trim()).filter(line => line);

      if (lines.length < 2) {
        return res.status(400).json({ error: 'El archivo CSV está vacío o no tiene datos' });
      }

      // Leer encabezado y detectar columnas
      const header = lines[0].toLowerCase().split(',').map(h => h.trim());
      const nombreIdx = header.findIndex(h => h === 'nombre');
      const cedulaIdx = header.findIndex(h => h === 'cedula' || h === 'documento');
      const cargoIdx = header.findIndex(h => h === 'cargo');
      const areaIdx = header.findIndex(h => h === 'area');
      const salarioIdx = header.findIndex(h => h === 'salario');
      const fechaIngresoIdx = header.findIndex(h => h === 'fechaingreso' || h === 'fecha_ingreso' || h === 'fecha ingreso');
      const fechaCumpleanosIdx = header.findIndex(h => h === 'fechacumpleanos' || h === 'fecha_cumpleanos' || h === 'fecha cumpleaños' || h === 'cumpleaños' || h === 'cumpleanos');

      if (nombreIdx === -1 || cedulaIdx === -1 || areaIdx === -1) {
        return res.status(400).json({
          error: 'El CSV debe tener las columnas: nombre, cedula (o documento), y area',
          encontradas: header.join(', ')
        });
      }

      // Procesar filas
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = line.split(',').map(v => v.trim());

        const nombre = values[nombreIdx];
        const documento = values[cedulaIdx];
        const cargo = cargoIdx !== -1 ? values[cargoIdx] : '';
        const area = values[areaIdx];
        const salario = salarioIdx !== -1 && values[salarioIdx] ? parseFloat(values[salarioIdx]) : 0;

        // Procesar fechas (acepta formatos: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY)
        let fechaIngreso = null;
        let fechaCumpleanos = null;

        if (fechaIngresoIdx !== -1 && values[fechaIngresoIdx]) {
          fechaIngreso = parsearFecha(values[fechaIngresoIdx]);
        }

        if (fechaCumpleanosIdx !== -1 && values[fechaCumpleanosIdx]) {
          fechaCumpleanos = parsearFecha(values[fechaCumpleanosIdx]);
        }

        if (nombre && documento && area) {
          empleados.push({ nombre, documento, cargo, area, salario, fechaIngreso, fechaCumpleanos });
        } else {
          errores++;
        }
      }
    }
    // Procesar Excel (formato bÃ¡sico CSV exportado de Excel)
    else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      // Para Excel, asumimos que el usuario lo guardÃ como CSV
      // Si necesitas soporte completo de Excel, instala 'xlsx' npm package
      return res.status(400).json({
        error: 'Para archivos Excel, por favor guarda el archivo como CSV primero',
        hint: 'En Excel: Archivo > Guardar como > CSV (delimitado por comas)'
      });
    }

    // Validar Ã¡reas permitidas
    const areasValidas = [
      'TAQUILLEROS',
      'CONDUCTORES',
      'MANTENIMIENTO',
      'OPERACIONES',
      'ADMINISTRACION',
      'CENTRO DE CONTROL'
    ];

    // Insertar empleados
    for (const emp of empleados) {
      try {
        // Validar Ã¡rea
        const areaUpper = emp.area.toUpperCase();
        if (!areasValidas.includes(areaUpper)) {
          console.log(`Ã\u0081rea invÃ¡lida para ${emp.nombre}: `);
          errores++;
          continue;
        }

        // Verificar si ya existe por documento en la misma empresa
        const filtroDup = { documento: emp.documento };
        if (req.empresaId) filtroDup.empresaId = req.empresaId;
        const existe = await Empleado.findOne(filtroDup);
        if (existe) {
          console.log(`Empleado ya existe: ${emp.documento}`);
          errores++;
          continue;
        }

        const nuevoEmpleado = new Empleado({
          nombre: emp.nombre,
          documento: emp.documento,
          cargo: emp.cargo,
          area: areaUpper,
          salario: emp.salario || 0,
          fechaIngreso: emp.fechaIngreso,
          fechaCumpleanos: emp.fechaCumpleanos,
          empresaId: req.empresaId || null
        });

        await nuevoEmpleado.save();
        insertados++;
      } catch (error) {
        console.error(`Error al insertar empleado ${emp.nombre}:`, error.message);
        errores++;
      }
    }

    res.json({
      message: 'Carga masiva completada',
      insertados,
      errores,
      total: empleados.length
    });

  } catch (error) {
    console.error('Error en carga masiva:', error);
    res.status(500).json({ error: error.message });
  }
};
