// -------------------------------------------------------------
// Módulo para calcular nómina desde datos de turnos de MongoDB
// -------------------------------------------------------------
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const { getValorHora, TARIFA, DEDUCCIONES, SMLV, AUX_TRANSPORTE_COMPLETO } = require('./calculoNomina');

/**
 * Calcula la nómina de un empleado basándose en su cronograma de turnos de MongoDB
 * @param {Object} turno - Documento de turno desde MongoDB
 * @param {number} salarioBasico - Salario básico del empleado
 * @returns {Object} Resultado del cálculo de nómina
 */
function calcularNominaDesdeMongoTurnos(turno, salarioBasico) {
    // Verificar si tiene historialTurnos o cronogramaDetallado
    let cronograma = [];

    if (turno.historialTurnos && turno.historialTurnos.length > 0) {
        // Si tiene historialTurnos, necesitamos extraer todos los cronogramasDetallado de cada entrada
        turno.historialTurnos.forEach(historial => {
            if (historial.cronogramaDetallado && historial.cronogramaDetallado.length > 0) {
                cronograma = cronograma.concat(historial.cronogramaDetallado);
            }
        });
    } else if (turno.cronogramaDetallado) {
        cronograma = turno.cronogramaDetallado;
    }

    if (!turno || cronograma.length === 0) {
        throw new Error('El turno no tiene cronograma detallado ni historial de turnos con datos');
    }

    // Verificar si es área administrativa (considerar variaciones de escritura)
    // Buscar área en múltiples ubicaciones: nivel raíz, turnoActual, o historialTurnos activo
    const areaEmpleado = turno.area || 
        turno.turnoActual?.area || 
        turno.historialTurnos?.find(h => h.activo)?.area ||
        turno.historialTurnos?.[turno.historialTurnos.length - 1]?.area;
    
    const esAreaAdministrativa = areaEmpleado &&
        /administra(ción|tivo|cion)/i.test(areaEmpleado.toString().toLowerCase());

    // Verificar si es área taquilleros
    const esAreaTaquilleros = areaEmpleado &&
        /taquiller/i.test(areaEmpleado.toString().toLowerCase());

    // Verificar si es área Centro de Control
    const esAreaCentroControl = areaEmpleado &&
        /centro de control/i.test(areaEmpleado.toString().toLowerCase());

    // Verificar si tiene turno FIJO (turno administrativo)
    const esTurnoFijo = turno.turno &&
        (turno.turno.includes('FIJO') || turno.turno.includes('CC_MANUAL') ||
            turno.turnoActual?.turno?.includes('FIJO') || turno.turnoActual?.turno?.includes('CC_MANUAL'));

    // TODOS cuentan días de descanso (120 horas en 15 días, 240 en 30 días)
    const cuentaDiasDescanso = true;

    // Jornada estándar según área:
    // - HORAS_JORNADA_ESTANDAR: Horas que se pagan como normales por día (sin HE)
    // - UMBRAL_HORAS_EXTRAS: A partir de cuántas horas PAGADAS se generan extras
    // - MINUTOS_DESCANSO: Minutos de descanso NO pagados que se descuentan
    let HORAS_JORNADA_ESTANDAR = 8;
    let UMBRAL_HORAS_EXTRAS = 8;
    let MINUTOS_DESCANSO = 0;
    
    if (esAreaTaquilleros) {
        // Taquilleros: turno de 9.5h con 40min de descanso NO pagado
        // Horas pagadas = 9.5h - 0.67h = 8.83h
        // Jornada normal = 7.33h (8h - 40min)
        // HE = 8.83h - 7.33h = 1.5h por día
        HORAS_JORNADA_ESTANDAR = 7.33; // Jornada normal pagada (8h menos 40min descanso)
        UMBRAL_HORAS_EXTRAS = 7.33;    // HE después de 7.33h pagadas
        MINUTOS_DESCANSO = 40;         // 40 minutos de descanso NO pagados
    }
    // Centro de Control usa jornada de 8h (las horas adicionales de dom/fest van a recargos, no a extras)

    // Calcular valor hora basado en 220 horas mensuales (estándar colombiano)
    // Fórmula: Salario Básico / 220 horas
    const valorHora = getValorHora(salarioBasico, 220);

    // Contadores
    let diasTrabajados = 0;
    let diasParaSalario = 0; // Para cálculo de salario (máximo 30 días)
    let horasNormales = 0;
    // horasTotalesLaboradas se calcula al final como diasTrabajados × 8
    let recargoNocturno = 0;
    let recargoDominical = 0;
    let recargoFestivo = 0;
    let recargoNocturnoDominical = 0; // Recargo nocturno en domingo/festivo
    let horasExtraDiurnas = 0;
    let horasExtraNocturnas = 0;
    let horasExtraDominicalesDiurnas = 0;
    let horasExtraDominicalesNocturnas = 0;

    const NOCTURNO_INICIO_H = 19; // 7 PM
    const NOCTURNO_FIN_H = 6;     // 6 AM

    // Procesar cada día del cronograma
    for (const dia of cronograma) {
        // Manejar tanto la estructura antigua (cronogramaDetallado) como la nueva (historialTurnos)
        const fecha = dia.fecha || dia.fechaInicio;
        const horaInicio = dia.horaInicio;
        const horaFin = dia.horaFin;
        const esFestivo = dia.esFestivo || dia.festivo || false;
        const esDescanso = dia.esDescanso || dia.tablaDescanso === 'D' || false;
        const tipoDay = dia.tipoDay || dia.tipo;

        // Contar día procesado
        diasTrabajados++;

        // Verificar el día del mes para limitar el salario a 30 días máximo
        const diaDelMes = dayjs(fecha).date(); // 1 al 31

        // Solo contar para salario si es día 1-30 del mes (el día 31 NO cuenta para salario)
        if (diaDelMes <= 30) {
            diasParaSalario++;
        }

        // TODOS los días cuentan con 8 horas base (incluyendo descansos)
        if (esDescanso || !horaInicio || !horaFin) {
            horasNormales += 8; // Todos los días de descanso cuentan como 8 horas normales
            continue;
        }

        // Calcular horas del día
        const esDomingo = dayjs(fecha).day() === 0;
        const esHoraFestiva = esFestivo || tipoDay === 'FESTIVO';

        // Verificar si es día laboral (lunes a viernes) para área administrativa
        const diaSemana = dayjs(fecha).day(); // 0 = domingo, 1 = lunes, ..., 6 = sábado

        // Detectar si es horario administrativo (8:00-17:00 o similar) que requiere descuento de almuerzo
        const esHorarioAdministrativo = horaInicio === '08:00' && horaFin === '17:00';

        const esDiaLaboralAdministrativo = (esAreaAdministrativa || esHorarioAdministrativo) &&
            !esDomingo &&
            !esHoraFestiva &&
            diaSemana >= 1 && diaSemana <= 5;

        // Si tiene horario administrativo, tratarlo como área administrativa (sin recargos ni extras)
        const tratarComoAdministrativo = esAreaAdministrativa || esHorarioAdministrativo;

        // Minutos de descanso según área (taquilleros tienen 40 min de descanso NO pagado)
        const minutosDescanso = MINUTOS_DESCANSO;

        const horas = calcularHorasDiaDesdeHorario(
            fecha,
            horaInicio,
            horaFin,
            esDomingo || esHoraFestiva,
            esDiaLaboralAdministrativo, // Pasar flag para descontar almuerzo
            tratarComoAdministrativo, // Pasar flag para no calcular recargos
            UMBRAL_HORAS_EXTRAS, // Pasar umbral para horas extras (8h para taquilleros)
            minutosDescanso // Pasar minutos de descanso a descontar (40 min para taquilleros)
        );

        // DEBUG: Log detallado para taquilleros
        if (esAreaTaquilleros && turno.documentoEmpleado === '1088307210') {
            console.log(`🎫 TAQUILLERO ${fecha} | ${horaInicio}-${horaFin} | Domingo:${esDomingo} Festivo:${esHoraFestiva}`);
            console.log(`   Total turno: ${horas._debug?.totalHorasTurno}h | Descanso descontado: ${horas._debug?.horasDescansoDescontadas}h`);
            console.log(`   Horas pagadas: ${horas.totalHoras}h | Umbral HE: ${horas._debug?.umbralHorasExtras}h`);
            console.log(`   Normales: ${horas.horasNormales}h | Recargo Noct: ${horas.recargoNocturno}h`);
            console.log(`   HE Diurnas: ${horas.horasExtraDiurnas}h | HE Nocturnas: ${horas.horasExtraNocturnas}h`);
            console.log(`   Dom/Fest Diurnas: ${horas.horasDiurnasDomingoFestivo}h | HE Dom Diurnas: ${horas.horasExtraDominicalesDiurnas}h`);
        }

        // Las horas normales (pagadas a tarifa base) dependen del tipo de día:
        // - Días normales (Lun-Sáb no festivo): sumar todas las horas trabajadas
        // - Domingos/festivos: NO sumar (esas horas tienen recargo especial, no son "normales")
        // El recargo nocturno es ADICIONAL (35% extra), no reemplaza la hora base
        
        if (!esDomingo && !esHoraFestiva) {
            // Día normal: todas las horas (diurnas + nocturnas) son horas normales
            horasNormales += horas.totalHoras || 0;
        }
        // Nota: Para domingos/festivos, las horas van a recargoDominical/recargoFestivo

        // Aplicar recargos según el área:
        // - Otras áreas: SÍ recargos, SÍ extras

        if (!esAreaAdministrativa && !tratarComoAdministrativo) {
            if (esHoraFestiva) {
                // Festivo: separar horas diurnas y nocturnas
                recargoFestivo += horas.horasDiurnasDomingoFestivo; // Horas diurnas festivas
                recargoNocturnoDominical += horas.recargoNocturnoDomingoFestivo || 0; // Horas nocturnas festivas
                // Para Centro de Control: las "HE" de festivo van también a recargo festivo
                if (esAreaCentroControl) {
                    recargoFestivo += horas.horasExtraDominicalesDiurnas || 0;
                    recargoNocturnoDominical += horas.horasExtraDominicalesNocturnas || 0;
                }
            } else if (esDomingo) {
                // Domingo: separar horas diurnas y nocturnas
                recargoDominical += horas.horasDiurnasDomingoFestivo; // Horas diurnas dominicales
                recargoNocturnoDominical += horas.recargoNocturnoDomingoFestivo || 0; // Horas nocturnas dominicales
                // Para Centro de Control: las "HE" de domingo van también a recargo dominical
                if (esAreaCentroControl) {
                    recargoDominical += horas.horasExtraDominicalesDiurnas || 0;
                    recargoNocturnoDominical += horas.horasExtraDominicalesNocturnas || 0;
                }
            } else {
                // Día normal: recargo nocturno normal
                recargoNocturno += horas.recargoNocturno;
            }
            // Horas extras solo para áreas que NO son Centro de Control
            if (!esAreaCentroControl) {
                horasExtraDiurnas += horas.horasExtraDiurnas;
                horasExtraNocturnas += horas.horasExtraNocturnas;
                // HE Dominicales/Festivas (separadas de las normales)
                horasExtraDominicalesDiurnas += horas.horasExtraDominicalesDiurnas || 0;
                horasExtraDominicalesNocturnas += horas.horasExtraDominicalesNocturnas || 0;
            }
        }
    }

    // Cálculo del salario base devengado (máximo 30 días, día 31 NO cuenta)
    const salarioBaseDevengado = Number((diasParaSalario * (salarioBasico / 30)).toFixed(2));

    // Auxilio de transporte (máximo 30 días, día 31 NO cuenta)
    let auxilioTransporte = 0;
    if (salarioBasico <= 2 * SMLV) {
        auxilioTransporte = Number(((AUX_TRANSPORTE_COMPLETO / 30) * diasParaSalario).toFixed(2));
    }

    // Valores de recargos y extras
    const valorRecargoNocturno = Number((recargoNocturno * valorHora * TARIFA.RECARGO_NOCTURNO).toFixed(2));
    // El valor del recargo dominical/festivo se calcula por separado:
    // - Para festivos: 180%
    // - Para domingos: 80%
    // Aquí sumamos las horas diurnas de domingos y festivos, pero el cálculo se hace en el ciclo anterior
    // Por simplicidad, pagamos TODO recargoFestivoDominical al 80% (dominical) y el ajuste festivo se hace en el ciclo
    // Si quieres separar los valores, se puede crear dos contadores: recargoDominical y recargoFestivo
    const valorRecargoDominical = Number((recargoDominical * valorHora * TARIFA.RECARGO_DOMINICAL_FESTIVO).toFixed(2));
    const valorRecargoFestivo = Number((recargoFestivo * valorHora * 1.80).toFixed(2));
    // Recargo nocturno dominical: 80% dominical + 35% nocturno = 115% total (Ley 2466/2025)
    const valorRecargoNocturnoDominical = Number((recargoNocturnoDominical * valorHora * (TARIFA.RECARGO_DOMINICAL_FESTIVO + TARIFA.RECARGO_NOCTURNO)).toFixed(2));
    const valorHEDiurna = Number((horasExtraDiurnas * valorHora * (1 + TARIFA.HE_DIURNA)).toFixed(2));
    const valorHENocturna = Number((horasExtraNocturnas * valorHora * (1 + TARIFA.HE_NOCTURNA)).toFixed(2));
    const valorHEDominicalesDiurnas = Number((horasExtraDominicalesDiurnas * valorHora * (1 + TARIFA.HEDF_DIURNA)).toFixed(2));
    const valorHEDominicalesNocturnas = Number((horasExtraDominicalesNocturnas * valorHora * (1 + TARIFA.HEDF_NOCTURNA)).toFixed(2));
    const valorHEDF = Number((
        (horasExtraDominicalesDiurnas * valorHora * (1 + TARIFA.HEDF_DIURNA)) +
        (horasExtraDominicalesNocturnas * valorHora * (1 + TARIFA.HEDF_NOCTURNA))
    ).toFixed(2));

    const totalDevengado = Number((
        salarioBaseDevengado +
        auxilioTransporte +
        valorRecargoNocturno +
        valorRecargoDominical +
        valorRecargoFestivo +
        valorRecargoNocturnoDominical +
        valorHEDiurna +
        valorHENocturna +
        valorHEDF
    ).toFixed(2));

    // Calcular deducciones legales (sobre salario base + recargos y extras, NO sobre auxilio de transporte)
    const baseParaDeducciones = Number((
        salarioBaseDevengado +
        valorRecargoNocturno +
        valorRecargoDominical +
        valorRecargoFestivo +
        valorRecargoNocturnoDominical +
        valorHEDiurna +
        valorHENocturna +
        valorHEDF
    ).toFixed(2));

    const deduccionSalud = Number((baseParaDeducciones * DEDUCCIONES.SALUD).toFixed(2));
    const deduccionPension = Number((baseParaDeducciones * DEDUCCIONES.PENSION).toFixed(2));
    const totalDeducciones = Number((deduccionSalud + deduccionPension).toFixed(2));
    const totalNeto = Number((totalDevengado - totalDeducciones).toFixed(2));

    return {
        empleado: {
            nombre: turno.nombreEmpleado,
            documento: turno.documentoEmpleado,
            area: turno.area,
            subarea: turno.subarea,
            turno: turno.turno
        },
        periodo: {
            fechaInicio: turno.fechaInicio,
            fechaFin: turno.fechaFin,
            diasTrabajados,
            diasParaSalario // Días que cuentan para salario (máx 30, excluyendo día 31)
        },
        salarioBasico,
        salarioBaseDevengado,
        auxilioTransporte,
        horas: {
            horasTotalesLaboradas: diasTrabajados * 8, // Siempre días × 8 horas (15 días = 120h, 30 días = 240h)
            horasNormales: Number(horasNormales.toFixed(2)),
            recargoNocturno: Number(recargoNocturno.toFixed(2)),
            recargoDominical: Number(recargoDominical.toFixed(2)),
            recargoFestivo: Number(recargoFestivo.toFixed(2)),
            recargoNocturnoDominical: Number(recargoNocturnoDominical.toFixed(2)),
            horasExtraDiurnas: Number(horasExtraDiurnas.toFixed(2)),
            horasExtraNocturnas: Number(horasExtraNocturnas.toFixed(2)),
            horasExtraDominicalesDiurnas: Number(horasExtraDominicalesDiurnas.toFixed(2)),
            horasExtraDominicalesNocturnas: Number(horasExtraDominicalesNocturnas.toFixed(2))
        },
        valores: {
            valorRecargoNocturno,
            valorRecargoDominical,
            valorRecargoFestivo,
            valorRecargoNocturnoDominical,
            valorHEDiurna,
            valorHENocturna,
            valorHEDominicalesDiurnas,
            valorHEDominicalesNocturnas,
            valorHEDF
        },
        deducciones: {
            salud: deduccionSalud,
            pension: deduccionPension,
            total: totalDeducciones
        },
        totalDevengado,
        totalDeducciones,
        totalNeto
    };
}

/**
 * Calcula las horas de un día específico del cronograma
 * @param {string} fecha - Fecha del día
 * @param {string} horaInicio - Hora de inicio
 * @param {string} horaFin - Hora de fin
 * @param {boolean} esDomingoOFestivo - Si es domingo o festivo
 * @param {boolean} descontarAlmuerzo - Si debe descontar 2 horas de almuerzo (área administrativa)
 * @param {boolean} esAreaAdministrativa - Si es área administrativa (no aplica recargos)
 * @param {number} umbralHorasExtras - Umbral de horas PAGADAS para generar extras (7.33h para taquilleros)
 * @param {number} minutosDescanso - Minutos de descanso NO PAGADOS (40 min para taquilleros)
 *        Cálculo taquilleros: Turno 9.5h - 0.67h descanso = 8.83h pagadas
 *        Jornada normal = 7.33h, HE = 8.83h - 7.33h = 1.5h
 */
function calcularHorasDiaDesdeHorario(fecha, horaInicio, horaFin, esDomingoOFestivo, descontarAlmuerzo = false, esAreaAdministrativa = false, umbralHorasExtras = 8, minutosDescanso = 0) {
    const NOCTURNO_INICIO_H = 19;
    const NOCTURNO_FIN_H = 6;
    const UMBRAL_HORAS_EXTRAS = umbralHorasExtras; // 7.33h para taquilleros, 8h para otros
    const HORAS_ALMUERZO = 2; // 2 horas de almuerzo para área administrativa
    const HORAS_DESCANSO = minutosDescanso / 60; // Convertir minutos a horas (40 min = 0.67h)

    // Formatear fecha correctamente - puede venir como Date, string ISO, o string de texto
    const fechaStr = dayjs(fecha).format('YYYY-MM-DD');
    
    let entrada = dayjs(`${fechaStr} ${horaInicio}`, 'YYYY-MM-DD HH:mm');
    let salida = dayjs(`${fechaStr} ${horaFin}`, 'YYYY-MM-DD HH:mm');

    // Si la salida es antes o igual a la entrada, es del día siguiente
    if (salida.isSameOrBefore(entrada)) {
        salida = salida.add(1, 'day');
    }

    let totalHorasTurno = salida.diff(entrada, 'minute') / 60; // Horas totales del turno

    // Descontar 2 horas de almuerzo si es área administrativa en día laboral
    if (descontarAlmuerzo) {
        totalHorasTurno = Math.max(0, totalHorasTurno - HORAS_ALMUERZO);
    }

    // Los minutos de descanso NO se pagan, se descuentan del total
    // Turno 9.5h - 0.67h descanso = 8.83h pagadas
    let totalHorasPagadas = totalHorasTurno;
    if (HORAS_DESCANSO > 0) {
        totalHorasPagadas = Math.max(0, totalHorasTurno - HORAS_DESCANSO);
    }

    let horasNormales = 0;
    let recargoNocturno = 0;
    let recargoNocturnoDomingoFestivo = 0; // Nocturno en domingo/festivo (separado)
    let horasDiurnasDomingoFestivo = 0; // Horas diurnas en domingo/festivo (dentro de jornada = recargo)
    let horasExtraDiurnas = 0; // HE diurnas en días normales (Lun-Sáb)
    let horasExtraNocturnas = 0; // HE nocturnas en días normales
    let horasExtraDominicalesDiurnas = 0; // HE diurnas en domingo/festivo
    let horasExtraDominicalesNocturnas = 0; // HE nocturnas en domingo/festivo
    let horasAcumuladasPagadas = 0; // Horas PAGADAS acumuladas (después de descontar descanso)
    let horasDescansoDescontadas = 0; // Para trackear el descuento progresivo del descanso

    let actual = entrada.clone();
    let horasDescontadas = 0;

    while (actual.isBefore(salida)) {
        // Avanzar hasta el siguiente inicio de hora
        const siguienteHoraCompleta = actual.clone().add(1, 'hour').startOf('hour');
        let siguiente = siguienteHoraCompleta;

        // Si el siguiente inicio de hora está después de la salida, usar la salida
        if (siguiente.isAfter(salida)) siguiente = salida;

        let fraccion = siguiente.diff(actual, 'minute') / 60;

        // Si debe descontar almuerzo y aún quedan horas por descontar
        if (descontarAlmuerzo && horasDescontadas < HORAS_ALMUERZO) {
            const horasPorDescontar = Math.min(fraccion, HORAS_ALMUERZO - horasDescontadas);
            fraccion -= horasPorDescontar;
            horasDescontadas += horasPorDescontar;

            if (fraccion <= 0) {
                actual = siguiente;
                continue;
            }
        }

        const hora = actual.hour();
        const esNocturno = (hora >= NOCTURNO_INICIO_H || hora < NOCTURNO_FIN_H);

        // Descontar tiempo de descanso (40 min para taquilleros) de las horas DIURNAS
        // El descanso NO se paga, se descuenta del tiempo trabajado
        let fraccionPagada = fraccion;
        if (HORAS_DESCANSO > 0 && !esNocturno && horasDescansoDescontadas < HORAS_DESCANSO) {
            const horasPorDescontar = Math.min(fraccion, HORAS_DESCANSO - horasDescansoDescontadas);
            fraccionPagada = fraccion - horasPorDescontar;
            horasDescansoDescontadas += horasPorDescontar;

            if (fraccionPagada <= 0) {
                actual = siguiente;
                continue;
            }
        }

        // Calcular cuánto de esta fracción PAGADA es hora extra y cuánto es normal
        // Las HE se calculan sobre las horas PAGADAS (ya descontado el descanso)
        // Umbral: 7.33h para taquilleros, 8h para otros
        let fraccionNormal = 0;
        let fraccionExtra = 0;
        
        if (!esAreaAdministrativa) {
            const horasHastaUmbral = Math.max(0, UMBRAL_HORAS_EXTRAS - horasAcumuladasPagadas);
            if (horasHastaUmbral >= fraccionPagada) {
                // Toda la fracción está dentro de la jornada normal
                fraccionNormal = fraccionPagada;
                fraccionExtra = 0;
            } else {
                // Parte normal y parte extra
                fraccionNormal = horasHastaUmbral;
                fraccionExtra = fraccionPagada - horasHastaUmbral;
            }
        } else {
            fraccionNormal = fraccionPagada;
        }

        // Clasificar las horas según el tipo de día
        if (esAreaAdministrativa) {
            horasNormales += fraccionPagada;
        } else if (esDomingoOFestivo) {
            // En domingo/festivo: separar horas normales de horas extras
            if (fraccionNormal > 0) {
                if (esNocturno) {
                    recargoNocturnoDomingoFestivo += fraccionNormal;
                } else {
                    horasDiurnasDomingoFestivo += fraccionNormal;
                }
            }
            if (fraccionExtra > 0) {
                if (esNocturno) {
                    horasExtraDominicalesNocturnas += fraccionExtra;
                } else {
                    horasExtraDominicalesDiurnas += fraccionExtra;
                }
            }
        } else {
            // Día normal (Lun-Sáb)
            // Las horas normales incluyen TODAS las horas de la jornada (diurnas + nocturnas)
            // El recargo nocturno es ADICIONAL (35% extra), no reemplaza la hora base
            if (fraccionNormal > 0) {
                horasNormales += fraccionNormal; // Todas las horas normales (base)
                if (esNocturno) {
                    recargoNocturno += fraccionNormal; // Marca cuáles tienen recargo nocturno
                }
            }
            if (fraccionExtra > 0) {
                if (esNocturno) {
                    horasExtraNocturnas += fraccionExtra;
                } else {
                    horasExtraDiurnas += fraccionExtra;
                }
            }
        }

        horasAcumuladasPagadas += fraccionPagada;
        actual = siguiente;
    }

    return {
        totalHoras: totalHorasPagadas,
        horasNormales,
        recargoNocturno,
        recargoNocturnoDomingoFestivo,
        horasDiurnasDomingoFestivo,
        horasExtraDiurnas,
        horasExtraNocturnas,
        horasExtraDominicalesDiurnas,
        horasExtraDominicalesNocturnas,
        // DEBUG: info adicional
        _debug: {
            totalHorasTurno: salida.diff(entrada, 'minute') / 60,
            horasDescansoDescontadas,
            horasAcumuladasPagadas,
            umbralHorasExtras: UMBRAL_HORAS_EXTRAS
        }
    };
}

module.exports = {
    calcularNominaDesdeMongoTurnos
};
