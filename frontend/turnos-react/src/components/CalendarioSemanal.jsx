import { useState, useEffect } from 'react'

function CalendarioSemanal() {
  const [semana, setSemana] = useState(getCurrentWeek())
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function getCurrentWeek() {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    return monday
  }

  useEffect(() => {
    cargarTurnos()
  }, [semana])

  const cargarTurnos = async () => {
    setLoading(true)
    setError(null)

    try {
      const inicio = formatDate(semana)
      const fin = formatDate(new Date(semana.getTime() + 6 * 24 * 60 * 60 * 1000))

      const response = await fetch(`/api/turnos/semana?inicio=${inicio}&fin=${fin}`)
      const data = await response.json()

      if (response.ok) {
        setTurnos(data)
      } else {
        throw new Error(data.error || 'Error al cargar turnos')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date) => {
    return date.toISOString().split('T')[0]
  }

  const cambiarSemana = (dias) => {
    const nuevaSemana = new Date(semana)
    nuevaSemana.setDate(semana.getDate() + dias)
    setSemana(nuevaSemana)
  }

  const getDiasNombres = () => {
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    return dias.map((dia, index) => {
      const fecha = new Date(semana)
      fecha.setDate(semana.getDate() + index)
      return {
        nombre: dia,
        fecha: formatDate(fecha),
        fechaObj: fecha
      }
    })
  }

  const getTurnosPorDia = (fecha) => {
    return turnos.filter(turno => turno.fecha === fecha)
  }

  return (
    <div>
      <div className="form-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Calendario Semanal</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => cambiarSemana(-7)}>
              ← Semana Anterior
            </button>
            <button className="btn btn-secondary" onClick={() => cambiarSemana(7)}>
              Semana Siguiente →
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">❌ {error}</div>}
        {loading && <div className="loading">Cargando turnos...</div>}

        {!loading && (
          <div className="calendar-container">
            <table className="calendar">
              <thead>
                <tr>
                  {getDiasNombres().map((dia, index) => (
                    <th key={index}>
                      {dia.nombre}<br />
                      <small>{dia.fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {getDiasNombres().map((dia, index) => {
                    const turnosDia = getTurnosPorDia(dia.fecha)
                    return (
                      <td key={index}>
                        {turnosDia.length === 0 ? (
                          <div style={{ color: '#a0aec0', textAlign: 'center', padding: '20px' }}>
                            Sin turnos
                          </div>
                        ) : (
                          turnosDia.map((turno, idx) => (
                            <div key={idx} className="turno-cell">
                              <strong>{turno.empleado?.nombre || 'Sin nombre'}</strong><br />
                              <small>{turno.area || 'Sin área'}</small><br />
                              <small>⏰ {turno.horaInicio} - {turno.horaFin}</small>
                            </div>
                          ))
                        )}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default CalendarioSemanal
