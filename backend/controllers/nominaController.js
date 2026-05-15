// -------------------------------------------------------------
// Controlador de Nómina - Independiente (sin dependencia de turnos o festivos)
// -------------------------------------------------------------
const { validarEmpleado } = require('../validators/empleadoValidator');
const dayjs = require('dayjs');
const csv = require('csv-parser');
const multer = require('multer');
const fs = require('fs');

const { normalizarClave, normalizarHora } = require('../utils/helpers');
const { calcularNominaPeriodo } = require('../utils/calculoNomina');
const { calcularNominaDesdeMongoTurnos } = require('../utils/calculoNominaMongo');
const { 
    buscarTurnoPorDocumentoYPeriodo, 
    buscarTurnosPorPeriodo,
    buscarTurnoPorDocumentoYRango,
    buscarTurnosPorRango,
    buscarTurnosPorAreaYRango,
    buscarTurnosAgrupadosPorArea,
    obtenerAreasDisponibles
} = require('../models/turnoModel');
const { generarFestivosColombiaAño, esFestivo } = require('../services/festivosService');

// -------------------------------------------------------------
// Festivos como Set para rangos (incluye años distintos)
// -------------------------------------------------------------
function getFestivosSetDesdeRango(fechaInicio, fechaFin) {
    const añoInicio = dayjs(fechaInicio).year();
    const añoFin = dayjs(fechaFin || fechaInicio).year();
    const festivosSet = new Set();

    for (let año = añoInicio; año <= añoFin; año++) {
        generarFestivosColombiaAño(año).forEach(f => festivosSet.add(f.date));
    }

    return festivosSet;
}

// -------------------------------------------------------------
// Configuración de subida con Multer
// -------------------------------------------------------------
const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.csv$/)) {
            return cb(new Error('Solo se permiten archivos CSV.'));
        }
        cb(null, true);
    }
});

// -------------------------------------------------------------
// Controlador: Importar empleados desde CSV y calcular nómina
// -------------------------------------------------------------
exports.importarCSV = [upload.single('csvFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo CSV.' });
    }

    const results = [];
    const advertencias = [];
    const filePath = req.file.path;

    try {
        // ✅ Lectura segura y detección automática del separador (; o ,)
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/^\uFEFF/, ''); // Elimina el BOM invisible
        const firstLine = content.split('\n')[0];
        let separator = ',';
        if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
            separator = ';';
        }

        // Validación de columnas requeridas
        if (!firstLine.toLowerCase().includes('nombre') || !firstLine.toLowerCase().includes('salario')) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'El CSV no contiene las columnas requeridas (nombre, salario, etc.)' });
        }

        // Leer CSV con el separador detectado
        const rows = [];
        fs.createReadStream(filePath)
            .pipe(csv({
                separator,
                mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '')
            }))
            .on('data', (row) => rows.push(row))
            .on('end', async () => {
                try {
                    for (const row of rows) {
                        // --- Normalización de claves y campos ---
                        const clavesRow = Object.keys(row).reduce((acc, k) => {
                            acc[normalizarClave(k)] = row[k];
                            return acc;
                        }, {});
                        const getCampo = (variantes) => {
                            for (const v of variantes) {
                                const claveNorm = normalizarClave(v);
                                if (clavesRow[claveNorm] !== undefined) return clavesRow[claveNorm];
                            }
                            return '';
                        };

                        const nombre = getCampo(['nombre']);
                        const salarioBasico = Number(getCampo(['salariobasico', 'salario_basico'])) || 0;
                        if (!nombre || !salarioBasico) {
                            advertencias.push(`Registro omitido: nombre o salario básico inválido.`);
                            continue;
                        }

                        // --- Construcción del horario semanal ---
                        const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
                        const horariosSemanal = {};
                        const diasFijosDescanso = [];
                        let horarioValido = false;

                        dias.forEach(dia => {
                            let entrada = normalizarHora(getCampo([`${dia}_entrada`, `${dia}entrada`, `${dia}e`]));
                            let salida = normalizarHora(getCampo([`${dia}_salida`, `${dia}salida`, `${dia}s`]));
                            const descansoCSV = (getCampo([`${dia}_descanso`, `${dia}desc`]) || '').toUpperCase();
                            const esDescanso = (descansoCSV === 'SI' || !entrada || !salida);

                            if (entrada && !dayjs(entrada, 'HH:mm', true).isValid()) {
                                advertencias.push(`Registro ${nombre}: hora de entrada inválida (${entrada}) en ${dia}.`);
                                entrada = null;
                            }
                            if (salida && !dayjs(salida, 'HH:mm', true).isValid()) {
                                advertencias.push(`Registro ${nombre}: hora de salida inválida (${salida}) en ${dia}.`);
                                salida = null;
                            }

                            horariosSemanal[dia] = {
                                entrada: esDescanso ? null : entrada,
                                salida: esDescanso ? null : salida,
                                descanso: esDescanso
                            };
                            if (!esDescanso) horarioValido = true;
                            if (esDescanso) diasFijosDescanso.push(dia);
                        });

                        if (!horarioValido) {
                            advertencias.push(`Registro ${nombre}: no tiene ningún día laboral válido.`);
                            continue;
                        }

                        // --- Fechas de nómina ---
                        let fechaInicio = dayjs().startOf('month').format('YYYY-MM-DD');
                        let fechaFin = dayjs().endOf('month').format('YYYY-MM-DD');
                        const fechaInicioRaw = getCampo(['fecha_inicio', 'fechainicio']);
                        const fechaFinRaw = getCampo(['fecha_fin', 'fechafin']);

                        if (fechaInicioRaw) {
                            const fIni = dayjs(fechaInicioRaw, ['D/M/YYYY', 'YYYY-MM-DD'], true);
                            if (fIni.isValid()) fechaInicio = fIni.format('YYYY-MM-DD');
                            else advertencias.push(`Registro ${nombre}: fecha de inicio inválida (${fechaInicioRaw}).`);
                        }
                        if (fechaFinRaw) {
                            const fFin = dayjs(fechaFinRaw, ['D/M/YYYY', 'YYYY-MM-DD'], true);
                            if (fFin.isValid()) fechaFin = fFin.format('YYYY-MM-DD');
                            else advertencias.push(`Registro ${nombre}: fecha de fin inválida (${fechaFinRaw}).`);
                        }

                        const festivosSet = getFestivosSetDesdeRango(fechaInicio, fechaFin);

                        const datosEmpleado = {
                            salarioBasico,
                            fechaInicio,
                            fechaFin,
                            horariosSemanal,
                            diasFijosDescanso
                        };

                        // --- Validación de estructura general ---
                        const { error } = validarEmpleado({
                            nombre,
                            salarioBasico,
                            cargo: getCampo(['cargo']),
                            auxTransporte: null,
                            diasTrabajados: null,
                            novedad: getCampo(['novedad'])
                        });
                        if (error) {
                            advertencias.push(`Registro ${nombre}: datos inválidos (${error.message}).`);
                            continue;
                        }

                        // --- Cálculo de liquidación ---
                        try {
                            const liquidacion = await calcularNominaPeriodo(datosEmpleado, festivosSet);
                            results.push({
                                nombre,
                                cargo: getCampo(['cargo']),
                                salarioBasico,
                                diasTrabajados: liquidacion.diasTrabajados,
                                auxilioTransporte: liquidacion.auxilioTransporte,
                                novedad: getCampo(['novedad']),
                                totalDevengado: liquidacion.totalDevengado,
                                detalle: {
                                    horasNormales: liquidacion.horasNormales ?? 0,
                                    recargoNocturno: liquidacion.recargoNocturno ?? 0,
                                    valorRecargoNocturno: liquidacion.valorRecargoNocturno ?? 0,
                                    recargoDominical: liquidacion.recargoDominical ?? 0,
                                    valorRecargoDominical: liquidacion.valorRecargoDominical ?? 0,
                                    horasExtraDiurnas: liquidacion.horasExtraDiurnas ?? 0,
                                    valorHEDiurna: liquidacion.valorHEDiurna ?? 0,
                                    horasExtraNocturnas: liquidacion.horasExtraNocturnas ?? 0,
                                    valorHENocturna: liquidacion.valorHENocturna ?? 0,
                                    horasExtraDominicalesDiurnas: liquidacion.horasExtraDominicalesDiurnas ?? 0,
                                    horasExtraDominicalesNocturnas: liquidacion.horasExtraDominicalesNocturnas ?? 0,
                                    valorHEDF: liquidacion.valorHEDF ?? 0
                                }
                            });
                        } catch (err) {
                            advertencias.push(`Registro ${nombre}: error al calcular la liquidación.`);
                        }
                    }

                    fs.unlink(filePath, () => {});
                    res.status(200).json({
                        ok: true,
                        totalProcesados: results.length,
                        empleados: results,
                        advertencias
                    });
                } catch (error) {
                    console.error('Error general procesando CSV:', error);
                    res.status(500).json({ error: 'Error general procesando el archivo CSV.' });
                }
            })
            .on('error', (error) => {
                console.error('Error procesando el CSV:', error);
                res.status(500).json({ error: 'Error al leer el archivo CSV.' });
            });
    } catch (error) {
        console.error('Error al iniciar la importación CSV:', error);
        res.status(500).json({ error: 'Error al iniciar la importación del archivo CSV.' });
    }
}];

