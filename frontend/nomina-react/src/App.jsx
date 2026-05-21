import { useState } from 'react'
import CalculoIndividual from './components/CalculoIndividual'
import CalculoPorAreas from './components/CalculoPorAreas'

function App() {
  const [activeTab, setActiveTab] = useState('individual')

  return (
    <>
      <div className="container">
        <div className="header">
          <h1>📊 Módulo de Nómina</h1>
          <p>Sistema de Cálculo de Nómina - INNOVAR</p>
        </div>

        <a href="/dashboard.html" className="back-button">
          ← Volver al Dashboard
        </a>

        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'individual' ? 'active' : ''}`}
            onClick={() => setActiveTab('individual')}
          >
            👤 Cálculo Individual
          </button>
          <button
            className={`tab-button ${activeTab === 'areas' ? 'active' : ''}`}
            onClick={() => setActiveTab('areas')}
          >
            🏢 Cálculo por Áreas
          </button>
        </div>

        <div className={`tab-content ${activeTab === 'individual' ? 'active' : ''}`}>
          <CalculoIndividual />
        </div>

        <div className={`tab-content ${activeTab === 'areas' ? 'active' : ''}`}>
          <CalculoPorAreas />
        </div>
      </div>
    </>
  )
}

export default App
