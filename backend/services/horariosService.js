/**
 * Servicio de configuración de horarios específicos por subárea
 * Maneja los horarios diferenciados entre MEGABUS y MEGACABLE
 */

/**
 * Configuración de horarios por subárea, turno y tipo de día
 */
const CONFIGURACION_HORARIOS = {
  MEGABUS: {
    TURNO_100: {
      LUNES_SABADO: {
        horaInicio: '05:00',
        horaFin: '14:30',
        descripcion: 'Lunes a Sábado 5:00 AM - 2:30 PM'
      },
      DOMINGO_FESTIVO: {
        horaInicio: '05:30',
        horaFin: '14:30',
        descripcion: 'Domingos y Festivos 5:30 AM - 2:30 PM'
      }
    },
    TURNO_300: {
      LUNES_SABADO: {
        horaInicio: '14:00',
        horaFin: '23:30',
        descripcion: 'Lunes a Sábado 2:00 PM - 11:30 PM'
      },
      DOMINGO_FESTIVO: {
        horaInicio: '14:00',
        horaFin: '23:00',
        descripcion: 'Domingos y Festivos 2:00 PM - 11:00 PM'
      }
    },
    TURNO_400: {
      LUNES_SABADO: {
        horaInicio: '05:00',
        horaFin: '10:00',
        horaInicio2: '14:15',
        horaFin2: '18:15',
        descripcion: 'Lunes a Sábado 5:00 AM - 10:00 AM + 2:15 PM - 6:15 PM (Partido)'
      },
      DOMINGO_FESTIVO: {
        horaInicio: '05:30',
        horaFin: '10:00',
        horaInicio2: '14:15',
        horaFin2: '18:00',
        descripcion: 'Domingos y Festivos 5:30 AM - 10:00 AM + 2:15 PM - 6:00 PM (Partido)'
      }
    }
  },
  MEGACABLE: {
    TURNO_100: {
      LUNES_VIERNES: {
        horaInicio: '05:00',
        horaFin: '13:30',
        descripcion: 'Lunes a Viernes 5:00 AM - 1:30 PM'
      },
      SABADO: {
        horaInicio: '05:00',
        horaFin: '13:00',
        descripcion: 'Sábados 5:00 AM - 1:00 PM'
      },
      DOMINGO_FESTIVO: {
        horaInicio: '06:00',
        horaFin: '13:00',
        descripcion: 'Domingos y Festivos 6:00 AM - 1:00 PM'
      }
    },
    TURNO_300: {
      LUNES_VIERNES: {
        horaInicio: '13:30',
        horaFin: '22:30',
        descripcion: 'Lunes a Viernes 1:30 PM - 10:30 PM'
      },
      SABADO: {
        horaInicio: '13:00',
        horaFin: '22:00',
        descripcion: 'Sábados 1:00 PM - 10:00 PM'
      },
      DOMINGO_FESTIVO: {
        horaInicio: '13:00',
        horaFin: '21:30',
        descripcion: 'Domingos y Festivos 1:00 PM - 9:30 PM'
      }
    }
    // NOTA: MEGACABLE no tiene TURNO_400
  }
};

/**
 * Determina el tipo de día según la fecha
 */
function determinarTipoDia(fecha, esFestivo = false) {
  const diaSemana = fecha.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
  
  if (esFestivo || diaSemana === 0) {
    return 'DOMINGO_FESTIVO';
  }
  
  if (diaSemana === 6) {
    return 'SABADO';
  }
  
  // Lunes a viernes (1-5)
  return 'LUNES_VIERNES';
}

/**
 * Determina el tipo de día para MEGABUS (que agrupa diferente)
 */
function determinarTipoDiaMegabus(fecha, esFestivo = false) {
  const diaSemana = fecha.getDay();
  
  if (esFestivo || diaSemana === 0) {
    return 'DOMINGO_FESTIVO';
  }
  
  // Lunes a sábado (1-6)
  return 'LUNES_SABADO';
}

/**
 * Obtiene la configuración de horario específica
 */
function obtenerHorario(subarea, turno, fecha, esFestivo = false) {
  const config = CONFIGURACION_HORARIOS[subarea];
  
  if (!config) {
    throw new Error(`Subárea ${subarea} no configurada`);
  }
  
  const configTurno = config[turno];
  if (!configTurno) {
    throw new Error(`Turno ${turno} no disponible para ${subarea}`);
  }
  
  // Determinar tipo de día según la subárea
  let tipoDia;
  if (subarea === 'MEGABUS') {
    tipoDia = determinarTipoDiaMegabus(fecha, esFestivo);
  } else {
    tipoDia = determinarTipoDia(fecha, esFestivo);
    // Para MEGACABLE, si es LUNES_VIERNES pero es sábado, cambiar a SABADO
    if (tipoDia === 'LUNES_VIERNES' && fecha.getDay() === 6) {
      tipoDia = 'SABADO';
    }
  }
  
  const horario = configTurno[tipoDia];
  if (!horario) {
    // Fallback: buscar el primer horario disponible
    const horariosDisponibles = Object.keys(configTurno);
    if (horariosDisponibles.length > 0) {
      return configTurno[horariosDisponibles[0]];
    }
    throw new Error(`No hay horario configurado para ${subarea} ${turno} en ${tipoDia}`);
  }
  
  return horario;
}

/**
 * Obtiene todos los turnos disponibles para una subárea
 */
function obtenerTurnosDisponibles(subarea) {
  const config = CONFIGURACION_HORARIOS[subarea];
  if (!config) {
    return [];
  }
  
  return Object.keys(config);
}

/**
 * Valida si un turno está disponible para una subárea
 */
function validarTurnoSubarea(subarea, turno) {
  const turnosDisponibles = obtenerTurnosDisponibles(subarea);
  return turnosDisponibles.includes(turno);
}

/**
 * Obtiene la información completa de un turno para mostrar al usuario
 */
function obtenerInfoCompletaTurno(subarea, turno) {
  if (!validarTurnoSubarea(subarea, turno)) {
    return null;
  }
  
  const config = CONFIGURACION_HORARIOS[subarea][turno];
  const tiposDia = Object.keys(config);
  
  return {
    subarea,
    turno,
    horarios: config,
    tiposDiaDisponibles: tiposDia,
    descripcionCompleta: tiposDia.map(tipo => config[tipo].descripcion).join(' | ')
  };
}

/**
 * Calcula las horas totales de trabajo para un horario
 */
function calcularHorasTrabajo(horario) {
  if (horario.horaInicio2) {
    // Turno partido
    const horas1 = calcularDiferenciaHoras(horario.horaInicio, horario.horaFin);
    const horas2 = calcularDiferenciaHoras(horario.horaInicio2, horario.horaFin2);
    return horas1 + horas2;
  } else {
    // Turno normal
    return calcularDiferenciaHoras(horario.horaInicio, horario.horaFin);
  }
}

/**
 * Función auxiliar para calcular diferencia entre horas
 */
function calcularDiferenciaHoras(inicio, fin) {
  const [horaInicio, minutoInicio] = inicio.split(':').map(Number);
  const [horaFin, minutoFin] = fin.split(':').map(Number);
  
  const fechaInicio = new Date(2000, 0, 1, horaInicio, minutoInicio);
  let fechaFin = new Date(2000, 0, 1, horaFin, minutoFin);
  
  // Si la hora de fin es menor que la de inicio, es del día siguiente
  if (fechaFin < fechaInicio) {
    fechaFin.setDate(fechaFin.getDate() + 1);
  }
  
  return (fechaFin - fechaInicio) / (1000 * 60 * 60); // Diferencia en horas
}

module.exports = {
  CONFIGURACION_HORARIOS,
  obtenerHorario,
  obtenerTurnosDisponibles,
  validarTurnoSubarea,
  obtenerInfoCompletaTurno,
  calcularHorasTrabajo,
  determinarTipoDia,
  determinarTipoDiaMegabus
};