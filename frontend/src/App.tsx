import { useState } from 'react'
import './App.css'
import StatusPanel from './components/StatusPanel'
import { mockGameState, mockGameStateMinimal } from './types/mockData'
import { GameState } from './types/status'

function App() {
  const [gameState, setGameState] = useState<GameState>(mockGameState)
  const [useMockData, setUseMockData] = useState(true)

  const toggleMockData = () => {
    setUseMockData(!useMockData)
    setGameState(useMockData ? mockGameStateMinimal : mockGameState)
  }

  return (
    <div className="app">
      <div className="main-content">
        <h1>AI TRPG Platform</h1>
        <div className="card">
          <p>
            React + TypeScript + Vite frontend is ready!
          </p>
          <button onClick={toggleMockData}>
            {useMockData ? 'Show Minimal Data' : 'Show Full Mock Data'}
          </button>
          <p className="read-the-docs">
            Begin your AI-driven TRPG adventure
          </p>
        </div>
        <div className="demo-section">
          <h2>Status Display Components Demo</h2>
          <p>
            The status panel on the right shows:
          </p>
          <ul>
            <li>📊 Player stats (health, mana, stamina, experience)</li>
            <li>🎭 Current scene information</li>
            <li>✨ Status tags with color coding:
              <ul>
                <li>🟢 Buffs (positive effects)</li>
                <li>🔴 Debuffs (negative effects)</li>
                <li>🔵 Status effects (neutral/special)</li>
                <li>⚪ Neutral tags</li>
              </ul>
            </li>
            <li>🎒 Inventory with rarity colors</li>
            <li>⏰ Remaining time for temporary effects</li>
          </ul>
          <p>
            The panel is collapsible and responsive. Try toggling the mock data to see different states!
          </p>
        </div>
      </div>
      <StatusPanel 
        gameState={gameState}
        onUpdateGameState={(newState) => setGameState(prev => ({ ...prev, ...newState }))}
      />
    </div>
  )
}

export default App