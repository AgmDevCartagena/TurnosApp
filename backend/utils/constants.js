/**
 * Constantes centralizadas del sistema de turnos
 * Este archivo contiene todas las constantes que se usan en múltiples lugares
 * para evitar duplicación y mantener consistencia
 */

// Días de la semana en español
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Mapeo de días en inglés a español
const DIAS_SEMANA_MAP = {
    sunday: 'domingo',
    monday: 'lunes',
    tuesday: 'martes',
    wednesday: 'miércoles',
    thursday: 'jueves',
    friday: 'viernes',
    saturday: 'sábado'
};

// Horarios para jornada nocturna
const NOCTURNO_INICIO_H = 19; // 7 PM
const NOCTURNO_FIN_H = 6;     // 6 AM

// Horas de jornada estándar
const HORAS_JORNADA_ESTANDAR = 9;

// Salario mínimo legal vigente 2025
const SMLV = 1750905;

// Auxilio de transporte mensual
const AUX_TRANSPORTE_COMPLETO = 249095;

// Porcentajes de deducciones legales
const DEDUCCIONES = {
    SALUD: 0.04,        // 4% del salario
    PENSION: 0.04       // 4% del salario
};

// Porcentajes de recargos sobre el valor hora base
// Actualizado según Ley 2466 de 2025 (Reforma Laboral) - Vigente desde julio 2025
const TARIFA = {
    RECARGO_NOCTURNO: 0.35,              // 35% - CST Art. 168
    RECARGO_DOMINICAL_FESTIVO: 0.80,     // 80% - Ley 2466/2025 (antes 75%, aumenta a 90% en 2026, 100% en 2027)
    HE_DIURNA: 0.25,                     // 25% - CST Art. 168
    HE_NOCTURNA: 0.75,                   // 75% - CST Art. 168
    HEDF_DIURNA: 1.05,                   // 105% (25% HED + 80% Dominical/Festivo)
    HEDF_NOCTURNA: 1.55                  // 155% (75% HEN + 80% Dominical/Festivo)
};

// Áreas del sistema
const AREAS = {
    TAQUILLEROS: 'TAQUILLEROS',
    MANTENIMIENTO: 'MANTENIMIENTO',
    CENTRO_CONTROL: 'CENTRO DE CONTROL',
    CONDUCTORES: 'CONDUCTORES',
    ADMINISTRACION: 'ADMINISTRACION'
};

// Subáreas de taquilleros
const SUBAREAS_TAQUILLEROS = ['MEGABUS', 'MEGACABLE'];

// Turnos disponibles
const TURNOS = {
    MAÑANA: 'MAÑANA',
    TARDE: 'TARDE',
    NOCHE: 'NOCHE',
    DESCANSO: 'DESCANSO'
};

// Horarios por turno para mantenimiento
const HORARIOS_MANTENIMIENTO = {
    MAÑANA: { inicio: '06:00', fin: '14:00' },
    TARDE: { inicio: '14:00', fin: '22:00' },
    NOCHE: { inicio: '22:00', fin: '06:00' }
};

module.exports = {
    DIAS_SEMANA,
    DIAS_SEMANA_MAP,
    NOCTURNO_INICIO_H,
    NOCTURNO_FIN_H,
    HORAS_JORNADA_ESTANDAR,
    SMLV,
    AUX_TRANSPORTE_COMPLETO,
    DEDUCCIONES,
    TARIFA,
    AREAS,
    SUBAREAS_TAQUILLEROS,
    TURNOS,
    HORARIOS_MANTENIMIENTO
};
