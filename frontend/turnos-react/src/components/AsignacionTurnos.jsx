import { useState, useEffect } from 'react'

function AsignacionTurnos() {
  const [empleados, setEmpleados] = useState([])
  const [empleadosFiltrados, setEmpleadosFiltrados] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [formData, setFormData] = useState({
    empleadoId: '',
    fechaInicio: '',
    fechaFin: '',
    horaInicio: '08:00',
    horaFin: '17:00',
    horaAlmuerzoInicio: '12:00',
    horaAlmuerzoFin: '13:00',
    incluirAlmuerzo: true,
    diasDescanso: [] // Array con los días de la semana que descansa: [0,6] = Domingo y Sábado
  })
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Días de la semana para seleccionar descansos
  const diasSemana = [
    { value: 0, label: 'Domingo', icon: '🌅' },
    { value: 1, label: 'Lunes', icon: '📅' },
    { value: 2, label: 'Martes', icon: '📅' },
    { value: 3, label: 'Miércoles', icon: '📅' },
    { value: 4, label: 'Jueves', icon: '📅' },
    { value: 5, label: 'Viernes', icon: '📅' },
    { value: 6, label: 'Sábado', icon: '🌴' }
  ]

  useEffect(() => {
    cargarEmpleados()
    cargarAreas()
  }, [])

  // Filtrar empleados cuando cambia la búsqueda o el filtro de área
  useEffect(() => {
    let resultado = empleados

    // Filtrar por área
    if (filtroArea) {
      resultado = resultado.filter(emp => emp.area === filtroArea)
    }

    // Filtrar por búsqueda (nombre o documento)
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase()
      resultado = resultado.filter(emp => 
        emp.nombre.toLowerCase().includes(busquedaLower) ||
        emp.documento.toLowerCase().includes(busquedaLower)
      )
    }

    setEmpleadosFiltrados(resultado)
  }, [empleados, busqueda, filtroArea])

  const cargarEmpleados = async () => {
    try {
      const response = await fetch('/api/turnos/empleados')
      const data = await response.json()
      if (response.ok) {
        setEmpleados(data)
        setEmpleadosFiltrados(data)
      }
    } catch (err) {
      console.error('Error al cargar empleados:', err)
    }
  }

  const cargarAreas = async () => {
    try {
      const response = await fetch('/api/turnos/areas')
      const data = await response.json()
      if (response.ok) {
        setAreas(data.areas || [])
      }
    } catch (err) {
      console.error('Error al cargar áreas:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (type === 'checkbox' && name === 'incluirAlmuerzo') {
      setFormData({
        ...formData,
        incluirAlmuerzo: checked
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const toggleDiaDescanso = (diaValue) => {
    setFormData(prev => {
      const diasActuales = prev.diasDescanso
      if (diasActuales.includes(diaValue)) {
        return {
          ...prev,
          diasDescanso: diasActuales.filter(d => d !== diaValue)
        }
      } else {
        return {
          ...prev,
          diasDescanso: [...diasActuales, diaValue].sort((a, b) => a - b)
        }
      }
    })
  }

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroArea('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/turnos/asignar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al asignar turno')
      }

      setSuccess(`Turno asignado exitosamente. ${data.turnosCreados || 0} turnos creados, ${data.diasDescanso || 0} días de descanso.`)
      setFormData({
        empleadoId: '',
        fechaInicio: '',
        fechaFin: '',
        horaInicio: '08:00',
        horaFin: '17:00',
        horaAlmuerzoInicio: '12:00',
        horaAlmuerzoFin: '13:00',
        incluirAlmuerzo: true,
        diasDescanso: []
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Función para formatear nombre del área
  const formatearArea = (area) => {
    if (!area) return area
    const iconos = {
      'ADMINISTRACION': '🏛️', 'ADMINISTRACIÓN': '🏛️',
      'CENTRO_CONTROL': '🎛️', 'CENTRO DE CONTROL': '🎛️',
      'OPERACIONES': '⚙️',
      'CONDUCTORES': '🚌',
      'MANTENIMIENTO': '🔧',
      'TAQUILLEROS': '🎫'
    }
    const icono = iconos[area.toUpperCase()] || '🏢'
    return `${icono} ${area.charAt(0).toUpperCase() + area.slice(1).toLowerCase()}`
  }

  return (
    <div>
      <div className="form-section">
        <h3>📋 Asignar Turno Individual</h3>
        
        {error && <div className="alert alert-error">❌ {error}</div>}
        {success && <div className="alert alert-success">✅ {success}</div>}

        {/* Barra de filtros y búsqueda */}
        <div style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          border: '2px solid #667eea20'
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'flex-end'
          }}>
            {/* Campo de búsqueda */}
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontWeight: '600', 
                color: '#667eea',
                fontSize: '0.9em'
              }}>
                🔍 Buscar empleado
              </label>
              <input
                type="text"
                placeholder="Nombre o documento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '2px solid #ddd',
                  fontSize: '1em',
                  transition: 'border-color 0.3s'
                }}
              />
            </div>

            {/* Filtro por área */}
            <div style={{ flex: '1', minWidth: '180px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontWeight: '600', 
                color: '#667eea',
                fontSize: '0.9em'
              }}>
                🏢 Filtrar por área
              </label>
              <select
                value={filtroArea}
                onChange={(e) => setFiltroArea(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '2px solid #ddd',
                  fontSize: '1em',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="">Todas las áreas</option>
                {areas.map(area => (
                  <option key={area} value={area}>{formatearArea(area)}</option>
                ))}
              </select>
            </div>

            {/* Botón limpiar */}
            <button
              type="button"
              onClick={limpiarFiltros}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '2px solid #e53e3e',
                background: '#fff',
                color: '#e53e3e',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#e53e3e'
                e.target.style.color = '#fff'
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#fff'
                e.target.style.color = '#e53e3e'
              }}
            >
              🗑️ Limpiar
            </button>
          </div>

          {/* Contador de resultados */}
          <div style={{
            marginTop: '12px',
            fontSize: '0.9em',
            color: '#666'
          }}>
            📊 Mostrando <strong style={{ color: '#667eea' }}>{empleadosFiltrados.length}</strong> de <strong>{empleados.length}</strong> empleados
            {filtroArea && <span> en <strong style={{ color: '#764ba2' }}>{formatearArea(filtroArea)}</strong></span>}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="empleadoId">👤 Empleado *</label>
              <select
                id="empleadoId"
                name="empleadoId"
                value={formData.empleadoId}
                onChange={handleChange}
                required
                style={{
                  borderRadius: '8px',
                  border: '2px solid #ddd',
                  padding: '10px 14px'
                }}
              >
                <option value="">Seleccionar empleado...</option>
                {empleadosFiltrados.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.nombre} - {emp.documento} ({emp.area})
                  </option>
                ))}
              </select>
              {empleadosFiltrados.length === 0 && (
                <small style={{ color: '#e53e3e', marginTop: '4px', display: 'block' }}>
                  ⚠️ No se encontraron empleados con los filtros aplicados
                </small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fechaInicio">📅 Fecha Inicio *</label>
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
              <label htmlFor="fechaFin">📅 Fecha Fin *</label>
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

          {/* Sección de días de descanso */}
          <div style={{
            background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            border: '2px solid #e53e3e20'
          }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '12px', 
              fontWeight: '600', 
              color: '#e53e3e',
              fontSize: '1em'
            }}>
              🛌 Días de descanso (seleccione los días que NO trabaja)
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {diasSemana.map(dia => (
                <button
                  key={dia.value}
                  type="button"
                  onClick={() => toggleDiaDescanso(dia.value)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: formData.diasDescanso.includes(dia.value) 
                      ? '2px solid #e53e3e' 
                      : '2px solid #ddd',
                    background: formData.diasDescanso.includes(dia.value) 
                      ? 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)' 
                      : '#fff',
                    color: formData.diasDescanso.includes(dia.value) ? '#fff' : '#333',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{dia.icon}</span>
                  <span>{dia.label}</span>
                </button>
              ))}
            </div>
            {formData.diasDescanso.length > 0 && (
              <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                ✅ Descansa: <strong style={{ color: '#e53e3e' }}>
                  {formData.diasDescanso.map(d => diasSemana.find(ds => ds.value === d)?.label).join(', ')}
                </strong>
              </div>
            )}
          </div>

          {/* Sección de horario laboral */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            border: '2px solid #38a16920'
          }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '12px', 
              fontWeight: '600', 
              color: '#38a169',
              fontSize: '1em'
            }}>
              ⏰ Horario Laboral
            </label>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="horaInicio">🌅 Hora Entrada *</label>
                <input
                  type="time"
                  id="horaInicio"
                  name="horaInicio"
                  value={formData.horaInicio}
                  onChange={handleChange}
                  required
                  style={{ borderRadius: '8px', border: '2px solid #38a16950' }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="horaFin">🌙 Hora Salida *</label>
                <input
                  type="time"
                  id="horaFin"
                  name="horaFin"
                  value={formData.horaFin}
                  onChange={handleChange}
                  required
                  style={{ borderRadius: '8px', border: '2px solid #38a16950' }}
                />
              </div>
            </div>
          </div>

          {/* Sección de hora de almuerzo */}
          <div style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            border: '2px solid #d9720020'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <label style={{ 
                fontWeight: '600', 
                color: '#d97200',
                fontSize: '1em'
              }}>
                🍽️ Hora de Almuerzo
              </label>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  name="incluirAlmuerzo"
                  checked={formData.incluirAlmuerzo}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.9em', color: '#666' }}>Incluir hora de almuerzo</span>
              </label>
            </div>
            
            {formData.incluirAlmuerzo && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="horaAlmuerzoInicio">Inicio Almuerzo</label>
                  <input
                    type="time"
                    id="horaAlmuerzoInicio"
                    name="horaAlmuerzoInicio"
                    value={formData.horaAlmuerzoInicio}
                    onChange={handleChange}
                    style={{ borderRadius: '8px', border: '2px solid #d9720050' }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="horaAlmuerzoFin">Fin Almuerzo</label>
                  <input
                    type="time"
                    id="horaAlmuerzoFin"
                    name="horaAlmuerzoFin"
                    value={formData.horaAlmuerzoFin}
                    onChange={handleChange}
                    style={{ borderRadius: '8px', border: '2px solid #d9720050' }}
                  />
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Asignando...' : '✅ Confirmar Asignación'}
          </button>
        </form>
      </div>

      <div className="alert alert-info">
        <strong>ℹ️ Resumen de asignación:</strong>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>📅 Seleccione el rango de fechas para la asignación</li>
          <li>🛌 Marque los días de la semana que el empleado descansará</li>
          <li>⏰ Configure el horario de entrada y salida</li>
          <li>🍽️ Opcionalmente, configure la hora de almuerzo</li>
        </ul>
      </div>
    </div>
  )
}

export default AsignacionTurnos
