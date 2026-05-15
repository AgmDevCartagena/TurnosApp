import { useState, useEffect, useMemo } from 'react'

function AsignacionPorAreas() {
  const [areas, setAreas] = useState([])
  const [empleadosArea, setEmpleadosArea] = useState([])
  const [selectedArea, setSelectedArea] = useState('')
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([])
  // Estados para búsqueda y filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroSubarea, setFiltroSubarea] = useState('')
  const [formData, setFormData] = useState({
    fechaInicio: '',
    fechaFin: '',
    horaInicio: '08:00',
    horaFin: '17:00',
    tipoAsignacion: 'NORMAL',
    diasDescanso: [],
    // Campos específicos para taquilleros
    subarea: 'MEGABUS',
    turnoTaquillero: 'TURNO_100',
    tablaDescanso: 'TABLA_1',
    // Campos específicos para centro de control
    turnoCentroControl: 'MAÑANA',
    tablaDescansoCentroControl: 'TABLA_1',
    modoAsignacionCC: 'AUTOMATICO', // AUTOMATICO o MANUAL
    // Campos específicos para operaciones
    turnoOperaciones: 'MAÑANA',
    tablaDescansoOperaciones: 'TABLA_1',
    modoAsignacionOperaciones: 'AUTOMATICO', // AUTOMATICO o MANUAL
    // Campos específicos para mantenimiento
    turnoMantenimiento: 'MAÑANA',
    tablaDescansoMantenimiento: 'TABLA_1',
    modoAsignacionMantenimiento: 'AUTOMATICO', // AUTOMATICO o MANUAL
    // Campos específicos para conductores
    turnoConductores: 'DIURNO',
    tablaDescansoConductores: 'TABLA_1',
    modoAsignacionConductores: 'AUTOMATICO' // AUTOMATICO o MANUAL
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalContent, setModalContent] = useState(null)
  const [calendarioDias, setCalendarioDias] = useState([])
  const [configuracionDias, setConfiguracionDias] = useState({})

  const tiposAsignacion = {
    NORMAL: { label: 'Normal', descripcion: 'Asignación estándar de turnos' },
    ADMINISTRATIVO: { label: 'Administrativo', descripcion: 'Lun-Vie 8:00-16:00, descanso fines de semana' },
    ROTATIVO: { label: 'Rotativo', descripcion: 'Turnos rotativos con días de descanso' },
    NOCTURNO: { label: 'Nocturno', descripcion: 'Turno nocturno con recargos' }
  }

  useEffect(() => {
    cargarAreas()
  }, [])

  useEffect(() => {
    if (selectedArea) {
      cargarEmpleadosArea()
    }
  }, [selectedArea])

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

  const cargarEmpleadosArea = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/turnos/empleados?area=${selectedArea}`)
      const data = await response.json()
      if (response.ok) {
        setEmpleadosArea(data)
      }
    } catch (err) {
      setError('Error al cargar empleados del área')
    } finally {
      setLoading(false)
    }
  }

  const toggleEmpleado = (empleadoId) => {
    setEmpleadosSeleccionados(prev => {
      if (prev.includes(empleadoId)) {
        return prev.filter(id => id !== empleadoId)
      } else {
        return [...prev, empleadoId]
      }
    })
  }

  // Obtener subareas únicas de los empleados
  const subareasUnicas = useMemo(() => {
    const subareas = [...new Set(empleadosArea.map(emp => emp.cargo || emp.subarea || 'Sin cargo').filter(Boolean))]
    return subareas.sort()
  }, [empleadosArea])

  // Filtrar empleados por búsqueda y subarea
  const empleadosFiltrados = useMemo(() => {
    return empleadosArea.filter(emp => {
      const matchBusqueda = !busqueda || 
        emp.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        emp.documento?.toString().includes(busqueda)
      
      const cargoEmpleado = emp.cargo || emp.subarea || 'Sin cargo'
      const matchSubarea = !filtroSubarea || cargoEmpleado === filtroSubarea
      
      return matchBusqueda && matchSubarea
    })
  }, [empleadosArea, busqueda, filtroSubarea])

  const seleccionarTodos = () => {
    // Seleccionar solo los empleados filtrados visibles
    const idsFiltrados = empleadosFiltrados.map(emp => emp._id)
    setEmpleadosSeleccionados(prev => {
      const nuevosSeleccionados = [...new Set([...prev, ...idsFiltrados])]
      return nuevosSeleccionados
    })
  }

  const deseleccionarTodos = () => {
    // Deseleccionar solo los empleados filtrados visibles
    const idsFiltrados = empleadosFiltrados.map(emp => emp._id)
    setEmpleadosSeleccionados(prev => prev.filter(id => !idsFiltrados.includes(id)))
  }

  // Limpiar filtros cuando cambia el área
  const handleAreaChange = (e) => {
    setSelectedArea(e.target.value)
    setEmpleadosSeleccionados([])
    setBusqueda('')
    setFiltroSubarea('')
  }

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Guardar el valor con su nombre específico
    const updates = { [name]: value };

    // Si es un campo de fecha específico de un área, también actualizar los campos genéricos
    if (name === 'fechaInicioCentroControl' || name === 'fechaInicioOperaciones' ||
      name === 'fechaInicioMantenimiento' || name === 'fechaInicioConductores' ||
      name === 'fechaInicioAdministracion') {
      updates.fechaInicio = value;
    }
    if (name === 'fechaFinCentroControl' || name === 'fechaFinOperaciones' ||
      name === 'fechaFinMantenimiento' || name === 'fechaFinConductores' ||
      name === 'fechaFinAdministracion') {
      updates.fechaFin = value;
    }

    setFormData(prev => ({
      ...prev,
      ...updates
    }));

    // Si cambian las fechas en Centro de Control, Operaciones, Mantenimiento o Conductores, regenerar el calendario
    if (selectedArea === 'CENTRO DE CONTROL' || selectedArea === 'OPERACIONES' || selectedArea === 'MANTENIMIENTO' || selectedArea === 'CONDUCTORES') {
      if (name.includes('fechaInicio') || name.includes('fechaFin')) {
        const inicio = name.includes('fechaInicio') ? value : formData.fechaInicio;
        const fin = name.includes('fechaFin') ? value : formData.fechaFin;

        if (inicio && fin) {
          setTimeout(() => generarCalendario(inicio, fin), 0);
        }
      }

      // Si cambian a modo manual y ya hay fechas, generar calendario
      if ((name === 'modoAsignacionCC' || name === 'modoAsignacionOperaciones' || name === 'modoAsignacionMantenimiento' || name === 'modoAsignacionConductores') && value === 'MANUAL') {
        if (formData.fechaInicio && formData.fechaFin) {
          setTimeout(() => generarCalendario(formData.fechaInicio, formData.fechaFin), 0);
        }
      }
    }
  }

  const generarCalendario = (fechaInicio, fechaFin) => {
    if (!fechaInicio || !fechaFin) return;

    const [añoInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
    const [añoFin, mesFin, diaFin] = fechaFin.split('-').map(Number);

    const inicio = new Date(añoInicio, mesInicio - 1, diaInicio);
    const fin = new Date(añoFin, mesFin - 1, diaFin);

    if (inicio > fin) {
      setCalendarioDias([]);
      setConfiguracionDias({});
      return;
    }

    const dias = [];
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    let fechaActual = new Date(inicio);

    while (fechaActual <= fin) {
      const año = fechaActual.getFullYear();
      const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
      const dia = String(fechaActual.getDate()).padStart(2, '0');
      const fechaString = `${año}-${mes}-${dia}`;

      dias.push({
        fecha: fechaString,
        diaSemana: diasSemana[fechaActual.getDay()],
        dia: fechaActual.getDate(),
        mes: fechaActual.getMonth() + 1,
        año: fechaActual.getFullYear()
      });

      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    // Inicializar configuración con MAÑANA por defecto para todos los días
    const nuevaConfig = {};
    dias.forEach(d => {
      nuevaConfig[d.fecha] = {
        turno: 'MAÑANA',
        esDescanso: false
      };
    });

    console.log('✅ Calendario generado:', dias.length, 'días');
    console.log('✅ Configuración inicial creada:', Object.keys(nuevaConfig).length, 'días');

    setCalendarioDias(dias);
    setConfiguracionDias(nuevaConfig);
  }

  const cambiarTurnoDia = (fecha, nuevoTurno) => {
    setConfiguracionDias(prev => ({
      ...prev,
      [fecha]: {
        ...prev[fecha],
        turno: nuevoTurno,
        esDescanso: nuevoTurno === 'DESCANSO'
      }
    }));
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (empleadosSeleccionados.length === 0) {
      setError('Debes seleccionar al menos un empleado')
      return
    }

    // Validación adicional para modo manual
    if ((selectedArea === 'CENTRO DE CONTROL' && formData.modoAsignacionCC === 'MANUAL') ||
      (selectedArea === 'OPERACIONES' && formData.modoAsignacionOperaciones === 'MANUAL') ||
      (selectedArea === 'MANTENIMIENTO' && formData.modoAsignacionMantenimiento === 'MANUAL') ||
      (selectedArea === 'CONDUCTORES' && formData.modoAsignacionConductores === 'MANUAL')) {
      if (calendarioDias.length === 0) {
        setError('Debes seleccionar las fechas para generar el calendario')
        return
      }
      if (Object.keys(configuracionDias).length === 0) {
        setError('El calendario no está configurado. Verifica las fechas seleccionadas.')
        return
      }
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      let payload, endpoint;

      // Determinar endpoint y payload según el área
      if (selectedArea === 'CENTRO DE CONTROL') {
        // Endpoint especial para Centro de Control
        endpoint = '/api/turnos/asignar-centro-control';

        if (formData.modoAsignacionCC === 'MANUAL') {
          // Modo manual: enviar configuración día por día
          console.log('🔍 Estado actual de configuracionDias:', configuracionDias);
          console.log('📊 Cantidad de días configurados:', Object.keys(configuracionDias).length);

          payload = {
            empleados: empleadosSeleccionados,
            turno: 'MANUAL',
            configuracionManual: configuracionDias,
            fechaInicio: formData.fechaInicio,
            fechaFin: formData.fechaFin
          };
          console.log('📅 Payload modo manual:', payload);
        } else {
          // Modo automático: usar tabla de descanso
          const turnoValue = formData.turnoCentroControl.toUpperCase();
          payload = {
            empleados: empleadosSeleccionados,
            turno: turnoValue,
            tablaDescanso: turnoValue === 'FIJO' ? null : formData.tablaDescansoCentroControl,
            fechaInicio: formData.fechaInicio,
            fechaFin: formData.fechaFin
          };
        }
      } else if (selectedArea === 'OPERACIONES') {
        // Endpoint especial para Operaciones
        endpoint = '/api/turnos/asignar-operaciones';

        if (formData.modoAsignacionOperaciones === 'MANUAL') {
          // Modo manual: enviar configuración día por día
          console.log('🔍 Estado actual de configuracionDias:', configuracionDias);
          console.log('📊 Cantidad de días configurados:', Object.keys(configuracionDias).length);

          payload = {
            empleados: empleadosSeleccionados,
            turno: 'MANUAL',
            configuracionManual: configuracionDias,
            fechaInicio: formData.fechaInicio,
            fechaFin: formData.fechaFin
          };
          console.log('📅 Payload modo manual:', payload);
        } else {
          // Modo automático: usar tabla de descanso
          const turnoValue = formData.turnoOperaciones.toUpperCase();
          payload = {
            empleados: empleadosSeleccionados,
            turno: turnoValue,
            tablaDescanso: formData.tablaDescansoOperaciones,
            fechaInicio: formData.fechaInicio,
            fechaFin: formData.fechaFin
          };
        }
      } else if (selectedArea === 'MANTENIMIENTO') {
        // Endpoint especial para Mantenimiento
        endpoint = '/api/turnos/asignar-mantenimiento';

        if (formData.modoAsignacionMantenimiento === 'MANUAL') {
          // Modo manual: enviar configuración día por día
          payload = {
            empleados: empleadosSeleccionados,
            turno: 'MANUAL',
            configuracionManual: configuracionDias,
            fechaInicio: formData.fechaInicio,
            fechaFin: formData.fechaFin
          };
        } else {
          // Modo automático: usar tabla de descanso
          const turnoValue = formData.turnoMantenimiento.toUpperCase();
          payload = {
            empleados: empleadosSeleccionados,
            turno: turnoValue,
            tablaDescanso: turnoValue === 'FIJO' ? null : formData.tablaDescansoMantenimiento,
            fechaInicio: formData.fechaInicio,
            fechaFin: formData.fechaFin
          };
        }
      } else if (selectedArea === 'CONDUCTORES') {
        // Endpoint especial para Conductores
        endpoint = '/api/turnos/asignar-conductores';

        if (formData.modoAsignacionConductores === 'MANUAL') {
          // Modo manual: enviar configuración día por día
          payload = {
            empleados: empleadosSeleccionados,
            turno: 'MANUAL',
            configuracionManual: configuracionDias,
            fechaInicio: formData.fechaInicio,
            fechaFin: formData.fechaFin
          };
        } else {
          // Modo automático: usar tabla de descanso
          const turnoValue = formData.turnoConductores.toUpperCase();
          payload = {
            empleados: empleadosSeleccionados,
            turno: turnoValue,
            tablaDescanso: formData.tablaDescansoConductores,
            fechaInicio: formData.fechaInicio,
            fechaFin: formData.fechaFin
          };
        }
      } else if (selectedArea === 'ADMINISTRACION') {
        // Endpoint especial para Administración - Horario fijo automático
        endpoint = '/api/turnos/asignar-administrativos';
        payload = {
          empleados: empleadosSeleccionados,
          fechaInicio: formData.fechaInicio,
          fechaFin: formData.fechaFin
        };
      } else {
        // Endpoint general para otras áreas
        endpoint = '/api/turnos/asignar-area';
        payload = {
          area: selectedArea,
          empleadosIds: empleadosSeleccionados,
          ...formData
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al asignar turnos')
      }

      // Preparar contenido del modal
      if (selectedArea === 'CENTRO DE CONTROL' || selectedArea === 'OPERACIONES' || selectedArea === 'MANTENIMIENTO' || selectedArea === 'CONDUCTORES' || selectedArea === 'ADMINISTRACION') {
        // Para estas áreas, usar resultados del backend
        setModalContent(data.resultados);
      } else {
        setModalContent(data.detalle);
      }

      setShowModal(true);
      setSuccess(`✅ Turnos asignados exitosamente: ${data.exitosos || data.turnosCreados} turnos para ${empleadosSeleccionados.length} empleados`)
      setEmpleadosSeleccionados([])
      setFormData({
        fechaInicio: '',
        fechaFin: '',
        horaInicio: '08:00',
        horaFin: '17:00',
        tipoAsignacion: 'NORMAL',
        diasDescanso: [],
        subarea: 'MEGABUS',
        turnoTaquillero: 'TURNO_100',
        tablaDescanso: 'TABLA_1',
        turnoCentroControl: 'MAÑANA',
        tablaDescansoCentroControl: 'TABLA_1'
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="form-section">
        <h3>🏢 Asignación de Turnos por Área</h3>
        <p style={{ color: '#718096', marginBottom: '20px' }}>
          Selecciona un área y luego los empleados a los que deseas asignar turnos de forma masiva.
        </p>

        {error && <div className="alert alert-error">❌ {error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="form-group" style={{ marginBottom: '30px' }}>
          <label htmlFor="area">Seleccionar Área *</label>
          <select
            id="area"
            value={selectedArea}
            onChange={handleAreaChange}
            style={{ fontSize: '1.1rem', padding: '15px' }}
          >
            <option value="">-- Seleccionar área --</option>
            {areas.map((area, index) => (
              <option key={index} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedArea && (
        <>
          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>👥 Empleados de {selectedArea}</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={seleccionarTodos}
                  disabled={empleadosFiltrados.length === 0}
                  title="Selecciona los empleados visibles según el filtro actual"
                >
                  ✅ Seleccionar Todos
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={deseleccionarTodos}
                  disabled={empleadosSeleccionados.length === 0}
                >
                  ❌ Deseleccionar Todos
                </button>
              </div>
            </div>

            {loading && <div className="loading">Cargando empleados...</div>}

            {!loading && empleadosArea.length === 0 && (
              <div className="alert alert-warning">
                No hay empleados registrados en esta área.
              </div>
            )}

            {!loading && empleadosArea.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                {/* Barra de búsqueda y filtros */}
                <div style={{ 
                  display: 'flex', 
                  gap: '15px', 
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end'
                }}>
                  <div style={{ flex: '1', minWidth: '250px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      🔍 Buscar empleado
                    </label>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o documento..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 15px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div style={{ minWidth: '200px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      🏷️ Filtrar por cargo
                    </label>
                    <select
                      value={filtroSubarea}
                      onChange={(e) => setFiltroSubarea(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 15px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                    >
                      <option value="">Todos los cargos</option>
                      {subareasUnicas.map((subarea, index) => (
                        <option key={index} value={subarea}>{subarea}</option>
                      ))}
                    </select>
                  </div>
                  {(busqueda || filtroSubarea) && (
                    <button
                      type="button"
                      onClick={() => { setBusqueda(''); setFiltroSubarea(''); }}
                      style={{
                        padding: '12px 20px',
                        background: '#718096',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      🗑️ Limpiar filtros
                    </button>
                  )}
                </div>

                <div className="alert alert-info">
                  <strong>{empleadosSeleccionados.length}</strong> de <strong>{empleadosArea.length}</strong> empleados seleccionados
                  {(busqueda || filtroSubarea) && (
                    <span style={{ marginLeft: '10px', color: '#667eea' }}>
                      (Mostrando {empleadosFiltrados.length} de {empleadosArea.length})
                    </span>
                  )}
                </div>

                <div className="grid">
                  {empleadosFiltrados.length === 0 ? (
                    <div style={{ 
                      gridColumn: '1 / -1', 
                      textAlign: 'center', 
                      padding: '40px',
                      background: '#f7fafc',
                      borderRadius: '8px',
                      color: '#718096'
                    }}>
                      <p style={{ fontSize: '1.1rem', margin: 0 }}>
                        🔍 No se encontraron empleados con los filtros aplicados
                      </p>
                      <button
                        type="button"
                        onClick={() => { setBusqueda(''); setFiltroSubarea(''); }}
                        style={{
                          marginTop: '15px',
                          padding: '10px 20px',
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  ) : (
                    empleadosFiltrados.map((empleado) => (
                      <div
                        key={empleado._id}
                        className="empleado-card"
                        style={{
                          border: empleadosSeleccionados.includes(empleado._id)
                            ? '3px solid #667eea'
                            : '2px solid #e2e8f0',
                          cursor: 'pointer',
                          backgroundColor: empleadosSeleccionados.includes(empleado._id)
                            ? '#f0f4ff'
                            : 'white'
                        }}
                        onClick={() => toggleEmpleado(empleado._id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={empleadosSeleccionados.includes(empleado._id)}
                            onChange={() => toggleEmpleado(empleado._id)}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0 }}>{empleado.nombre}</h4>
                            <p style={{ margin: '4px 0' }}>📄 {empleado.documento}</p>
                            <p style={{ margin: '4px 0' }}>💼 {empleado.cargo || 'Sin cargo'}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {empleadosSeleccionados.length > 0 && (
            <div className="form-section">
              <h3>⚙️ Configuración de Turnos</h3>

              <form onSubmit={handleSubmit}>

                {selectedArea === 'TAQUILLEROS' && (
                  <div style={{ marginTop: '20px', padding: '20px', background: '#f0f8ff', borderRadius: '8px', border: '2px solid #4a90e2' }}>
                    <h4 style={{ marginTop: 0, color: '#4a90e2' }}>🎫 Configuración Especial para Taquilleros</h4>

                    <div className="form-row">
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

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="subarea">Subárea *</label>
                        <select
                          id="subarea"
                          name="subarea"
                          value={formData.subarea}
                          onChange={handleChange}
                          required
                        >
                          <option value="MEGABUS">MEGABUS</option>
                          <option value="MEGACABLE">MEGACABLE</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="turnoTaquillero">Turno *</label>
                        <select
                          id="turnoTaquillero"
                          name="turnoTaquillero"
                          value={formData.turnoTaquillero}
                          onChange={handleChange}
                          required
                        >
                          <option value="TURNO_100">TURNO 100 - Mañana</option>
                          <option value="TURNO_300">TURNO 300 - Tarde</option>
                          {formData.subarea === 'MEGABUS' && (
                            <option value="TURNO_400">TURNO 400 - Partido</option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="tablaDescanso">Tabla de Descanso *</label>
                        <select
                          id="tablaDescanso"
                          name="tablaDescanso"
                          value={formData.tablaDescanso}
                          onChange={handleChange}
                          required
                        >
                          <option value="TABLA_1">Tabla 1 🟣 - Morado</option>
                          <option value="TABLA_2">Tabla 2 🔵 - Azul</option>
                          <option value="TABLA_3">Tabla 3 🟤 - Marrón</option>
                          <option value="TABLA_4">Tabla 4 🟢 - Verde</option>
                          <option value="TABLA_5">Tabla 5 🟡 - Amarillo</option>
                        </select>
                      </div>
                    </div>

                    <div className="alert alert-info" style={{ marginTop: '15px', marginBottom: 0 }}>
                      <strong>ℹ️ Información de Horarios:</strong><br />
                      {formData.subarea === 'MEGABUS' && (
                        <>
                          {formData.turnoTaquillero === 'TURNO_100' && (
                            <>
                              • Lun-Sáb: 5:00 AM - 2:15 PM<br />
                              • Dom/Festivos: 5:30 AM - 2:15 PM
                            </>
                          )}
                          {formData.turnoTaquillero === 'TURNO_300' && (
                            <>
                              • Lun-Sáb: 2:15 PM - 11:30 PM<br />
                              • Dom/Festivos: 2:15 PM - 11:00 PM
                            </>
                          )}
                          {formData.turnoTaquillero === 'TURNO_400' && (
                            <>
                              • Lun-Sáb: 5:00-10:00 AM + 2:15-6:15 PM<br />
                              • Dom/Festivos: 5:30-10:00 AM + 2:15-6:00 PM<br />
                              • (Turno Partido)
                            </>
                          )}
                        </>
                      )}
                      {formData.subarea === 'MEGACABLE' && (
                        <>
                          {formData.turnoTaquillero === 'TURNO_100' && (
                            <>
                              • Lun-Vie: 5:00 AM - 1:30 PM<br />
                              • Sábado: 5:00 AM - 1:00 PM<br />
                              • Dom/Festivos: 6:00 AM - 1:00 PM
                            </>
                          )}
                          {formData.turnoTaquillero === 'TURNO_300' && (
                            <>
                              • Lun-Vie: 1:30 PM - 10:30 PM<br />
                              • Sábado: 1:00 PM - 10:00 PM<br />
                              • Dom/Festivos: 1:00 PM - 9:30 PM
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {selectedArea === 'CENTRO DE CONTROL' && (
                  <div style={{ marginTop: '20px', padding: '20px', background: '#fff3e0', borderRadius: '8px', border: '2px solid #ff9800' }}>
                    <h4 style={{ marginTop: 0, color: '#e65100' }}>🎛️ Configuración Especial para Centro de Control</h4>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="modoAsignacionCC">Modo de Asignación *</label>
                        <select
                          id="modoAsignacionCC"
                          name="modoAsignacionCC"
                          value={formData.modoAsignacionCC}
                          onChange={handleChange}
                          required
                        >
                          <option value="AUTOMATICO">📋 Automático (Con Tabla de Descanso)</option>
                          <option value="MANUAL">📅 Manual (Calendario Interactivo)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="fechaInicioCentroControl">Fecha Inicio *</label>
                        <input
                          type="date"
                          id="fechaInicioCentroControl"
                          name="fechaInicio"
                          value={formData.fechaInicio}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="fechaFinCentroControl">Fecha Fin *</label>
                        <input
                          type="date"
                          id="fechaFinCentroControl"
                          name="fechaFin"
                          value={formData.fechaFin}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    {formData.modoAsignacionCC === 'AUTOMATICO' && (
                      <>
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="turnoCentroControl">Turno *</label>
                            <select
                              id="turnoCentroControl"
                              name="turnoCentroControl"
                              value={formData.turnoCentroControl}
                              onChange={handleChange}
                              required
                            >
                              <option value="MAÑANA">🌅 Turno Mañana</option>
                              <option value="TARDE">🌆 Turno Tarde</option>
                              <option value="FIJO">📋 Turno Fijo (Administrativo)</option>
                            </select>
                          </div>

                          {formData.turnoCentroControl !== 'FIJO' && (
                            <div className="form-group">
                              <label htmlFor="tablaDescansoCentroControl">Tabla de Descanso *</label>
                              <select
                                id="tablaDescansoCentroControl"
                                name="tablaDescansoCentroControl"
                                value={formData.tablaDescansoCentroControl}
                                onChange={handleChange}
                                required
                              >
                                <option value="TABLA_1">Tabla 1 🟣 - Morado</option>
                                <option value="TABLA_2">Tabla 2 🔵 - Azul</option>
                                <option value="TABLA_3">Tabla 3 🟤 - Marrón</option>
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="alert alert-info" style={{ marginTop: '15px', marginBottom: 0 }}>
                          <strong>ℹ️ Información de Horarios:</strong><br />
                          {formData.turnoCentroControl === 'MAÑANA' && (
                            <>
                              • Lun-Vie: 4:30 AM - 12:30 PM<br />
                              • Sábado: 4:30 AM - 2:30 PM<br />
                              • Dom/Festivos: 5:00 AM - 2:30 PM<br />
                              • Incluye días de descanso según tabla seleccionada
                            </>
                          )}
                          {formData.turnoCentroControl === 'TARDE' && (
                            <>
                              • Lun-Vie: 3:30 PM - 11:30 PM<br />
                              • Sábado: 2:30 PM - 11:30 PM<br />
                              • Dom/Festivos: 2:30 PM - 11:30 PM<br />
                              • Incluye días de descanso según tabla seleccionada
                            </>
                          )}
                          {formData.turnoCentroControl === 'FIJO' && (
                            <>
                              • Lun-Vie: 8:00 AM - 5:00 PM<br />
                              • Sábado, Domingo y Festivos: Descanso automático<br />
                              • No requiere tabla de descanso
                            </>
                          )}
                        </div>
                      </>
                    )}

                    {formData.modoAsignacionCC === 'MANUAL' && calendarioDias.length > 0 && (
                      <div style={{ marginTop: '20px' }}>
                        <h4 style={{ color: '#e65100', marginBottom: '15px' }}>
                          📅 Configurar Turnos por Día ({calendarioDias.length} días)
                        </h4>
                        <div className="alert alert-info" style={{ marginBottom: '15px' }}>
                          <strong>💡 Instrucciones:</strong> Selecciona el turno para cada día. Los cambios se aplican en tiempo real.
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                          gap: '10px',
                          maxHeight: '400px',
                          overflowY: 'auto',
                          padding: '10px',
                          background: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}>
                          {calendarioDias.map((dia) => {
                            const config = configuracionDias[dia.fecha] || { turno: 'MAÑANA', esDescanso: false };
                            let bgColor = '#e3f2fd'; // Azul claro por defecto
                            let borderColor = '#2196f3';

                            if (config.turno === 'TARDE') {
                              bgColor = '#fff3e0';
                              borderColor = '#ff9800';
                            } else if (config.turno === 'FIJO') {
                              bgColor = '#f3e5f5';
                              borderColor = '#9c27b0';
                            } else if (config.turno === 'DESCANSO') {
                              bgColor = '#c8e6c9';
                              borderColor = '#4caf50';
                            }

                            return (
                              <div
                                key={dia.fecha}
                                style={{
                                  padding: '12px',
                                  borderRadius: '8px',
                                  border: `2px solid ${borderColor}`,
                                  backgroundColor: bgColor,
                                  transition: 'all 0.2s'
                                }}
                              >
                                <div style={{
                                  textAlign: 'center',
                                  fontWeight: 'bold',
                                  marginBottom: '8px',
                                  fontSize: '14px'
                                }}>
                                  {dia.diaSemana} {dia.dia}
                                </div>
                                <select
                                  value={config.turno}
                                  onChange={(e) => cambiarTurnoDia(dia.fecha, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <option value="MAÑANA">🌅 Mañana</option>
                                  <option value="TARDE">🌆 Tarde</option>
                                  <option value="FIJO">📋 Fijo</option>
                                  <option value="DESCANSO">🏖️ Descanso</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                        <div className="alert alert-info" style={{ marginTop: '15px', marginBottom: 0 }}>
                          <strong>🌅 Mañana:</strong> Lun-Vie 4:30-12:30, Sáb 4:30-14:30, Dom/Festivos 5:00-14:30<br />
                          <strong>🌆 Tarde:</strong> Lun-Vie 15:30-23:30, Sáb 14:30-23:30, Dom/Festivos 14:30-23:30<br />
                          <strong>📋 Fijo:</strong> Lun-Vie 8:00-17:00<br />
                          <strong>🏖️ Descanso:</strong> Sin horario laboral
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedArea === 'OPERACIONES' && (
                  <div style={{ marginTop: '20px', padding: '20px', background: '#e8f5e9', borderRadius: '8px', border: '2px solid #4caf50' }}>
                    <h4 style={{ marginTop: 0, color: '#2e7d32' }}>⚙️ Configuración Especial para Operaciones</h4>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="modoAsignacionOperaciones">Modo de Asignación *</label>
                        <select
                          id="modoAsignacionOperaciones"
                          name="modoAsignacionOperaciones"
                          value={formData.modoAsignacionOperaciones}
                          onChange={handleChange}
                          required
                        >
                          <option value="AUTOMATICO">📋 Automático (Con Tabla de Descanso)</option>
                          <option value="MANUAL">📅 Manual (Calendario Interactivo)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="fechaInicioOperaciones">Fecha Inicio *</label>
                        <input
                          type="date"
                          id="fechaInicioOperaciones"
                          name="fechaInicio"
                          value={formData.fechaInicio}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="fechaFinOperaciones">Fecha Fin *</label>
                        <input
                          type="date"
                          id="fechaFinOperaciones"
                          name="fechaFin"
                          value={formData.fechaFin}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    {formData.modoAsignacionOperaciones === 'AUTOMATICO' && (
                      <>
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="turnoOperaciones">Turno *</label>
                            <select
                              id="turnoOperaciones"
                              name="turnoOperaciones"
                              value={formData.turnoOperaciones}
                              onChange={handleChange}
                              required
                            >
                              <option value="MAÑANA">🌅 Turno Mañana</option>
                              <option value="TARDE">🌆 Turno Tarde</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label htmlFor="tablaDescansoOperaciones">Tabla de Descanso *</label>
                            <select
                              id="tablaDescansoOperaciones"
                              name="tablaDescansoOperaciones"
                              value={formData.tablaDescansoOperaciones}
                              onChange={handleChange}
                              required
                            >
                              <option value="TABLA_1">Tabla 1 🟣 - Morado</option>
                              <option value="TABLA_2">Tabla 2 🔵 - Azul</option>
                              <option value="TABLA_3">Tabla 3 🟤 - Marrón</option>
                            </select>
                          </div>
                        </div>

                        <div className="alert alert-info" style={{ marginTop: '15px', marginBottom: 0 }}>
                          <strong>ℹ️ Información de Horarios:</strong><br />
                          {formData.turnoOperaciones === 'MAÑANA' && (
                            <>
                              • Todos los días: 5:00 AM - 2:15 PM<br />
                              • Incluye días de descanso según tabla seleccionada
                            </>
                          )}
                          {formData.turnoOperaciones === 'TARDE' && (
                            <>
                              • Todos los días: 2:05 PM - 11:30 PM<br />
                              • Incluye días de descanso según tabla seleccionada
                            </>
                          )}
                          {formData.turnoOperaciones === 'FIJO' && (
                            <>
                              • Lun-Vie: 8:00 AM - 5:00 PM<br />
                              • Sábado, Domingo y Festivos: Descanso automático<br />
                              • No requiere tabla de descanso
                            </>
                          )}
                        </div>
                      </>
                    )}

                    {formData.modoAsignacionOperaciones === 'MANUAL' && calendarioDias.length > 0 && (
                      <div style={{ marginTop: '20px' }}>
                        <h4 style={{ color: '#2e7d32', marginBottom: '15px' }}>
                          📅 Configurar Turnos por Día ({calendarioDias.length} días)
                        </h4>
                        <div className="alert alert-info" style={{ marginBottom: '15px' }}>
                          <strong>💡 Instrucciones:</strong> Selecciona el turno para cada día. Los cambios se aplican en tiempo real.
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                          gap: '10px',
                          maxHeight: '400px',
                          overflowY: 'auto',
                          padding: '10px',
                          background: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}>
                          {calendarioDias.map((dia) => {
                            const config = configuracionDias[dia.fecha] || { turno: 'MAÑANA', esDescanso: false };
                            let bgColor = '#e3f2fd';
                            let borderColor = '#2196f3';

                            if (config.turno === 'TARDE') {
                              bgColor = '#fff3e0';
                              borderColor = '#ff9800';
                            } else if (config.turno === 'DESCANSO') {
                              bgColor = '#c8e6c9';
                              borderColor = '#4caf50';
                            }

                            return (
                              <div
                                key={dia.fecha}
                                style={{
                                  padding: '12px',
                                  borderRadius: '8px',
                                  border: `2px solid ${borderColor}`,
                                  backgroundColor: bgColor,
                                  transition: 'all 0.2s'
                                }}
                              >
                                <div style={{
                                  textAlign: 'center',
                                  fontWeight: 'bold',
                                  marginBottom: '8px',
                                  fontSize: '14px'
                                }}>
                                  {dia.diaSemana} {dia.dia}
                                </div>
                                <select
                                  value={config.turno}
                                  onChange={(e) => cambiarTurnoDia(dia.fecha, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <option value="MAÑANA">🌅 Mañana</option>
                                  <option value="TARDE">🌆 Tarde</option>
                                  <option value="DESCANSO">🏖️ Descanso</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                        <div className="alert alert-info" style={{ marginTop: '15px', marginBottom: 0 }}>
                          <strong>🌅 Mañana:</strong> 5:00-14:15<br />
                          <strong>🌆 Tarde:</strong> 14:05-23:30<br />
                          <strong>🏖️ Descanso:</strong> Sin horario laboral
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedArea === 'MANTENIMIENTO' && (
                  <div style={{ marginTop: '20px', padding: '20px', background: '#fff3e0', borderRadius: '8px', border: '2px solid #ff9800' }}>
                    <h4 style={{ marginTop: 0, color: '#e65100' }}>🔧 Configuración Especial para Mantenimiento</h4>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="modoAsignacionMantenimiento">Modo de Asignación *</label>
                        <select
                          id="modoAsignacionMantenimiento"
                          name="modoAsignacionMantenimiento"
                          value={formData.modoAsignacionMantenimiento}
                          onChange={handleChange}
                          required
                        >
                          <option value="AUTOMATICO">📋 Automático (Con Tabla de Descanso)</option>
                          <option value="MANUAL">📅 Manual (Calendario Interactivo)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="fechaInicioMantenimiento">Fecha Inicio *</label>
                        <input
                          type="date"
                          id="fechaInicioMantenimiento"
                          name="fechaInicio"
                          value={formData.fechaInicio}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="fechaFinMantenimiento">Fecha Fin *</label>
                        <input
                          type="date"
                          id="fechaFinMantenimiento"
                          name="fechaFin"
                          value={formData.fechaFin}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    {formData.modoAsignacionMantenimiento === 'AUTOMATICO' && (
                      <>
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="turnoMantenimiento">Turno *</label>
                            <select
                              id="turnoMantenimiento"
                              name="turnoMantenimiento"
                              value={formData.turnoMantenimiento}
                              onChange={handleChange}
                              required
                            >
                              <option value="MAÑANA">🌅 Turno Mañana</option>
                              <option value="TARDE">🌆 Turno Tarde</option>
                              <option value="NOCHE">🌙 Turno Noche</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label htmlFor="tablaDescansoMantenimiento">Tabla de Descanso *</label>
                            <select
                              id="tablaDescansoMantenimiento"
                              name="tablaDescansoMantenimiento"
                              value={formData.tablaDescansoMantenimiento}
                              onChange={handleChange}
                              required
                            >
                              <option value="TABLA_1">Tabla 1 🟣 - Morado</option>
                              <option value="TABLA_2">Tabla 2 🔵 - Azul</option>
                              <option value="TABLA_3">Tabla 3 🟤 - Marrón</option>
                            </select>
                          </div>
                        </div>

                        <div className="alert alert-info" style={{ marginTop: '15px', marginBottom: 0 }}>
                          <strong>ℹ️ Información de Horarios:</strong><br />
                          {formData.turnoMantenimiento === 'MAÑANA' && (
                            <>
                              • Todos los días: 6:00 AM - 2:00 PM<br />
                              • Incluye días de descanso según tabla seleccionada
                            </>
                          )}
                          {formData.turnoMantenimiento === 'TARDE' && (
                            <>
                              • Todos los días: 2:00 PM - 10:00 PM<br />
                              • Incluye días de descanso según tabla seleccionada
                            </>
                          )}
                          {formData.turnoMantenimiento === 'NOCHE' && (
                            <>
                              • Todos los días: 10:00 PM - 6:00 AM<br />
                              • Incluye días de descanso según tabla seleccionada
                            </>
                          )}
                        </div>
                      </>
                    )}

                    {formData.modoAsignacionMantenimiento === 'MANUAL' && calendarioDias.length > 0 && (
                      <div style={{ marginTop: '20px' }}>
                        <h4 style={{ color: '#e65100', marginBottom: '15px' }}>
                          📅 Configurar Turnos por Día ({calendarioDias.length} días)
                        </h4>
                        <div className="alert alert-info" style={{ marginBottom: '15px' }}>
                          <strong>💡 Instrucciones:</strong> Selecciona el turno para cada día. Los cambios se aplican en tiempo real.
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                          gap: '10px',
                          maxHeight: '400px',
                          overflowY: 'auto',
                          padding: '10px',
                          background: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}>
                          {calendarioDias.map((dia) => {
                            const config = configuracionDias[dia.fecha] || { turno: 'MAÑANA', esDescanso: false };
                            let bgColor = '#e3f2fd';
                            let borderColor = '#2196f3';

                            if (config.turno === 'TARDE') {
                              bgColor = '#fff3e0';
                              borderColor = '#ff9800';
                            } else if (config.turno === 'NOCHE') {
                              bgColor = '#e8eaf6';
                              borderColor = '#3f51b5';
                            } else if (config.turno === 'DESCANSO') {
                              bgColor = '#c8e6c9';
                              borderColor = '#4caf50';
                            }

                            return (
                              <div
                                key={dia.fecha}
                                style={{
                                  padding: '12px',
                                  borderRadius: '8px',
                                  border: `2px solid ${borderColor}`,
                                  backgroundColor: bgColor,
                                  transition: 'all 0.2s'
                                }}
                              >
                                <div style={{
                                  textAlign: 'center',
                                  fontWeight: 'bold',
                                  marginBottom: '8px',
                                  fontSize: '14px'
                                }}>
                                  {dia.diaSemana} {dia.dia}
                                </div>
                                <select
                                  value={config.turno}
                                  onChange={(e) => cambiarTurnoDia(dia.fecha, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <option value="MAÑANA">🌅 Mañana</option>
                                  <option value="TARDE">🌆 Tarde</option>
                                  <option value="NOCHE">🌙 Noche</option>
                                  <option value="DESCANSO">🏖️ Descanso</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                        <div className="alert alert-info" style={{ marginTop: '15px', marginBottom: 0 }}>
                          <strong>🌅 Mañana:</strong> 6:00-14:00<br />
                          <strong>🌆 Tarde:</strong> 14:00-22:00<br />
                          <strong>🌙 Noche:</strong> 22:00-6:00<br />
                          <strong>🏖️ Descanso:</strong> Sin horario laboral
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedArea === 'CONDUCTORES' && (
                  <div style={{ marginTop: '20px', padding: '20px', background: '#e1f5fe', borderRadius: '8px', border: '2px solid #03a9f4' }}>
                    <h4 style={{ marginTop: 0, color: '#01579b' }}>🚌 Configuración Especial para Conductores</h4>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="modoAsignacionConductores">Modo de Asignación *</label>
                        <select
                          id="modoAsignacionConductores"
                          name="modoAsignacionConductores"
                          value={formData.modoAsignacionConductores}
                          onChange={handleChange}
                          required
                        >
                          <option value="AUTOMATICO">📋 Automático (Con Tabla de Descanso)</option>
                          <option value="MANUAL">📅 Manual (Calendario Interactivo)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="fechaInicioConductores">Fecha Inicio *</label>
                        <input
                          type="date"
                          id="fechaInicioConductores"
                          name="fechaInicio"
                          value={formData.fechaInicio}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="fechaFinConductores">Fecha Fin *</label>
                        <input
                          type="date"
                          id="fechaFinConductores"
                          name="fechaFin"
                          value={formData.fechaFin}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    {formData.modoAsignacionConductores === 'AUTOMATICO' && (
                      <>
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="turnoConductores">Turno *</label>
                            <select
                              id="turnoConductores"
                              name="turnoConductores"
                              value={formData.turnoConductores}
                              onChange={handleChange}
                              required
                            >
                              <option value="DIURNO">☀️ Turno Diurno</option>
                              <option value="NOCTURNO">🌙 Turno Nocturno</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label htmlFor="tablaDescansoConductores">Tabla de Descanso *</label>
                            <select
                              id="tablaDescansoConductores"
                              name="tablaDescansoConductores"
                              value={formData.tablaDescansoConductores}
                              onChange={handleChange}
                              required
                            >
                              <option value="TABLA_1">Tabla 1 🟣 - Morado</option>
                              <option value="TABLA_2">Tabla 2 🔵 - Azul</option>
                              <option value="TABLA_3">Tabla 3 🟤 - Marrón</option>
                            </select>
                          </div>
                        </div>

                        <div className="alert alert-info" style={{ marginTop: '15px', marginBottom: 0 }}>
                          <strong>ℹ️ Información de Horarios:</strong><br />
                          {formData.turnoConductores === 'DIURNO' && (
                            <>
                              • Todos los días: 6:00 AM - 6:00 PM (12 horas)<br />
                              • Incluye días de descanso según tabla seleccionada
                            </>
                          )}
                          {formData.turnoConductores === 'NOCTURNO' && (
                            <>
                              • Todos los días: 6:00 PM - 6:00 AM (12 horas)<br />
                              • Incluye días de descanso según tabla seleccionada
                            </>
                          )}
                        </div>
                      </>
                    )}

                    {formData.modoAsignacionConductores === 'MANUAL' && calendarioDias.length > 0 && (
                      <div style={{ marginTop: '20px' }}>
                        <h4 style={{ color: '#01579b', marginBottom: '15px' }}>
                          📅 Configurar Turnos por Día ({calendarioDias.length} días)
                        </h4>
                        <div className="alert alert-info" style={{ marginBottom: '15px' }}>
                          <strong>💡 Instrucciones:</strong> Selecciona el turno para cada día. Los cambios se aplican en tiempo real.
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                          gap: '10px',
                          maxHeight: '400px',
                          overflowY: 'auto',
                          padding: '10px',
                          background: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}>
                          {calendarioDias.map((dia) => {
                            const config = configuracionDias[dia.fecha] || { turno: 'DIURNO', esDescanso: false };
                            let bgColor = '#fff9c4';
                            let borderColor = '#fbc02d';

                            if (config.turno === 'NOCTURNO') {
                              bgColor = '#e8eaf6';
                              borderColor = '#3f51b5';
                            } else if (config.turno === 'DESCANSO') {
                              bgColor = '#c8e6c9';
                              borderColor = '#4caf50';
                            }

                            return (
                              <div
                                key={dia.fecha}
                                style={{
                                  padding: '12px',
                                  borderRadius: '8px',
                                  border: `2px solid ${borderColor}`,
                                  backgroundColor: bgColor,
                                  transition: 'all 0.2s'
                                }}
                              >
                                <div style={{
                                  textAlign: 'center',
                                  fontWeight: 'bold',
                                  marginBottom: '8px',
                                  fontSize: '14px'
                                }}>
                                  {dia.diaSemana} {dia.dia}
                                </div>
                                <select
                                  value={config.turno}
                                  onChange={(e) => cambiarTurnoDia(dia.fecha, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <option value="DIURNO">☀️ Diurno</option>
                                  <option value="NOCTURNO">🌙 Nocturno</option>
                                  <option value="DESCANSO">🏖️ Descanso</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                        <div className="alert alert-info" style={{ marginTop: '15px', marginBottom: 0 }}>
                          <strong>☀️ Diurno:</strong> 6:00-18:00 (12 horas)<br />
                          <strong>🌙 Nocturno:</strong> 18:00-6:00 (12 horas)<br />
                          <strong>🏖️ Descanso:</strong> Sin horario laboral
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ADMINISTRACIÓN - Horario fijo automático */}
                {selectedArea === 'ADMINISTRACION' && (
                  <div style={{
                    marginTop: '25px',
                    padding: '25px',
                    backgroundColor: '#f0f4ff',
                    borderRadius: '12px',
                    border: '2px solid #6366f1'
                  }}>
                    <h5 style={{
                      color: '#4338ca',
                      marginBottom: '20px',
                      fontSize: '1.3rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>📋</span>
                      Configuración - Personal Administrativo
                    </h5>

                    <div className="alert alert-info" style={{
                      backgroundColor: '#e0e7ff',
                      border: '1px solid #6366f1',
                      borderRadius: '8px',
                      padding: '20px',
                      marginBottom: '20px'
                    }}>
                      <h6 style={{ fontWeight: 'bold', marginBottom: '12px', color: '#4338ca' }}>
                        ℹ️ Horario Administrativo Automático
                      </h6>
                      <div style={{ lineHeight: '1.8' }}>
                        <p style={{ marginBottom: '8px' }}><strong>📅 Días laborables:</strong> Lunes a Viernes</p>
                        <p style={{ marginBottom: '8px' }}><strong>🕐 Horario:</strong> 7:00 AM - 5:00 PM (10 horas)</p>
                        <p style={{ marginBottom: '8px' }}><strong>🍽️ Hora de almuerzo:</strong> 12:00 PM - 1:00 PM (1 hora)</p>
                        <p style={{ marginBottom: '8px' }}><strong>⏱️ Horas laborables:</strong> 8 horas efectivas</p>
                        <p style={{ marginBottom: '0' }}><strong>🏖️ Descanso:</strong> Sábados, Domingos y Festivos</p>
                      </div>
                    </div>

                    <div className="row" style={{ marginBottom: '0' }}>
                      <div className="col-md-6" style={{ marginBottom: '15px' }}>
                        <label className="form-label" style={{ fontWeight: 'bold', color: '#4338ca' }}>
                          📅 Fecha de Inicio *
                        </label>
                        <input
                          type="date"
                          name="fechaInicioAdministracion"
                          value={formData.fechaInicioAdministracion || ''}
                          onChange={handleChange}
                          className="form-control"
                          required
                          style={{ fontSize: '1rem', padding: '10px' }}
                        />
                      </div>
                      <div className="col-md-6" style={{ marginBottom: '15px' }}>
                        <label className="form-label" style={{ fontWeight: 'bold', color: '#4338ca' }}>
                          📅 Fecha de Fin *
                        </label>
                        <input
                          type="date"
                          name="fechaFinAdministracion"
                          value={formData.fechaFinAdministracion || ''}
                          onChange={handleChange}
                          className="form-control"
                          required
                          style={{ fontSize: '1rem', padding: '10px' }}
                        />
                      </div>
                    </div>

                    <div className="alert alert-success" style={{
                      marginTop: '15px',
                      marginBottom: 0,
                      backgroundColor: '#dcfce7',
                      border: '1px solid #22c55e',
                      borderRadius: '8px'
                    }}>
                      <strong>✅ Asignación Automática:</strong> El sistema asignará automáticamente el horario administrativo a todos los empleados seleccionados. Los festivos se detectan automáticamente según el calendario oficial.
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}
                  disabled={loading}
                >
                  {loading ? 'Asignando...' : `🚀 Asignar Turnos a ${empleadosSeleccionados.length} Empleados`}
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Modal de resultados */}
      {showModal && modalContent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 30px',
              borderBottom: '2px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <h2 style={{ margin: 0, color: '#2d3748', fontSize: '24px' }}>
                ✅ Turnos Asignados Exitosamente
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#718096',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{
              padding: '30px',
              overflowY: 'auto',
              flex: 1
            }}>
              {modalContent.map((emp, index) => (
                <div key={index} style={{
                  marginBottom: '30px',
                  padding: '20px',
                  backgroundColor: '#f7fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h3 style={{
                    margin: '0 0 15px 0',
                    color: '#2d3748',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{
                      backgroundColor: '#4299e1',
                      color: 'white',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}>
                      {index + 1}
                    </span>
                    {emp.empleado}
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                    <div><strong>📄 Documento:</strong> {emp.documento}</div>
                    <div><strong>📅 Turnos:</strong> {emp.turnosAsignados}</div>
                    {emp.subarea && (
                      <>
                        <div><strong>🏢 Subárea:</strong> {emp.subarea}</div>
                        <div><strong>⏰ Turno:</strong> {emp.turno}</div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <strong>📋 Tabla de descanso:</strong> {emp.tabla}
                        </div>
                      </>
                    )}
                  </div>

                  {emp.cronograma && emp.cronograma.length > 0 && (
                    <div>
                      <h4 style={{
                        margin: '15px 0 10px 0',
                        color: '#2d3748',
                        fontSize: '16px',
                        borderBottom: '2px solid #cbd5e0',
                        paddingBottom: '5px'
                      }}>
                        📆 Cronograma Detallado
                      </h4>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '8px',
                        marginTop: '10px'
                      }}>
                        {emp.cronograma.map((dia, diaIndex) => {
                          // Parsear fecha manualmente para evitar problemas de zona horaria
                          const [año, mes, diaNum] = dia.fecha.split('-').map(Number);
                          const fechaLocal = new Date(año, mes - 1, diaNum);
                          const fecha = fechaLocal.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          });

                          let bgColor = '#ffffff';
                          let borderColor = '#cbd5e0';
                          let emoji = '';
                          let horario = '';

                          if (dia.esDescanso) {
                            bgColor = '#e6fffa';
                            borderColor = '#38b2ac';
                            emoji = '🏖️';
                            horario = 'DESCANSO';
                          } else if (dia.esFestivo) {
                            bgColor = '#fef5e7';
                            borderColor = '#f59e0b';
                            emoji = '🎉';
                            horario = 'FESTIVO';
                          } else {
                            bgColor = '#ebf8ff';
                            borderColor = '#4299e1';
                            emoji = '💼';
                            horario = `${dia.horaInicio} - ${dia.horaFin}`;
                          }

                          return (
                            <div key={diaIndex} style={{
                              padding: '10px',
                              backgroundColor: bgColor,
                              border: `1px solid ${borderColor}`,
                              borderRadius: '6px',
                              fontSize: '13px'
                            }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                {emoji} {fecha}
                              </div>
                              <div style={{ color: '#4a5568', fontSize: '12px' }}>
                                {dia.diaSemana}
                              </div>
                              <div style={{ marginTop: '4px', fontWeight: '500' }}>
                                {horario}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: '15px 30px',
              borderTop: '2px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#f8fafc'
            }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 30px',
                  backgroundColor: '#4299e1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AsignacionPorAreas
