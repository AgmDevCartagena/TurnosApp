import { useState, useEffect } from 'react';
import { generarDesprendiblePDF } from '../utils/pdfGenerator';
import { exportarNominaExcel } from '../utils/excelGenerator';
import { exportarNominaPDF } from '../utils/tablePdfGenerator';

function CalculoPorAreas() {
  const [areas, setAreas] = useState([])
  const [formData, setFormData] = useState({
    area: '',
    fechaInicio: '',
    fechaFin: ''
  })
  const [resultados, setResultados] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedRows, setExpandedRows] = useState(new Set())

  useEffect(() => {
    cargarAreas()
  }, [])

  const cargarAreas = async () => {
    try {
      const response = await fetch('/api/nomina/areas')
      const data = await response.json()
      if (response.ok) {
        setAreas(data.areas || [])
      }
    } catch (err) {
      console.error('Error al cargar áreas:', err)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResultados(null)

    try {
      const response = await fetch('/api/nomina/calcular-por-area', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al calcular la nómina por área')
      }

      setResultados(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value)
  }

  const exportarExcel = () => {
    try {
      const periodo = `${formData.fechaInicio} - ${formData.fechaFin}`;
      exportarNominaExcel(resultados, resultados.area, periodo);
      alert('✅ Archivo Excel descargado correctamente');
    } catch (error) {
      alert('❌ Error al exportar a Excel: ' + error.message);
    }
  }

  const exportarPDF = () => {
    try {
      const periodo = `${formData.fechaInicio} - ${formData.fechaFin}`;
      exportarNominaPDF(resultados, resultados.area, periodo);
      alert('✅ Archivo PDF descargado correctamente');
    } catch (error) {
      alert('❌ Error al exportar a PDF: ' + error.message);
    }
  }

  const toggleRow = (index) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  const descargarDesprendible = async (empleado) => {
    try {
      await generarDesprendiblePDF(empleado)
    } catch (error) {
      alert('Error al generar el desprendible. Por favor, intenta nuevamente.')
    }
  }

  return (
    <div>
      <div className="form-section">
        <h3>Calcular Nómina por Área</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="area">Área *</label>
              <select
                id="area"
                name="area"
                value={formData.area}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar área...</option>
                {areas.map((area, index) => (
                  <option key={index} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="fechaInicio">Fecha Inicio *</label>
              <input
                type="date"
                id="fechaInicio"
                name="fechaInicio"
                value={formData.fechaInicio}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="fechaFin">Fecha Fin *</label>
              <input
                type="date"
                id="fechaFin"
                name="fechaFin"
                value={formData.fechaFin}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Calculando...' : '🏢 Calcular Nómina del Área'}
          </button>
        </form>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div className="loading">
          Calculando nómina del área...
        </div>
      )}

      {resultados && (
        <div className="results-section">
          <div className="alert alert-success">
            <strong>✅ Cálculo completado exitosamente</strong>
          </div>

          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Nómina de {resultados.area}</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={exportarExcel}>
                  📊 Exportar Excel
                </button>
                <button className="btn btn-secondary" onClick={exportarPDF}>
                  📄 Exportar PDF
                </button>
              </div>
            </div>

            <div className="alert alert-info">
              <strong>📅 Período:</strong> {resultados.periodoCalculado || '-'}<br />
              <strong>👥 Total Empleados:</strong> {resultados.totalEmpleados || 0}<br />
              <strong>💰 Total a Pagar:</strong> {formatCurrency(resultados.totalDevengadoArea || 0)}
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>Detalle</th>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Cargo</th>
                  <th>Días Lab.</th>
                  <th>Horas</th>
                  <th>Salario Base</th>
                  <th>H. Extras</th>
                  <th>Recargos</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {resultados.resultados?.map((emp, index) => (
                  <>
                    <tr key={index} style={{ cursor: 'pointer' }}>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => toggleRow(index)}
                          style={{
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9em'
                          }}
                        >
                          {expandedRows.has(index) ? '▲' : '▼'}
                        </button>
                      </td>
                      <td>{emp.nombre}</td>
                      <td>{emp.documento}</td>
                      <td>{emp.area}</td>
                      <td>{emp.diasTrabajados}</td>
                      <td>{emp.horasTotalesLaboradas || (emp.diasTrabajados * 8)}</td>
                      <td>{formatCurrency(emp.salarioBaseDevengado || 0)}</td>
                      <td>{formatCurrency((emp.valorHEDiurna || 0) + (emp.valorHENocturna || 0) + (emp.valorHEDF || 0))}</td>
                      <td>{formatCurrency((emp.valorRecargoNocturno || 0) + (emp.valorRecargoDominical || 0) + (emp.valorRecargoFestivo || 0))} <span style={{ color: '#888', fontSize: '0.9em' }}>{emp.valorRecargoFestivo ? `(+Compensatorio)` : ''}</span></td>
                      <td style={{ fontWeight: 'bold', color: '#667eea' }}>
                        {formatCurrency(emp.totalNeto || 0)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => descargarDesprendible(emp)}
                          style={{
                            background: '#48bb78',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9em'
                          }}
                          title="Descargar Desprendible PDF"
                        >
                          📄 PDF
                        </button>
                      </td>
                    </tr>
                    {expandedRows.has(index) && (
                      <tr key={`${index}-detail`}>
                        <td colSpan="11" style={{ backgroundColor: '#f7fafc', padding: '20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                            <div>
                              <strong>💰 Devengado</strong>
                              <div style={{ marginTop: '10px' }}>
                                <div>Salario Base Mensual (30 días): {formatCurrency(emp.salarioBasico || 0)}</div>
                                <div>Salario Básico ({emp.diasTrabajados} días): {formatCurrency(emp.salarioBaseDevengado || 0)}</div>
                                <div>Auxilio Transporte: {formatCurrency(emp.auxilioTransporte || 0)}</div>
                                <div>HE Diurnas: {formatCurrency(emp.valorHEDiurna || 0)}</div>
                                <div>HE Nocturnas: {formatCurrency(emp.valorHENocturna || 0)}</div>
                                <div>HE Dom/Fest Diurnas: {formatCurrency(emp.valorHEDominicalesDiurnas || 0)}</div>                                <div>HE Dom/Fest Nocturnas: {formatCurrency(emp.valorHEDominicalesNocturnas || 0)}</div>
                                <div>Recargo Nocturno: {formatCurrency(emp.valorRecargoNocturno || 0)}</div>
                                <div>Recargo Dominical: {formatCurrency(emp.valorRecargoDominical || 0)}</div>
                                <div>Recargo Festivo sin Compensatorio: {formatCurrency(emp.valorRecargoFestivo || 0)}</div>
                                <div>Recargo Noct. Dominical: {formatCurrency(emp.valorRecargoNocturnoDominical || 0)}</div>
                                <div style={{ borderTop: '1px solid #ccc', marginTop: '5px', paddingTop: '5px', fontWeight: 'bold' }}>
                                  Total Devengado: {formatCurrency(emp.totalDevengado || 0)}
                                </div>
                              </div>
                            </div>
                            <div>
                              <strong>➖ Deducciones</strong>
                              <div style={{ marginTop: '10px' }}>
                                <div>Salud (4%): {formatCurrency(emp.deduccionSalud || 0)}</div>
                                <div>Pensión (4%): {formatCurrency(emp.deduccionPension || 0)}</div>
                                <div style={{ borderTop: '1px solid #ccc', marginTop: '5px', paddingTop: '5px', fontWeight: 'bold' }}>
                                  Total Deducciones: {formatCurrency(emp.totalDeducciones || 0)}
                                </div>
                              </div>
                            </div>
                            <div>
                              <strong>📊 Resumen</strong>
                              <div style={{ marginTop: '10px' }}>
                                <div>Días Trabajados: {emp.diasTrabajados}</div>
                                <div>Horas Normales: {emp.horasTotalesLaboradas || (emp.diasTrabajados * 8)}</div>
                                <div>Recargo Nocturno: {emp.recargoNocturno || 0} hrs</div>
                                <div>Recargo Dominical: {emp.recargoDominical || 0} hrs</div>
                                <div>Recargo Festivo sin Compensatorio: {emp.recargoFestivo || 0} hrs</div>
                                <div>Recargo Noct. Dominical: {emp.recargoNocturnoDominical || 0} hrs</div>
                                <div>HE Diurnas: {emp.horasExtraDiurnas || 0} hrs</div>
                                <div>HE Nocturnas: {emp.horasExtraNocturnas || 0} hrs</div>
                                <div>HE Dom/Fest Diurnas: {emp.horasExtraDominicalesDiurnas || 0} hrs</div>
                                <div>HE Dom/Fest Nocturnas: {emp.horasExtraDominicalesNocturnas || 0} hrs</div>
                                <div style={{ borderTop: '1px solid #ccc', marginTop: '5px', paddingTop: '5px', fontWeight: 'bold', color: '#667eea', fontSize: '1.1em' }}>
                                  NETO A PAGAR: {formatCurrency(emp.totalNeto || 0)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f7fafc', fontWeight: 'bold' }}>
                  <td colSpan="9" style={{ textAlign: 'right' }}>TOTAL ÁREA:</td>
                  <td style={{ color: '#667eea', fontSize: '1.1rem' }}>
                    {formatCurrency(resultados.totalDevengadoArea || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalculoPorAreas
