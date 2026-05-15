/**
 * Utilidad para exportar tabla completa de nómina a PDF
 * Usa jsPDF y jspdf-autotable para generar tablas en PDF
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

/**
 * Exporta la nómina completa de un área a PDF
 * @param {Object} resultados - Resultados del cálculo de nómina
 * @param {string} area - Nombre del área
 * @param {string} periodo - Período de la nómina
 */
export function exportarNominaPDF(resultados, area, periodo) {
    try {
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const fechaActual = new Date().toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Título
        pdf.setFontSize(18);
        pdf.setTextColor(30, 58, 95); // Color azul oscuro
        pdf.text(`NÓMINA DE ${area.toUpperCase()}`, 14, 20);

        // Información del período
        pdf.setFontSize(11);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`Período: ${periodo}`, 14, 28);
        pdf.text(`Total Empleados: ${resultados.totalEmpleados || 0}`, 14, 34);
        pdf.text(`Total a Pagar: ${formatCurrency(resultados.totalDevengadoArea || 0)}`, 14, 40);
        pdf.text(`Generado: ${fechaActual}`, 200, 28);

        // Preparar datos de la tabla
        const tableData = [];

        if (resultados.resultados && Array.isArray(resultados.resultados)) {
            resultados.resultados.forEach(emp => {
                tableData.push([
                    emp.nombre || '',
                    emp.documento || '',
                    emp.diasTrabajados || 0,
                    formatCurrency(emp.salarioBaseDevengado || 0),
                    formatCurrency((emp.valorHEDiurna || 0) + (emp.valorHENocturna || 0)),
                    formatCurrency((emp.valorRecargoNocturno || 0) + (emp.valorRecargoDominical || 0) + (emp.valorRecargoFestivo || 0)),
                    formatCurrency(emp.totalDevengado || 0),
                    formatCurrency(emp.totalDeducciones || 0),
                    formatCurrency(emp.totalNeto || 0)
                ]);
            });
        }

        // Agregar fila de totales
        tableData.push([
            { content: 'TOTAL ÁREA', colSpan: 8, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: formatCurrency(resultados.totalDevengadoArea || 0), styles: { fontStyle: 'bold', fillColor: [102, 126, 234], textColor: 255 } }
        ]);

        // Generar tabla con autoTable
        pdf.autoTable({
            startY: 48,
            head: [[
                'Nombre',
                'Documento',
                'Días',
                'Salario Base',
                'H. Extras',
                'Recargos',
                'Total Dev.',
                'Deducciones',
                'NETO'
            ]],
            body: tableData,
            styles: {
                fontSize: 8,
                cellPadding: 2
            },
            headStyles: {
                fillColor: [102, 126, 234],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 45 }, // Nombre
                1: { cellWidth: 25 }, // Documento
                2: { halign: 'center', cellWidth: 15 }, // Días
                3: { halign: 'right', cellWidth: 25 }, // Salario Base
                4: { halign: 'right', cellWidth: 22 }, // H. Extras
                5: { halign: 'right', cellWidth: 22 }, // Recargos
                6: { halign: 'right', cellWidth: 25 }, // Total Dev.
                7: { halign: 'right', cellWidth: 22 }, // Deducciones
                8: { halign: 'right', cellWidth: 28, fontStyle: 'bold' } // NETO
            },
            alternateRowStyles: {
                fillColor: [245, 247, 250]
            },
            margin: { top: 48, left: 14, right: 14 }
        });

        // Pie de página
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(
                `Sistema de Nómina - UT Pereira Avanza | Página ${i} de ${pageCount}`,
                pdf.internal.pageSize.getWidth() / 2,
                pdf.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }

        // Descargar el PDF
        const nombreArchivo = `Nomina_${area.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(nombreArchivo);

        return { success: true, mensaje: 'PDF descargado correctamente' };
    } catch (error) {
        console.error('Error al exportar a PDF:', error);
        throw new Error('Error al generar el archivo PDF');
    }
}