// -------------------------------------------------------------
// Controlador: Calcular nómina manualmente (simplificado)
// -------------------------------------------------------------
exports.calcularNomina = async (req, res) => {
    const { salarioBasico, fechaInicio, fechaFin, horariosSemanal, diasFijosDescanso } = req.body;

    if (!salarioBasico || !fechaInicio || !fechaFin || !horariosSemanal) {
        return res.status(400).json({ 
            error: 'Se requieren salarioBasico, fechaInicio, fechaFin y horariosSemanal.' 
        });
    }

    try {
        const festivosSet = getFestivosSetDesdeRango(fechaInicio, fechaFin);
        
        const datosCalculo = {
            salarioBasico,
            fechaInicio,
            fechaFin,
            horariosSemanal,
            diasFijosDescanso: diasFijosDescanso || []
        };

        const liquidacion = await calcularNominaPeriodo(datosCalculo, festivosSet);

        res.json({
            ok: true,
            periodo: `${fechaInicio} - ${fechaFin}`,
            liquidacion
        });
    } catch (error) {
        console.error('Error al calcular la nómina:', error);
        res.status(500).json({ error: 'Error interno al calcular la nómina.' });
    }
};

// -------------------------------------------------------------
// Controlador: Calcular nómina desde MongoDB (turnos)
// -------------------------------------------------------------
exports.calcularNominaDesdeMongoTurnos = async (req, res) => {
    const { documento, mes, anio, fechaInicio, fechaFin, salarioBasico } = req.body;

    // Validar que tenga documento y alguna forma de especificar el periodo
    if (!documento) {
        return res.status(400).json({
            error: 'Se requiere el documento del empleado.'
        });
    }

    if ((!fechaInicio || !fechaFin) && (!mes || !anio)) {
        return res.status(400).json({
            error: 'Se requiere especificar el periodo con fechaInicio/fechaFin o mes/anio.'
        });
    }

    try {
        let turno;

        // Opción 1: Buscar por rango de fechas específico
        if (fechaInicio && fechaFin) {
            turno = await buscarTurnoPorDocumentoYRango(documento, fechaInicio, fechaFin, req.empresaId);
            
            if (!turno) {
                return res.status(404).json({
                    error: `No se encontró turno para el documento ${documento} en el periodo ${fechaInicio} - ${fechaFin}.`
                });
            }
        } 
        // Opción 2: Buscar por mes/año (retrocompatibilidad)
        else {
            turno = await buscarTurnoPorDocumentoYPeriodo(documento, mes, anio, req.empresaId);
            
            if (!turno) {
                return res.status(404).json({
                    error: `No se encontró turno para el documento ${documento} en el periodo ${mes}/${anio}.`
                });
            }
        }

        // Determinar el salario: usar el del body, o el de MongoDB, o error
        let salarioFinal = salarioBasico;
        
        if (!salarioFinal) {
            // Intentar obtener el salario del documento de turno
            salarioFinal = turno.salario || turno.salarioBasico || turno.salarioMensual;
            
            if (!salarioFinal) {
                return res.status(400).json({
                    error: 'No se encontró salario en el turno. Por favor proporciona el salarioBasico.'
                });
            }
        }

        // Filtrar el cronograma si se especificó un rango de fechas
        let turnoFiltrado = turno;
        if (fechaInicio && fechaFin) {
            turnoFiltrado = { ...turno };
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);
            
            turnoFiltrado.cronogramaDetallado = turno.cronogramaDetallado.filter(dia => {
                const fechaDia = new Date(dia.fecha);
                return fechaDia >= inicio && fechaDia <= fin;
            });

            turnoFiltrado.fechaInicio = fechaInicio;
            turnoFiltrado.fechaFin = fechaFin;
        }

        // Calcular la nómina usando los datos del turno
        const liquidacion = calcularNominaDesdeMongoTurnos(turnoFiltrado, salarioFinal);

        res.json({
            ok: true,
            mensaje: 'Nómina calculada desde turnos de MongoDB',
            periodoCalculado: fechaInicio && fechaFin ? `${fechaInicio} - ${fechaFin}` : `${mes}/${anio}`,
            salarioUtilizado: salarioFinal,
            fuenteSalario: salarioBasico ? 'proporcionado' : 'MongoDB',
            liquidacion
        });
    } catch (error) {
        console.error('Error al calcular nómina desde MongoDB:', error);
        res.status(500).json({
            error: 'Error interno al calcular la nómina desde MongoDB.',
            detalle: error.message
        });
    }
};

// -------------------------------------------------------------
// Controlador: Calcular nómina masiva desde MongoDB (todos los empleados del periodo)
// -------------------------------------------------------------
exports.calcularNominaMasivaDesdeMongoTurnos = async (req, res) => {
    const { mes, anio, fechaInicio, fechaFin, salarios } = req.body;

    // Validar que tenga alguna forma de especificar el periodo
    if ((!fechaInicio || !fechaFin) && (!mes || !anio)) {
        return res.status(400).json({
            error: 'Se requiere especificar el periodo con fechaInicio/fechaFin o mes/anio. El campo salarios es opcional.'
        });
    }

    try {
        let turnos;

        // Opción 1: Buscar por rango de fechas específico
        if (fechaInicio && fechaFin) {
            turnos = await buscarTurnosPorRango(fechaInicio, fechaFin, req.empresaId);

            if (turnos.length === 0) {
                return res.status(404).json({
                    error: `No se encontraron turnos para el periodo ${fechaInicio} - ${fechaFin}.`
                });
            }
        }
        // Opción 2: Buscar por mes/año (retrocompatibilidad)
        else {
            turnos = await buscarTurnosPorPeriodo(mes, anio, req.empresaId);

            if (turnos.length === 0) {
                return res.status(404).json({
                    error: `No se encontraron turnos para el periodo ${mes}/${anio}.`
                });
            }
        }

        const resultados = [];
        const errores = [];

        for (const turno of turnos) {
            try {
                // Determinar el salario
                let salarioFinal = null;

                // 1. Buscar en el array de salarios proporcionado
                if (salarios && Array.isArray(salarios)) {
                    const infoSalario = salarios.find(s => s.documento === turno.documentoEmpleado);
                    if (infoSalario) {
                        salarioFinal = infoSalario.salarioBasico;
                    }
                }

                // 2. Si no se proporcionó, usar el del documento de MongoDB
                if (!salarioFinal) {
                    salarioFinal = turno.salario || turno.salarioBasico || turno.salarioMensual;
                }

                // 3. Si aún no hay salario, reportar error
                if (!salarioFinal) {
                    errores.push({
                        documento: turno.documentoEmpleado,
                        nombre: turno.nombreEmpleado,
                        error: 'Salario no encontrado en MongoDB ni proporcionado'
                    });
                    continue;
                }

                // Filtrar el cronograma si se especificó un rango de fechas
                let turnoFiltrado = turno;
                if (fechaInicio && fechaFin) {
                    turnoFiltrado = { ...turno };
                    const inicio = new Date(fechaInicio);
                    const fin = new Date(fechaFin);
                    
                    // Filtrar según la estructura disponible
                    if (turno.historialTurnos) {
                        // Filtrar historialTurnos y sus cronogramas internos
                        turnoFiltrado.historialTurnos = turno.historialTurnos
                            .filter(historial => {
                                const fechaHistInicio = new Date(historial.fechaInicio);
                                const fechaHistFin = new Date(historial.fechaFin);
                                return fechaHistInicio <= fin && fechaHistFin >= inicio;
                            })
                            .map(historial => {
                                if (historial.cronogramaDetallado) {
                                    return {
                                        ...historial,
                                        cronogramaDetallado: historial.cronogramaDetallado.filter(dia => {
                                            const fechaDia = new Date(dia.fecha);
                                            return fechaDia >= inicio && fechaDia <= fin;
                                        })
                                    };
                                }
                                return historial;
                            });
                    } else if (turno.cronogramaDetallado) {
                        turnoFiltrado.cronogramaDetallado = turno.cronogramaDetallado.filter(dia => {
                            const fechaDia = new Date(dia.fecha);
                            return fechaDia >= inicio && fechaDia <= fin;
                        });
                    }

                    turnoFiltrado.fechaInicio = fechaInicio;
                    turnoFiltrado.fechaFin = fechaFin;
                }

                const liquidacion = calcularNominaDesdeMongoTurnos(turnoFiltrado, salarioFinal);
                
                // Aplanar la estructura para el frontend
                const empleadoFormateado = {
                    documento: liquidacion.empleado?.documento || turno.documentoEmpleado,
                    nombre: liquidacion.empleado?.nombre || turno.nombreEmpleado,
                    area: liquidacion.empleado?.area || turno.area,
                    salarioBasico: liquidacion.salarioBasico,
                    auxilioTransporte: liquidacion.auxilioTransporte || 0,
                    diasTrabajados: liquidacion.periodo?.diasTrabajados || 0,
                    horasTotalesLaboradas: liquidacion.horas?.horasTotalesLaboradas || (liquidacion.periodo?.diasTrabajados * 8) || 0,
                    horasNormales: liquidacion.horas?.horasNormales || 0,
                    recargoNocturno: liquidacion.horas?.recargoNocturno || 0,
                    recargoDominical: liquidacion.horas?.recargoDominical || 0,
                    recargoFestivo: liquidacion.horas?.recargoFestivo || 0,
                    horasExtraDiurnas: liquidacion.horas?.horasExtraDiurnas || 0,
                    horasExtraNocturnas: liquidacion.horas?.horasExtraNocturnas || 0,
                    valorRecargoNocturno: liquidacion.valores?.valorRecargoNocturno || 0,
                    valorRecargoDominical: liquidacion.valores?.valorRecargoDominical || 0,
                    valorRecargoFestivo: liquidacion.valores?.valorRecargoFestivo || 0,
                    valorHEDiurna: liquidacion.valores?.valorHEDiurna || 0,
                    valorHENocturna: liquidacion.valores?.valorHENocturna || 0,
                    valorHEDF: liquidacion.valores?.valorHEDF || 0,
                    totalDevengado: liquidacion.totalDevengado || 0,
                    deduccionSalud: liquidacion.deducciones?.salud || 0,
                    deduccionPension: liquidacion.deducciones?.pension || 0,
                    totalDeducciones: liquidacion.totalDeducciones || 0,
                    totalNeto: liquidacion.totalNeto || 0
                };
                
                resultados.push(empleadoFormateado);
            } catch (error) {
                errores.push({
                    documento: turno.documentoEmpleado,
                    nombre: turno.nombreEmpleado,
                    error: error.message
                });
            }
        }

        res.json({
            ok: true,
            mensaje: 'Cálculo masivo completado',
            periodoCalculado: fechaInicio && fechaFin ? `${fechaInicio} - ${fechaFin}` : `${mes}/${anio}`,
            totalProcesados: resultados.length,
            totalErrores: errores.length,
            resultados,
            errores
        });
    } catch (error) {
        console.error('Error al calcular nómina masiva desde MongoDB:', error);
        res.status(500).json({
            error: 'Error interno al calcular la nómina masiva desde MongoDB.',
            detalle: error.message
        });
    }
};

