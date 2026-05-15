/**
 * Utilidad para exportar nómina completa a Excel
 * Usa SheetJS (xlsx library) para generar archivos Excel
 */

/**
 * Exporta la nómina completa de un área a Excel
 * @param {Object} resultados - Resultados del cálculo de nómina
 * @param {string} area - Nombre del área
 * @param {string} periodo - Período de la nómina
 */
export function exportarNominaExcel(resultados, area, periodo) {
    try {
        // Crear los datos para la hoja de cálculo
        const data = [];

        // Encabezado
        data.push([`NÓMINA DE ${area}`.toUpperCase()]);
        data.push([`Período: ${periodo}`]);
        data.push([`Total Empleados: ${resultados.totalEmpleados || 0}`]);
        data.push([`Total a Pagar: ${formatCurrency(resultados.totalDevengadoArea || 0)}`]);
        data.push([]); // Fila vacía

        // Encabezados de columnas
        data.push([
            'Nombre',
            'Documento',
            'Cargo',
            'Días Lab.',
            'Horas',
            'Salario Base',
            'H. Extras Diurnas',
            'H. Extras Nocturnas',
            'Rec. Nocturno',
            'Rec. Dominical',
            'Rec. Festivo',
            'Total Devengado',
            'Ded. Salud',
            'Ded. Pensión',
            'Total Deducciones',
            'NETO A PAGAR'
        ]);

        // Datos de empleados
        if (resultados.resultados && Array.isArray(resultados.resultados)) {
            resultados.resultados.forEach(emp => {
                data.push([
                    emp.nombre || '',
                    emp.documento || '',
                    emp.area || '',
                    emp.diasTrabajados || 0,
                    emp.horasNormales || 0,
                    emp.salarioBaseDevengado || 0,
                    emp.valorHEDiurna || 0,
                    emp.valorHENocturna || 0,
                    emp.valorRecargoNocturno || 0,
                    emp.valorRecargoDominical || 0,
                    emp.valorRecargoFestivo || 0,
                    emp.totalDevengado || 0,
                    emp.deduccionSalud || 0,
                    emp.deduccionPension || 0,
                    emp.totalDeducciones || 0,
                    emp.totalNeto || 0
                ]);
            });
        }

        // Totales
        data.push([]);
        data.push([
            'TOTAL ÁREA',
            '', '', '', '', '', '', '', '', '', '', '', '', '', '',
            resultados.totalDevengadoArea || 0
        ]);

        // Convertir a CSV (simple implementation)
        const csv = data.map(row =>
            row.map(cell => {
                // Escapar comillas y manejar números
                if (typeof cell === 'string') {
                    return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',')
        ).join('\n');

        // Crear el archivo y descargarlo
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const nombreArchivo = `Nomina_${area.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', nombreArchivo);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return { success: true, mensaje: 'Excel descargado correctamente' };
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        throw new Error('Error al generar el archivo Excel');
    }
}

/**
 * Formatea un valor como moneda colombiana
 */
function formatCurrency(value) {
    if (!value && value !== 0) return '$0';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}
