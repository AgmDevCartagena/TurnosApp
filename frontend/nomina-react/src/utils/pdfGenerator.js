// ===============================================
// Generador de Desprendible de Nómina en PDF
// Usa jsPDF y html2canvas para generar PDFs
// ===============================================

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Formatea un valor numérico como moneda colombiana
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
 * Genera un desprendible de nómina en PDF para un empleado
 * @param {Object} empleado - Datos del empleado
 */
export async function generarDesprendiblePDF(empleado) {
    // Crear contenedor temporal para el desprendible
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm'; // A4 width
    container.style.padding = '20mm';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = 'Arial, sans-serif';

    const fechaActual = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    container.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; position: relative; background: #f8f9fa;">
            <!-- Marca de agua -->
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; z-index: 0; font-size: 150px; font-weight: bold; color: #1e3a5f; white-space: nowrap;">
                PEREIRA<br/>Avanza
            </div>
            
            <div style="position: relative; z-index: 1; background: white; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
                <!-- Encabezado con logo -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1e3a5f;">
                    <div style="flex: 1;">
                        <h1 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 32px; font-weight: bold;">Desprendible de<br/>Nomina</h1>
                    </div>
                    <div style="text-align: right;">
                        <img src="/nomina-build/assets/logo.jpg" alt="Logo" style="height: 80px; margin-bottom: 10px;" onerror="this.style.display='none'" />
                        <p style="margin: 5px 0; font-weight: bold; color: #1e3a5f;">Fecha:</p>
                        <p style="margin: 0; color: #666;">${fechaActual}</p>
                    </div>
                </div>

                <!-- Información del Empleado - Layout de 2 columnas -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                    <div>
                        <p style="margin: 8px 0;"><strong>Nombre:</strong></p>
                        <p style="margin: 8px 0;">${empleado.nombre || 'N/A'}</p>
                        <p style="margin: 8px 0;"><strong>Documento:</strong></p>
                        <p style="margin: 8px 0;">${empleado.documento || 'N/A'}</p>
                        <p style="margin: 8px 0;"><strong>Salario Base (30 días):</strong></p>
                        <p style="margin: 8px 0; color: #1e3a5f; font-weight: bold;">${formatCurrency(empleado.salarioBasico || 0)}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 8px 0;"><strong>Cargo:</strong></p>
                        <p style="margin: 8px 0;">${empleado.area || 'N/A'}</p>
                        <p style="margin: 8px 0;"><strong>Días trabajados:</strong></p>
                        <p style="margin: 8px 0;">${empleado.diasTrabajados || 0} días</p>
                        <p style="margin: 8px 0;"><strong>Salario Devengado (${empleado.diasTrabajados || 0} días):</strong></p>
                        <p style="margin: 8px 0; color: #2d7a3e; font-weight: bold;">${formatCurrency(empleado.salarioBaseDevengado || 0)}</p>
                    </div>
                </div>

                <!-- Sección de Devengado y Deducciones -->
                <div style="margin-bottom: 25px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0;">
                        <!-- Columna Izquierda - Conceptos de Devengado -->
                        <div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #2d7a3e;">Salario Básico (${empleado.diasTrabajados || 0} días):</strong>
                                <span style="margin-left: 20px;">${formatCurrency(empleado.salarioBaseDevengado || 0)}</span>
                            </div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #2d7a3e;">Recargo Nocturno:</strong>
                                <span style="margin-left: 20px;">${formatCurrency(empleado.valorRecargoNocturno || 0)}</span>
                            </div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #2d7a3e;">Recargo Dominical:</strong>
                                <span style="margin-left: 20px;">${formatCurrency(empleado.valorRecargoDominical || 0)}</span>
                            </div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #2d7a3e;">Recargo Festivo Compensatorio:</strong>
                                <span style="margin-left: 20px;">${formatCurrency(empleado.valorRecargoFestivo || 0)}</span>
                            </div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #2d7a3e;">Hora Extra:</strong>
                                <span style="margin-left: 20px;">${formatCurrency(empleado.valorHEDiurna || 0)}</span>
                            </div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #2d7a3e;">Hora Extra Nocturno:</strong>
                                <span style="margin-left: 20px;">${formatCurrency(empleado.valorHENocturna || 0)}</span>
                            </div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #2d7a3e;">Hora Extra Dominical:</strong>
                                <span style="margin-left: 20px;">${formatCurrency(empleado.valorHEDF || 0)}</span>
                            </div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #2d7a3e;">Hora Extra Nocturna Dominical:</strong>
                                <span style="margin-left: 20px;">${formatCurrency(0)}</span>
                            </div>
                        </div>
                        
                        <!-- Columna Derecha - Deducciones y Beneficios -->
                        <div style="border-left: 2px solid #e0e0e0;">
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #d32f2f;">Salud:</strong>
                                <span style="margin-left: 20px;">${formatCurrency(empleado.deduccionSalud || 0)}</span>
                            </div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #d32f2f;">Pensión:</strong>
                                <span style="margin-left: 20px;">${formatCurrency(empleado.deduccionPension || 0)}</span>
                            </div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #2d7a3e;">Aux. Transporte:</strong>
                                <span style="margin-left: 20px;">${formatCurrency(empleado.auxilioTransporte || 0)}</span>
                            </div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
                                
                            </div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
                                
                            </div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
                                
                            </div>
                            <div style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
                                
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Total -->
                <div style="background: linear-gradient(135deg, #4db870 0%, #3a9d5d 100%); color: white; padding: 25px; border-radius: 15px; text-align: center; margin-top: 30px; box-shadow: 0 4px 15px rgba(77, 184, 112, 0.3);">
                    <h2 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">TOTAL:</h2>
                    <p style="margin: 0; font-size: 42px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">${formatCurrency(empleado.totalNeto || empleado.totalDevengado || 0)}</p>
                </div>

                <!-- Pie de página -->
                <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; color: #666; font-size: 11px;">
                    <p style="margin: 5px 0;">Este desprendible es un documento informativo del periodo calculado.</p>
                    <p style="margin: 5px 0;">Generado automáticamente el ${fechaActual}</p>
                    <p style="margin: 5px 0; font-style: italic; color: #1e3a5f; font-weight: bold;">Sistema de Nómina - UT Pereira Avanza</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    try {
        // Usar html2canvas para capturar el contenido
        const canvas = await html2canvas(container, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
        });

        // Crear PDF usando jsPDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Si el contenido es más largo que una página, agregar páginas adicionales
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        // Descargar el PDF
        const nombreArchivo = `Desprendible_${empleado.nombre?.replace(/\s+/g, '_') || 'Empleado'}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(nombreArchivo);

        // Eliminar el contenedor temporal
        document.body.removeChild(container);

        return { success: true, mensaje: 'Desprendible descargado correctamente' };
    } catch (error) {
        console.error('Error al generar PDF:', error);
        document.body.removeChild(container);
        throw new Error('Error al generar el desprendible PDF');
    }
}