// -------------------------------------------------------------
// Controlador: Calcular nómina por área específica
// -------------------------------------------------------------
exports.calcularNominaPorArea = async (req, res) => {
    const { area, fechaInicio, fechaFin } = req.body;

    if (!area) {
        return res.status(400).json({
            error: 'Se requiere especificar el área.'
        });
    }

    if (!fechaInicio || !fechaFin) {
        return res.status(400).json({
            error: 'Se requiere especificar el periodo con fechaInicio y fechaFin.'
        });
    }

    try {
        const turnos = await buscarTurnosPorAreaYRango(area, fechaInicio, fechaFin, req.empresaId);

        if (turnos.length === 0) {
            return res.status(404).json({
                error: `No se encontraron turnos para el área "${area}" en el periodo ${fechaInicio} - ${fechaFin}.`
            });
        }

        const resultados = [];
        const errores = [];
        let totalDevengadoArea = 0;

        for (const turno of turnos) {
            try {
                // Obtener salario del turno
                const salarioFinal = turno.salario || turno.salarioBasico || turno.salarioMensual;

                if (!salarioFinal) {
                    errores.push({
                        documento: turno.documentoEmpleado,
                        nombre: turno.nombreEmpleado,
                        error: 'Salario no encontrado en MongoDB'
                    });
                    continue;
                }

                // Filtrar cronograma por rango de fechas
                const turnoFiltrado = { ...turno };
                const inicio = new Date(fechaInicio);
                const fin = new Date(fechaFin);
                
                // Filtrar según la estructura disponible (historialTurnos o cronogramaDetallado)
                if (turno.historialTurnos) {
                    // Filtrar historialTurnos y sus cronogramas internos
                    turnoFiltrado.historialTurnos = turno.historialTurnos
                        .filter(historial => {
                            const fechaHistInicio = new Date(historial.fechaInicio);
                            const fechaHistFin = new Date(historial.fechaFin);
                            return fechaHistInicio <= fin && fechaHistFin >= inicio;
                        })
                        .map(historial => {
                            if (historial.cronogramaDetallado) {
                                return {
                                    ...historial,
                                    cronogramaDetallado: historial.cronogramaDetallado.filter(dia => {
                                        const fechaDia = new Date(dia.fecha);
                                        return fechaDia >= inicio && fechaDia <= fin;
                                    })
                                };
                            }
                            return historial;
                        });
                } else if (turno.cronogramaDetallado) {
                    turnoFiltrado.cronogramaDetallado = turno.cronogramaDetallado.filter(dia => {
                        const fechaDia = new Date(dia.fecha);
                        return fechaDia >= inicio && fechaDia <= fin;
                    });
                }

                turnoFiltrado.fechaInicio = fechaInicio;
                turnoFiltrado.fechaFin = fechaFin;

                const liquidacion = calcularNominaDesdeMongoTurnos(turnoFiltrado, salarioFinal);
                
                // Aplanar la estructura para el frontend
                const empleadoFormateado = {
                    documento: liquidacion.empleado?.documento || turno.documentoEmpleado,
                    nombre: liquidacion.empleado?.nombre || turno.nombreEmpleado,
                    area: liquidacion.empleado?.area || turno.area,
                    salarioBasico: liquidacion.salarioBasico,
                    salarioBaseDevengado: liquidacion.salarioBaseDevengado || 0,
                    auxilioTransporte: liquidacion.auxilioTransporte || 0,
                    diasTrabajados: liquidacion.periodo?.diasTrabajados || 0,
                    horasTotalesLaboradas: liquidacion.horas?.horasTotalesLaboradas || (liquidacion.periodo?.diasTrabajados * 8) || 0,
                    horasNormales: liquidacion.horas?.horasNormales || 0,
                    recargoNocturno: liquidacion.horas?.recargoNocturno || 0,
                    recargoDominical: liquidacion.horas?.recargoDominical || 0,
                    recargoFestivo: liquidacion.horas?.recargoFestivo || 0,
                    recargoNocturnoDominical: liquidacion.horas?.recargoNocturnoDominical || 0,
                    horasExtraDiurnas: liquidacion.horas?.horasExtraDiurnas || 0,
                    horasExtraNocturnas: liquidacion.horas?.horasExtraNocturnas || 0,
                    horasExtraDominicalesDiurnas: liquidacion.horas?.horasExtraDominicalesDiurnas || 0,
                    horasExtraDominicalesNocturnas: liquidacion.horas?.horasExtraDominicalesNocturnas || 0,
                    valorRecargoNocturno: liquidacion.valores?.valorRecargoNocturno || 0,
                    valorRecargoDominical: liquidacion.valores?.valorRecargoDominical || 0,
                    valorRecargoFestivo: liquidacion.valores?.valorRecargoFestivo || 0,
                    valorRecargoNocturnoDominical: liquidacion.valores?.valorRecargoNocturnoDominical || 0,
                    valorHEDiurna: liquidacion.valores?.valorHEDiurna || 0,
                    valorHENocturna: liquidacion.valores?.valorHENocturna || 0,
                    valorHEDominicalesDiurnas: liquidacion.valores?.valorHEDominicalesDiurnas || 0,
                    valorHEDominicalesNocturnas: liquidacion.valores?.valorHEDominicalesNocturnas || 0,
                    valorHEDF: liquidacion.valores?.valorHEDF || 0,
                    totalDevengado: liquidacion.totalDevengado || 0,
                    deduccionSalud: liquidacion.deducciones?.salud || 0,
                    deduccionPension: liquidacion.deducciones?.pension || 0,
                    totalDeducciones: liquidacion.totalDeducciones || 0,
                    totalNeto: liquidacion.totalNeto || 0
                };
                
                totalDevengadoArea += empleadoFormateado.totalDevengado;
                resultados.push(empleadoFormateado);
            } catch (error) {
                errores.push({
                    documento: turno.documentoEmpleado,
                    nombre: turno.nombreEmpleado,
                    error: error.message
                });
            }
        }

        res.json({
            ok: true,
            mensaje: `Cálculo de nómina completado para el área "${area}"`,
            area: area,
            periodoCalculado: `${fechaInicio} - ${fechaFin}`,
            totalEmpleados: resultados.length,
            totalErrores: errores.length,
            totalDevengadoArea: totalDevengadoArea,
            resultados,
            errores
        });
    } catch (error) {
        console.error('Error al calcular nómina por área:', error);
        res.status(500).json({
            error: 'Error interno al calcular la nómina por área.',
            detalle: error.message
        });
    }
};

