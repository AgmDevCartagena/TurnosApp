import { useState } from 'react'

function CalculoIndividual() {
  const [formData, setFormData] = useState({
    documento: '',
    fechaInicio: '',
    fechaFin: ''
  })
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
    setResultado(null)

    try {
      const response = await fetch('/api/nomina/calcular', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al calcular la nómina')
      }

      setResultado(data)
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

  return (
    <div>
      <div className="form-section">
        <h3>Calcular Nómina Individual</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="documento">Documento del Empleado *</label>
              <input
                type="text"
                id="documento"
                name="documento"
                value={formData.documento}
                onChange={handleChange}
                placeholder="Ej: 12345678"
                required
              />
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
            {loading ? 'Calculando...' : '📊 Calcular Nómina'}
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
          Calculando nómina...
        </div>
      )}

      {resultado && (
        <div className="results-section">
          <div className="alert alert-success">
            <strong>✅ Cálculo completado exitosamente</strong>
          </div>

          <div className="form-section">
            <h3>Información del Empleado</h3>
            <table>
              <tbody>
                <tr>
                  <th>Nombre:</th>
                  <td>{resultado.empleado?.nombre}</td>
                </tr>
                <tr>
                  <th>Documento:</th>
                  <td>{resultado.empleado?.documento}</td>
                </tr>
                <tr>
                  <th>Área:</th>
                  <td>{resultado.empleado?.area}</td>
                </tr>
                <tr>
                  <th>Cargo:</th>
                  <td>{resultado.empleado?.cargo}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="form-section">
            <h3>Detalles de la Nómina</h3>
            <table>
              <tbody>
                <tr>
                  <th>Período:</th>
                  <td>{resultado.periodo?.inicio} - {resultado.periodo?.fin}</td>
                </tr>
                <tr>
                  <th>Días Laborados:</th>
                  <td>{resultado.diasLaborados}</td>
                </tr>
                <tr>
                  <th>Horas Trabajadas:</th>
                  <td>{resultado.horasTrabajadas} horas</td>
                </tr>
                <tr>
                  <th>Horas Extras:</th>
                  <td>{resultado.horasExtras || 0} horas</td>
                </tr>
                <tr>
                  <th>Días Festivos:</th>
                  <td>{resultado.diasFestivos || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="form-section">
            <h3>💰 Resumen Financiero</h3>
            <table>
              <tbody>
                <tr>
                  <th>Salario Base:</th>
                  <td>{formatCurrency(resultado.salarioBase || 0)}</td>
                </tr>
                <tr>
                  <th>Horas Extras:</th>
                  <td>{formatCurrency(resultado.valorHorasExtras || 0)}</td>
                </tr>
                <tr>
                  <th>Recargo Nocturno:</th>
                  <td>{formatCurrency(resultado.recargoNocturno || 0)}</td>
                </tr>
                <tr>
                  <th>Recargo Festivos:</th>
                  <td>{formatCurrency(resultado.recargoFestivos || 0)}</td>
                </tr>
                <tr>
                  <th>Recargo Dominical:</th>
                  <td>{formatCurrency(resultado.recargoDominical || 0)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #667eea', fontWeight: 'bold' }}>
                  <th>TOTAL A PAGAR:</th>
                  <td style={{ color: '#667eea', fontSize: '1.2rem' }}>
                    {formatCurrency(resultado.totalPagar || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalculoIndividual
