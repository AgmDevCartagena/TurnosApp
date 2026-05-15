// -------------------------------------------------------------
// Módulo de lógica de negocio para el cálculo de nómina y horas
// -------------------------------------------------------------
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

// --- CONSTANTES DE CONFIGURACIÓN ---
const SMLV = 1750905; // Salario mínimo legal vigente (ajustar si cambia)
const AUX_TRANSPORTE_COMPLETO = 249095; // Auxilio de transporte mensual

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

const HORAS_JORNADA_ESTANDAR = 9;

// Mapeo de nombres de días
const diasSemanaMap = {
    sunday: 'domingo',
    monday: 'lunes',
    tuesday: 'martes',
    wednesday: 'miercoles',
    thursday: 'jueves',
    friday: 'viernes',
    saturday: 'sabado'
};

// Cálculo del valor hora
// Basado en 220 horas mensuales laboradas (promedio estándar en Colombia)
// Fórmula: Salario Básico / 220 horas
// Ejemplo: $1,864,000 / 220 = $8,472.73 por hora
function getValorHora(salarioBasico, horasMensuales = 220) {
    return salarioBasico / horasMensuales;
}

const NOCTURNO_INICIO_H = 19; // 7 PM
const NOCTURNO_FIN_H = 6;     // 6 AM

// -------------------------------------------------------------
// CÁLCULO DE HORAS TRABAJADAS EN UN DÍA
// -------------------------------------------------------------
function calcularHorasDia(fecha, entradaStr, salidaStr, esDomingo, esFestivo) {
    if (!entradaStr || !salidaStr) {
        return {
            horasNormales: 0,
            recargoNocturno: 0,
            recargoFestivoDominical: 0,
            horasExtraDiurnas: 0,
            horasExtraNocturnas: 0,
            horasExtraDominicales: 0,
            horasExtraDominicalesDiurnas: 0,
            horasExtraDominicalesNocturnas: 0
        };
    }

    let entrada = dayjs(`${fecha} ${entradaStr}`, 'YYYY-MM-DD HH:mm');
    let salida = dayjs(`${fecha} ${salidaStr}`, 'YYYY-MM-DD HH:mm');
    if (salida.isSameOrBefore(entrada)) salida = salida.add(1, 'day');

    let totalHoras = salida.diff(entrada, 'minute') / 60;
    let horasNormales = 0, recargoNocturno = 0, recargoFestivoDominical = 0;
    let horasExtraDiurnas = 0, horasExtraNocturnas = 0;
    let horasExtraDominicales = 0, horasExtraDominicalesDiurnas = 0, horasExtraDominicalesNocturnas = 0;
    let actual = entrada.clone();
    let horasAcumuladas = 0;

    while (actual.isBefore(salida)) {
        let siguiente = actual.add(1, 'hour');
        if (siguiente.isAfter(salida)) siguiente = salida;

        let hora = actual.hour();
        let esNocturno = (hora >= NOCTURNO_INICIO_H || hora < NOCTURNO_FIN_H);
        let esHoraExtra = horasAcumuladas >= HORAS_JORNADA_ESTANDAR;
        let fraccion = siguiente.diff(actual, 'minute') / 60;

        if (esDomingo || esFestivo) {
            recargoFestivoDominical += fraccion;
            if (esHoraExtra) {
                horasExtraDominicales += fraccion;
                if (esNocturno) horasExtraDominicalesNocturnas += fraccion;
                else horasExtraDominicalesDiurnas += fraccion;
            }
        } else if (esNocturno) {
            recargoNocturno += fraccion;
            if (esHoraExtra) horasExtraNocturnas += fraccion;
        } else {
            if (esHoraExtra) horasExtraDiurnas += fraccion;
            else horasNormales += fraccion;
        }

        horasAcumuladas += fraccion;
        actual = siguiente;
    }

    return {
        horasNormales: Number(horasNormales.toFixed(2)),
        recargoNocturno: Number(recargoNocturno.toFixed(2)),
        recargoFestivoDominical: Number(recargoFestivoDominical.toFixed(2)),
        horasExtraDiurnas: Number(horasExtraDiurnas.toFixed(2)),
        horasExtraNocturnas: Number(horasExtraNocturnas.toFixed(2)),
        horasExtraDominicales: Number(horasExtraDominicales.toFixed(2)),
        horasExtraDominicalesDiurnas: Number(horasExtraDominicalesDiurnas.toFixed(2)),
        horasExtraDominicalesNocturnas: Number(horasExtraDominicalesNocturnas.toFixed(2))
    };
}

// -------------------------------------------------------------
// CÁLCULO DE NÓMINA POR PERÍODO (con días de descanso remunerados)
// -------------------------------------------------------------
async function calcularNominaPeriodo(datos, festivosSet) {
    const { salarioBasico, fechaInicio, fechaFin, horariosSemanal, diasFijosDescanso } = datos;
    let fecha = dayjs(fechaInicio);
    const fechaFinObj = dayjs(fechaFin);

    let diasTrabajados = 0;
    let salarioBaseDevengado = 0;
    let auxilioTransporte = 0;
    let totalDevengado = 0;

    let horasNormales = 0, recargoNocturno = 0, recargoFestivoDominical = 0;
    let horasExtraDiurnas = 0, horasExtraNocturnas = 0;
    let horasExtraDominicales = 0, horasExtraDominicalesDiurnas = 0, horasExtraDominicalesNocturnas = 0;

    const valorHora = getValorHora(salarioBasico);

    while (!fecha.isAfter(fechaFinObj)) {
        const diaSemana = fecha.format('dddd').toLowerCase();
        const diaMap = diasSemanaMap[diaSemana] || diaSemana;
        const horario = horariosSemanal[diaMap] || horariosSemanal[diaSemana];

        const esDescanso = diasFijosDescanso.includes(diaMap) || (horario && horario.descanso);
        const esDomingo = diaMap === 'domingo';
        const esFestivo = festivosSet && festivosSet.has(fecha.format('YYYY-MM-DD'));

        //  Nueva regla: si es descanso o festivo, se paga igual (día trabajado)
        diasTrabajados++;

        // Solo se calculan horas si realmente trabajó
        if (!esDescanso && horario && horario.entrada && horario.salida) {
            const horas = calcularHorasDia(
                fecha.format('YYYY-MM-DD'),
                horario.entrada,
                horario.salida,
                esDomingo,
                esFestivo
            );

            horasNormales += horas.horasNormales;
            recargoNocturno += horas.recargoNocturno;
            recargoFestivoDominical += horas.recargoFestivoDominical;
            horasExtraDiurnas += horas.horasExtraDiurnas;
            horasExtraNocturnas += horas.horasExtraNocturnas;
            horasExtraDominicales += horas.horasExtraDominicales;
            horasExtraDominicalesDiurnas += horas.horasExtraDominicalesDiurnas;
            horasExtraDominicalesNocturnas += horas.horasExtraDominicalesNocturnas;
        }

        fecha = fecha.add(1, 'day');
    }

    //  Ahora el salario base incluye todos los días calendario (trabajados o descanso)
    salarioBaseDevengado = Number((diasTrabajados * (salarioBasico / 30)).toFixed(2));

    //  Auxilio transporte también aplica a todos los días pagados
    if (salarioBasico <= 2 * SMLV) {
        auxilioTransporte = Number(((AUX_TRANSPORTE_COMPLETO / 30) * diasTrabajados).toFixed(2));
    }

    // Cálculos de recargos y extras
    const valorRecargoNocturno = Number((recargoNocturno * valorHora * TARIFA.RECARGO_NOCTURNO).toFixed(2));
    const valorRecargoDominical = Number((recargoFestivoDominical * valorHora * TARIFA.RECARGO_DOMINICAL_FESTIVO).toFixed(2));
    const valorHEDiurna = Number((horasExtraDiurnas * valorHora * (1 + TARIFA.HE_DIURNA)).toFixed(2));
    const valorHENocturna = Number((horasExtraNocturnas * valorHora * (1 + TARIFA.HE_NOCTURNA)).toFixed(2));
    const valorHEDF = Number((
        (horasExtraDominicalesDiurnas * valorHora * (1 + TARIFA.HEDF_DIURNA)) +
        (horasExtraDominicalesNocturnas * valorHora * (1 + TARIFA.HEDF_NOCTURNA))
    ).toFixed(2));

    totalDevengado = Number((
        salarioBaseDevengado +
        auxilioTransporte +
        valorRecargoNocturno +
        valorRecargoDominical +
        valorHEDiurna +
        valorHENocturna +
        valorHEDF
    ).toFixed(2));

    return {
        diasTrabajados,
        salarioBaseDevengado,
        auxilioTransporte,
        horasNormales: Number(horasNormales.toFixed(2)),
        recargoNocturno: Number(recargoNocturno.toFixed(2)),
        valorRecargoNocturno,
        recargoDominical: Number(recargoFestivoDominical.toFixed(2)),
        valorRecargoDominical,
        horasExtraDiurnas: Number(horasExtraDiurnas.toFixed(2)),
        valorHEDiurna,
        horasExtraNocturnas: Number(horasExtraNocturnas.toFixed(2)),
        valorHENocturna,
        horasExtraDominicales: Number(horasExtraDominicales.toFixed(2)),
        horasExtraDominicalesDiurnas: Number(horasExtraDominicalesDiurnas.toFixed(2)),
        horasExtraDominicalesNocturnas: Number(horasExtraDominicalesNocturnas.toFixed(2)),
        valorHEDF,
        totalDevengado
    };
}

// -------------------------------------------------------------
// EXPORTACIONES
// -------------------------------------------------------------
module.exports = {
    calcularHorasDia,
    calcularNominaPeriodo,
    getValorHora,
    TARIFA,
    DEDUCCIONES,
    HORAS_JORNADA_ESTANDAR,
    diasSemanaMap,
    SMLV,
    AUX_TRANSPORTE_COMPLETO
};