// -------------------------------------------------------------
// Controlador: Calcular nómina de todas las áreas agrupadas
// -------------------------------------------------------------
exports.calcularNominaPorTodasLasAreas = async (req, res) => {
    const { fechaInicio, fechaFin } = req.body;

    if (!fechaInicio || !fechaFin) {
        return res.status(400).json({
            error: 'Se requiere especificar el periodo con fechaInicio y fechaFin.'
        });
    }

    try {
        const turnosPorArea = await buscarTurnosAgrupadosPorArea(fechaInicio, fechaFin, req.empresaId);

        const areas = Object.keys(turnosPorArea);

        if (areas.length === 0) {
            return res.status(404).json({
                error: `No se encontraron turnos para el periodo ${fechaInicio} - ${fechaFin}.`
            });
        }

        const resultadosPorArea = [];
        let totalGeneralDevengado = 0;
        let totalGeneralEmpleados = 0;

        for (const area of areas) {
            const turnos = turnosPorArea[area];
            const resultados = [];
            const errores = [];
            let totalDevengadoArea = 0;

            for (const turno of turnos) {
                try {
                    // Obtener salario del turno
                    const salarioFinal = turno.salario || turno.salarioBasico || turno.salarioMensual;

                    if (!salarioFinal) {
                        errores.push({
                            documento: turno.documentoEmpleado,
                            nombre: turno.nombreEmpleado,
                            error: 'Salario no encontrado en MongoDB'
                        });
                        continue;
                    }

                    // Filtrar cronograma por rango de fechas
                    const turnoFiltrado = { ...turno };
                    const inicio = new Date(fechaInicio);
                    const fin = new Date(fechaFin);
                    
                    // Filtrar según la estructura disponible
                    if (turno.historialTurnos) {
                        // Filtrar historialTurnos y sus cronogramas internos
                        turnoFiltrado.historialTurnos = turno.historialTurnos
                            .filter(historial => {
                                const fechaHistInicio = new Date(historial.fechaInicio);
                                const fechaHistFin = new Date(historial.fechaFin);
                                return fechaHistInicio <= fin && fechaHistFin >= inicio;
                            })
                            .map(historial => {
                                if (historial.cronogramaDetallado) {
                                    return {
                                        ...historial,
                                        cronogramaDetallado: historial.cronogramaDetallado.filter(dia => {
                                            const fechaDia = new Date(dia.fecha);
                                            return fechaDia >= inicio && fechaDia <= fin;
                                        })
                                    };
                                }
                                return historial;
                            });
                    } else if (turno.cronogramaDetallado) {
                        turnoFiltrado.cronogramaDetallado = turno.cronogramaDetallado.filter(dia => {
                            const fechaDia = new Date(dia.fecha);
                            return fechaDia >= inicio && fechaDia <= fin;
                        });
                    }

                    turnoFiltrado.fechaInicio = fechaInicio;
                    turnoFiltrado.fechaFin = fechaFin;

                    const liquidacion = calcularNominaDesdeMongoTurnos(turnoFiltrado, salarioFinal);
                    
                    // Aplanar la estructura para el frontend
                    const empleadoFormateado = {
                        documento: liquidacion.empleado?.documento || turno.documentoEmpleado,
                        nombre: liquidacion.empleado?.nombre || turno.nombreEmpleado,
                        area: liquidacion.empleado?.area || turno.area,
                        salarioBasico: liquidacion.salarioBasico,
                        salarioBaseDevengado: liquidacion.salarioBaseDevengado || 0,
                        auxilioTransporte: liquidacion.auxilioTransporte || 0,
                        diasTrabajados: liquidacion.periodo?.diasTrabajados || 0,
                        horasTotalesLaboradas: liquidacion.horas?.horasTotalesLaboradas || (liquidacion.periodo?.diasTrabajados * 8) || 0,
                        horasNormales: liquidacion.horas?.horasNormales || 0,
                        recargoNocturno: liquidacion.horas?.recargoNocturno || 0,
                        recargoDominical: liquidacion.horas?.recargoDominical || 0,
                        recargoFestivo: liquidacion.horas?.recargoFestivo || 0,
                        horasExtraDiurnas: liquidacion.horas?.horasExtraDiurnas || 0,
                        horasExtraNocturnas: liquidacion.horas?.horasExtraNocturnas || 0,
                        valorRecargoNocturno: liquidacion.valores?.valorRecargoNocturno || 0,
                        valorRecargoDominical: liquidacion.valores?.valorRecargoDominical || 0,
                        valorRecargoFestivo: liquidacion.valores?.valorRecargoFestivo || 0,
                        valorHEDiurna: liquidacion.valores?.valorHEDiurna || 0,
                        valorHENocturna: liquidacion.valores?.valorHENocturna || 0,
                        valorHEDF: liquidacion.valores?.valorHEDF || 0,
                        totalDevengado: liquidacion.totalDevengado || 0,
                        deduccionSalud: liquidacion.deducciones?.salud || 0,
                        deduccionPension: liquidacion.deducciones?.pension || 0,
                        totalDeducciones: liquidacion.totalDeducciones || 0,
                        totalNeto: liquidacion.totalNeto || 0
                    };
                    
                    totalDevengadoArea += empleadoFormateado.totalDevengado;
                    resultados.push(empleadoFormateado);
                } catch (error) {
                    errores.push({
                        documento: turno.documentoEmpleado,
                        nombre: turno.nombreEmpleado,
                        error: error.message
                    });
                }
            }

            totalGeneralDevengado += totalDevengadoArea;
            totalGeneralEmpleados += resultados.length;

            resultadosPorArea.push({
                area: area,
                totalEmpleados: resultados.length,
                totalErrores: errores.length,
                totalDevengadoArea: totalDevengadoArea,
                empleados: resultados,
                errores: errores
            });
        }

        res.json({
            ok: true,
            mensaje: 'Cálculo de nómina completado para todas las áreas',
            periodoCalculado: `${fechaInicio} - ${fechaFin}`,
            totalAreas: areas.length,
            totalEmpleados: totalGeneralEmpleados,
            totalDevengadoGeneral: totalGeneralDevengado,
            areas: resultadosPorArea
        });
    } catch (error) {
        console.error('Error al calcular nómina por todas las áreas:', error);
        res.status(500).json({
            error: 'Error interno al calcular la nómina por áreas.',
            detalle: error.message
        });
    }
};

// -------------------------------------------------------------
// Controlador: Obtener áreas disponibles
// -------------------------------------------------------------
exports.obtenerAreas = async (req, res) => {
    try {
        const areas = await obtenerAreasDisponibles();

        res.json({
            ok: true,
            totalAreas: areas.length,
            areas: areas
        });
    } catch (error) {
        console.error('Error al obtener áreas:', error);
        res.status(500).json({
            error: 'Error interno al obtener las áreas.',
            detalle: error.message
        });
    }
};

// -------------------------------------------------------------
// Exportación final
// -------------------------------------------------------------
module.exports = {
    importarCSV: exports.importarCSV,
    calcularNomina: exports.calcularNomina,
    calcularNominaDesdeMongoTurnos: exports.calcularNominaDesdeMongoTurnos,
    calcularNominaMasivaDesdeMongoTurnos: exports.calcularNominaMasivaDesdeMongoTurnos,
    calcularNominaPorArea: exports.calcularNominaPorArea,
    calcularNominaPorTodasLasAreas: exports.calcularNominaPorTodasLasAreas,
    obtenerAreas: exports.obtenerAreas
};