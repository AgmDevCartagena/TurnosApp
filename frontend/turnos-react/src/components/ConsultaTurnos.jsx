import { useState, useEffect } from 'react'

function ConsultaTurnos() {
  const [busqueda, setBusqueda] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [areaFiltro, setAreaFiltro] = useState('')
  const [areas, setAreas] = useState([])
  const [resultados, setResultados] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  
  // Estado para expandir/colapsar empleados
  const [expandidos, setExpandidos] = useState({})
  
  // Estado para edición de turno
  const [turnoEditando, setTurnoEditando] = useState(null)
  const [modalEditar, setModalEditar] = useState(false)
  const [formEditar, setFormEditar] = useState({
    horaInicio: '',
    horaFin: '',
    tipo: '',
    observaciones: ''
  })

  // Cargar áreas al inicio
  useEffect(() => {
    const cargarAreas = async () => {
      try {
        const response = await fetch('/api/turnos/areas')
        const data = await response.json()
        if (data.areas) {
          setAreas(data.areas)
        }
      } catch (err) {
        console.error('Error al cargar áreas:', err)
      }
    }
    cargarAreas()
    
    // Establecer fechas por defecto (mes actual)
    const hoy = new Date()
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    setFechaInicio(primerDia.toISOString().split('T')[0])
    setFechaFin(ultimoDia.toISOString().split('T')[0])
  }, [])

  const handleBuscar = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError(null)
    setMensaje(null)

    try {
      let url = '/api/turnos/consultar?'
      if (busqueda) url += `busqueda=${encodeURIComponent(busqueda)}&`
      if (fechaInicio) url += `inicio=${fechaInicio}&`
      if (fechaFin) url += `fin=${fechaFin}&`
      if (areaFiltro) url += `area=${encodeURIComponent(areaFiltro)}`

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al consultar turnos')
      }

      // Filtrar por área si se seleccionó
      let resultado = data
      if (areaFiltro) {
        resultado = data.filter(t => t.area === areaFiltro || t.empleado?.area === areaFiltro)
      }

      // Agrupar por empleado para mejor visualización
      const empleadosMap = new Map()
      resultado.forEach(turno => {
        const empId = turno.empleado?._id || 'sin-empleado'
        if (!empleadosMap.has(empId)) {
          empleadosMap.set(empId, {
            empleado: turno.empleado,
            turnos: []
          })
        }
        empleadosMap.get(empId).turnos.push(turno)
      })

      setResultados({
        total: resultado.length,
        empleados: Array.from(empleadosMap.values()),
        turnosRaw: resultado
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const limpiar = () => {
    setBusqueda('')
    setAreaFiltro('')
    setResultados(null)
    setError(null)
    setMensaje(null)
    setExpandidos({})
  }

  const toggleExpandir = (idx) => {
    setExpandidos(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }))
  }

  const expandirTodos = () => {
    if (!resultados) return
    const todos = {}
    resultados.empleados.forEach((_, idx) => {
      todos[idx] = true
    })
    setExpandidos(todos)
  }

  const colapsarTodos = () => {
    setExpandidos({})
  }

  const abrirModalEditar = (turno) => {
    setTurnoEditando(turno)
    setFormEditar({
      horaInicio: turno.horaInicio || '',
      horaFin: turno.horaFin || '',
      tipo: turno.tipo || 'TRABAJO',
      observaciones: turno.observaciones || ''
    })
    setModalEditar(true)
  }

  const cerrarModalEditar = () => {
    setModalEditar(false)
    setTurnoEditando(null)
  }

  const handleGuardarEdicion = async () => {
    try {
      const response = await fetch(`/api/turnos/turno/${turnoEditando._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formEditar)
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar turno')
      }

      setMensaje({ tipo: 'success', texto: '✅ Turno actualizado correctamente' })
      cerrarModalEditar()
      // Recargar resultados
      handleBuscar()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEliminarTurno = async (turnoId) => {
    if (!window.confirm('¿Está seguro de eliminar este turno?')) return

    try {
      const response = await fetch(`/api/turnos/turno/${turnoId}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar turno')
      }

      setMensaje({ tipo: 'success', texto: '✅ Turno eliminado correctamente' })
      // Recargar resultados
      handleBuscar()
    } catch (err) {
      setError(err.message)
    }
  }

  const formatFecha = (fecha) => {
    if (!fecha) return 'Sin fecha'
    
    let año, mes, dia
    
    // Manejar diferentes formatos de fecha
    if (typeof fecha === 'string') {
      if (fecha.includes('T')) {
        // Formato ISO: "2025-11-16T00:00:00.000Z"
        const fechaStr = fecha.split('T')[0]
        ;[año, mes, dia] = fechaStr.split('-').map(Number)
      } else {
        // Formato simple: "2025-11-16"
        ;[año, mes, dia] = fecha.split('-').map(Number)
      }
    } else if (fecha instanceof Date) {
      año = fecha.getFullYear()
      mes = fecha.getMonth() + 1
      dia = fecha.getDate()
    } else {
      return 'Fecha inválida'
    }
    
    if (isNaN(año) || isNaN(mes) || isNaN(dia)) {
      return 'Fecha inválida'
    }
    
    const d = new Date(año, mes - 1, dia) // mes es 0-indexed
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    return `${dias[d.getDay()]} ${dia}/${mes}/${año}`
  }

  return (
    <div>
      <div className="form-section">
        <h3>🔍 Consultar y Modificar Turnos</h3>
        
        {error && <div className="alert alert-error">❌ {error}</div>}
        {mensaje && <div className={`alert alert-${mensaje.tipo}`}>{mensaje.texto}</div>}

        <form onSubmit={handleBuscar}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="busqueda">Buscar por nombre o documento:</label>
              <input
                type="text"
                id="busqueda"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej: Juan Pérez o 12345678"
              />
            </div>
            <div className="form-group">
              <label htmlFor="areaFiltro">Filtrar por Área:</label>
              <select
                id="areaFiltro"
                value={areaFiltro}
                onChange={(e) => setAreaFiltro(e.target.value)}
              >
                <option value="">-- Todas las áreas --</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fechaInicio">Fecha Inicio:</label>
              <input
                type="date"
                id="fechaInicio"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="fechaFin">Fecha Fin:</label>
              <input
                type="date"
                id="fechaFin"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Buscando...' : '🔍 Buscar Turnos'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={limpiar}>
              🗑️ Limpiar
            </button>
          </div>
        </form>
      </div>

      {loading && <div className="loading">Buscando turnos...</div>}

      {resultados && (
        <div className="form-section">
          <h3>📋 Resultados de la Búsqueda</h3>
          
          {resultados.total === 0 ? (
            <div className="alert alert-info">
              No se encontraron turnos con los criterios de búsqueda.
            </div>
          ) : (
            <>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div className="alert alert-success" style={{ marginBottom: '0', flex: '1' }}>
                  Se encontraron <strong>{resultados.total}</strong> turnos de <strong>{resultados.empleados.length}</strong> empleados
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={expandirTodos}
                    style={{
                      padding: '8px 15px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                      fontWeight: '500'
                    }}
                  >
                    📂 Expandir Todos
                  </button>
                  <button
                    type="button"
                    onClick={colapsarTodos}
                    style={{
                      padding: '8px 15px',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                      fontWeight: '500'
                    }}
                  >
                    📁 Colapsar Todos
                  </button>
                </div>
              </div>

              {resultados.empleados.map((item, idx) => (
                <div key={idx} style={{
                  background: '#f8f9fa',
                  borderRadius: '10px',
                  marginBottom: '10px',
                  border: '1px solid #e0e0e0',
                  overflow: 'hidden'
                }}>
                  {/* Header clickeable para expandir/colapsar */}
                  <div 
                    onClick={() => toggleExpandir(idx)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '15px',
                      background: expandidos[idx] ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e9ecef',
                      color: expandidos[idx] ? 'white' : '#333',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ 
                        fontSize: '1.2em',
                        transition: 'transform 0.3s ease',
                        transform: expandidos[idx] ? 'rotate(90deg)' : 'rotate(0deg)'
                      }}>
                        ▶
                      </span>
                      <div>
                        <strong style={{ fontSize: '1.1em' }}>
                          👤 {item.empleado?.nombre || 'Sin nombre'}
                        </strong>
                        <span style={{ 
                          marginLeft: '15px', 
                          opacity: 0.8,
                          fontSize: '0.9em'
                        }}>
                          📄 Doc: {item.empleado?.documento || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ 
                        background: expandidos[idx] ? 'rgba(255,255,255,0.2)' : '#667eea',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '15px',
                        fontSize: '0.85em'
                      }}>
                        {item.turnos.length} turnos
                      </span>
                      <span className="badge badge-info" style={{
                        background: expandidos[idx] ? 'rgba(255,255,255,0.3)' : undefined
                      }}>
                        {item.empleado?.area || 'Sin área'}
                      </span>
                    </div>
                  </div>

                  {/* Contenido expandible */}
                  {expandidos[idx] && (
                    <div style={{ padding: '15px', overflowX: 'auto' }}>
                      <table style={{ fontSize: '0.9em' }}>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Horario</th>
                            <th>Tipo</th>
                            <th>Observaciones</th>
                            <th style={{ width: '150px' }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.turnos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map((turno, tIdx) => (
                            <tr key={tIdx}>
                              <td>{formatFecha(turno.fecha)}</td>
                              <td>
                                {turno.tipo === 'DESCANSO' ? (
                                  <span style={{ color: '#888' }}>--</span>
                                ) : (
                                  <strong>{turno.horaInicio} - {turno.horaFin}</strong>
                                )}
                              </td>
                              <td>
                                <span className={`badge ${
                                  turno.tipo === 'DESCANSO' ? 'badge-warning' : 
                                  turno.tipo === 'FESTIVO' ? 'badge-error' : 'badge-success'
                                }`}>
                                  {turno.tipo || 'TRABAJO'}
                                </span>
                              </td>
                              <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {turno.observaciones || '-'}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <button
                                    className="btn btn-sm"
                                    style={{ 
                                      padding: '5px 10px', 
                                      fontSize: '0.8em',
                                      background: '#4CAF50',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '5px',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => abrirModalEditar(turno)}
                                  >
                                    ✏️ Editar
                                  </button>
                                  <button
                                    className="btn btn-sm"
                                    style={{ 
                                      padding: '5px 10px', 
                                      fontSize: '0.8em',
                                      background: '#f44336',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '5px',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => handleEliminarTurno(turno._id)}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Modal de Edición */}
      {modalEditar && turnoEditando && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '30px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>
              ✏️ Editar Turno
            </h3>
            
            <div style={{ marginBottom: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '8px' }}>
              <strong>{turnoEditando.empleado?.nombre}</strong><br/>
              <small>Fecha: {formatFecha(turnoEditando.fecha)}</small>
            </div>

            <div className="form-group">
              <label>Tipo de Turno:</label>
              <select
                value={formEditar.tipo}
                onChange={(e) => setFormEditar({...formEditar, tipo: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
              >
                <option value="TRABAJO">TRABAJO</option>
                <option value="DESCANSO">DESCANSO</option>
                <option value="FESTIVO">FESTIVO</option>
                <option value="VACACIONES">VACACIONES</option>
                <option value="INCAPACIDAD">INCAPACIDAD</option>
                <option value="PERMISO">PERMISO</option>
              </select>
            </div>

            {formEditar.tipo !== 'DESCANSO' && (
              <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Hora Inicio:</label>
                  <input
                    type="time"
                    value={formEditar.horaInicio}
                    onChange={(e) => setFormEditar({...formEditar, horaInicio: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Hora Fin:</label>
                  <input
                    type="time"
                    value={formEditar.horaFin}
                    onChange={(e) => setFormEditar({...formEditar, horaFin: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Observaciones:</label>
              <textarea
                value={formEditar.observaciones}
                onChange={(e) => setFormEditar({...formEditar, observaciones: e.target.value})}
                rows="3"
                placeholder="Agregar observaciones..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={cerrarModalEditar}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#e0e0e0',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarEdicion}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                💾 Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConsultaTurnos
