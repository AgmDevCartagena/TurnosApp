import { useState, useEffect } from 'react'
import GestionEmpleados from './components/GestionEmpleados'
import AsignacionTurnos from './components/AsignacionTurnos'
import AsignacionPorAreas from './components/AsignacionPorAreas'
import CalendarioSemanal from './components/CalendarioSemanal'
import ConsultaTurnos from './components/ConsultaTurnos'

function App() {
  const [activeTab, setActiveTab] = useState('empleados')
  const [sesion, setSesion] = useState(null)

  useEffect(() => {
    fetch('/api/auth/verificar-sesion')
      .then(r => r.json())
      .then(data => { if (data.autenticado) setSesion(data.usuario) })
      .catch(() => {})
  }, [])

  return (
    <>
      <div className="container">
        <div className="header">
          <h1>📅 Módulo de Turnos</h1>
          <p>Sistema de Gestión de Turnos - INNOVAR</p>
        </div>

        <a href="/dashboard.html" className="back-button">
          ← Volver al Dashboard
        </a>

        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'empleados' ? 'active' : ''}`}
            onClick={() => setActiveTab('empleados')}
          >
            👥 Empleados
          </button>
          <button
            className={`tab-button ${activeTab === 'asignacion' ? 'active' : ''}`}
            onClick={() => setActiveTab('asignacion')}
          >
            📋 Asignación Individual
          </button>
          <button
            className={`tab-button ${activeTab === 'asignacion-area' ? 'active' : ''}`}
            onClick={() => setActiveTab('asignacion-area')}
          >
            🏢 Asignación por Área
          </button>
          <button
            className={`tab-button ${activeTab === 'calendario' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendario')}
          >
            📅 Calendario Semanal
          </button>
          <button
            className={`tab-button ${activeTab === 'consulta' ? 'active' : ''}`}
            onClick={() => setActiveTab('consulta')}
          >
            🔍 Consultar Turnos
          </button>
        </div>

        <div className={`tab-content ${activeTab === 'empleados' ? 'active' : ''}`}>
          <GestionEmpleados sesion={sesion} />
        </div>

        <div className={`tab-content ${activeTab === 'asignacion' ? 'active' : ''}`}>
          <AsignacionTurnos />
        </div>

        <div className={`tab-content ${activeTab === 'asignacion-area' ? 'active' : ''}`}>
          <AsignacionPorAreas />
        </div>

        <div className={`tab-content ${activeTab === 'calendario' ? 'active' : ''}`}>
          <CalendarioSemanal />
        </div>

        <div className={`tab-content ${activeTab === 'consulta' ? 'active' : ''}`}>
          <ConsultaTurnos />
        </div>
      </div>
    </>
  )
}

export default App
