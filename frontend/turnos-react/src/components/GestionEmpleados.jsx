import { useState, useEffect } from 'react'

function GestionEmpleados() {
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [vistaAgrupada, setVistaAgrupada] = useState(true)
  const [areasExpandidas, setAreasExpandidas] = useState({})
  const [formData, setFormData] = useState({
    nombre: '',
    documento: '',
    cargo: '',
    area: '',
    salario: '',
    fechaIngreso: '',
    fechaCumpleanos: ''
  })

  const areas = [
    'TAQUILLEROS',
    'CONDUCTORES',
    'MANTENIMIENTO',
    'OPERACIONES',
    'ADMINISTRACION',
    'CENTRO DE CONTROL'
  ]

  useEffect(() => {
    cargarEmpleados()
  }, [])

  const cargarEmpleados = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/turnos/empleados')
      const data = await response.json()
      if (response.ok) {
        setEmpleados(data)
      } else {
        throw new Error(data.error || 'Error al cargar empleados')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/turnos/empleados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al agregar empleado')
      }

      setSuccess('Empleado agregado exitosamente')
      setFormData({ nombre: '', documento: '', cargo: '', area: '', salario: '', fechaIngreso: '', fechaCumpleanos: '' })
      cargarEmpleados()
    } catch (err) {
      setError(err.message)
    }
  }

  const eliminarEmpleado = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este empleado?')) return

    try {
      const response = await fetch(`/api/turnos/empleados/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar empleado')
      }

      setSuccess('Empleado eliminado exitosamente')
      cargarEmpleados()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validar tipo de archivo
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      setError('Formato de archivo no válido. Use CSV o Excel (.xlsx, .xls)')
      e.target.value = ''
      return
    }

    setError(null)
    setSuccess(null)
    setUploadProgress('Procesando archivo...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/turnos/empleados/carga-masiva', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el archivo')
      }

      setSuccess(`✅ Carga exitosa: ${data.insertados} empleados agregados${data.errores > 0 ? `, ${data.errores} errores` : ''}`)
      setUploadProgress(null)
      cargarEmpleados()
      e.target.value = ''
    } catch (err) {
      setError(err.message)
      setUploadProgress(null)
      e.target.value = ''
    }
  }

  const descargarPlantilla = () => {
    const csvContent = 'nombre,documento,cargo,area,salario,fechaIngreso,fechaCumpleanos\n' +
      'Juan Pérez,12345678,Operario,TAQUILLEROS,1300000,2024-01-15,1990-05-20\n' +
      'María García,87654321,Supervisora,ADMINISTRACION,2500000,2023-06-01,1985-12-10\n' +
      'Carlos López,11223344,Conductor,CONDUCTORES,1800000,2024-03-20,1992-08-15\n'
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', 'plantilla_empleados.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Agrupar empleados por área
  const agruparPorArea = () => {
    const agrupados = {}
    empleados.forEach(emp => {
      if (!agrupados[emp.area]) {
        agrupados[emp.area] = []
      }
      agrupados[emp.area].push(emp)
    })
    return agrupados
  }

  const empleadosAgrupados = agruparPorArea()

  // Calcular totales por área
  const calcularTotalesArea = (empleadosArea) => {
    const total = empleadosArea.reduce((sum, emp) => sum + (emp.salario || 0), 0)
    return total
  }

  // Toggle expandir/colapsar área
  const toggleArea = (area) => {
    setAreasExpandidas(prev => ({
      ...prev,
      [area]: !prev[area]
    }))
  }

  return (
    <div>
      <div className="form-section">
        <h3>📤 Carga Masiva de Empleados</h3>
        
        {error && <div className="alert alert-error">❌ {error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        {uploadProgress && <div className="alert alert-info">⏳ {uploadProgress}</div>}

        <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #4a90e2' }}>
          <h4 style={{ marginTop: 0, color: '#4a90e2' }}>📊 Importar desde Excel o CSV</h4>
          <p style={{ marginBottom: '15px', fontSize: '0.9rem' }}>
            Sube un archivo CSV o Excel con las columnas: <strong>nombre, documento (o cedula), cargo, area, salario, fechaIngreso, fechaCumpleanos</strong>
          </p>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="btn btn-success" style={{ cursor: 'pointer', margin: 0 }}>
              📁 Seleccionar archivo
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
            
            <button
              type="button"
              className="btn btn-secondary"
              onClick={descargarPlantilla}
            >
              📥 Descargar plantilla CSV
            </button>
          </div>

          <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#666' }}>
            <strong>Áreas válidas:</strong> {areas.join(', ')}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>➕ Agregar Empleado Individual</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nombre">Nombre completo *</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="documento">Documento *</label>
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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cargo">Cargo</label>
              <input
                type="text"
                id="cargo"
                name="cargo"
                value={formData.cargo}
                onChange={handleChange}
                placeholder="Ej: Operario, Supervisor"
              />
            </div>
            <div className="form-group">
              <label htmlFor="area">Área de Trabajo *</label>
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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="salario">Salario (COP)</label>
              <input
                type="number"
                id="salario"
                name="salario"
                value={formData.salario}
                onChange={handleChange}
                placeholder="Ej: 1300000"
                min="0"
              />
            </div>
            <div className="form-group">
              <label htmlFor="fechaIngreso">Fecha de Ingreso</label>
              <input
                type="date"
                id="fechaIngreso"
                name="fechaIngreso"
                value={formData.fechaIngreso}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fechaCumpleanos">Fecha de Cumpleaños</label>
              <input
                type="date"
                id="fechaCumpleanos"
                name="fechaCumpleanos"
                value={formData.fechaCumpleanos}
                onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            ➕ Agregar Empleado
          </button>
        </form>
      </div>

      <div className="form-section">
        <h3>Lista de Empleados por Áreas ({empleados.length})</h3>
        
        {loading && <div className="loading">Cargando empleados...</div>}

        {!loading && empleados.length === 0 && (
          <div className="alert alert-info">
            No hay empleados registrados. Agrega uno usando el formulario anterior.
          </div>
        )}

        {!loading && empleados.length > 0 && (
          <div>
            {Object.keys(empleadosAgrupados).sort().map((area) => {
              const empleadosArea = empleadosAgrupados[area]
              const totalSalarios = calcularTotalesArea(empleadosArea)
              const estaExpandida = areasExpandidas[area] || false
              
              return (
                <div key={area} style={{ marginBottom: '20px', border: '2px solid #4a90e2', borderRadius: '10px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      color: 'white', 
                      padding: '15px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onClick={() => toggleArea(area)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ fontSize: '1.5rem', transition: 'transform 0.3s', transform: estaExpandida ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                        ▶
                      </span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.2rem' }}>🏢 {area}</h4>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>
                          {empleadosArea.length} empleado{empleadosArea.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {estaExpandida && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ marginBottom: 0 }}>
                        <thead>
                          <tr>
                            <th>Nombre</th>
                            <th>Documento</th>
                            <th>Cargo</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {empleadosArea.map((emp) => (
                            <tr key={emp._id}>
                              <td>{emp.nombre}</td>
                              <td>{emp.documento}</td>
                              <td>{emp.cargo || '-'}</td>
                              <td>
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: '6px 15px', fontSize: '0.85rem' }}
                                  onClick={() => eliminarEmpleado(emp._id)}
                                >
                                  🗑️ Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default GestionEmpleados
