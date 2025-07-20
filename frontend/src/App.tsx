import { useState } from 'react'
import './App.css'
import ActionInput from './components/ActionInput'
import StatusPanel from './components/StatusPanel'
import { useCampaign, useChat, useGameState } from './hooks'
import { mockGameState, mockGameStateMinimal } from './types/mockData'
import { GameState } from './types/status'

function App() {
  const [characterName, setCharacterName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [actions, setActions] = useState<string[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [useMockData, setUseMockData] = useState(true)
  const [mockState, setMockState] = useState<GameState>(mockGameState)
  
  const { 
    session, 
    websocketState, 
    createSession, 
    joinCampaign, 
    disconnectFromCampaign,
    currentCampaign,
    isLoading: campaignLoading 
  } = useCampaign()
  
  const { 
    chat, 
    processAction,
    rollDice 
  } = useChat()
  
  const { 
    gameState, 
    updatePlayerStatus 
  } = useGameState()

  const handleCreateSession = async () => {
    if (!characterName.trim()) return
    try {
      await createSession(characterName)
    } catch (error) {
      console.error('Failed to create campaign:', error)
    }
  }

  const handleJoinSession = async () => {
    if (!sessionId.trim()) return
    try {
      await joinCampaign(sessionId, `player_${Date.now()}`)
    } catch (error) {
      console.error('Failed to join campaign:', error)
    }
  }

  const handleActionSubmit = async (action: string) => {
    // Add the action to the list for display
    setActions(prev => [...prev, action])
    
    // Process action via new API
    try {
      await processAction(action)
    } catch (error) {
      console.error('Failed to process action:', error)
      // Error is already handled in processAction hook
    }
  }

  const handleInputChange = (value: string) => {
    setCurrentInput(value)
  }

  const handleRollDice = async () => {
    try {
      await rollDice('1d20')
    } catch (error) {
      console.error('Failed to roll dice:', error)
    }
  }

  const handleUpdateHealth = async () => {
    try {
      await updatePlayerStatus({ 
        health: Math.max(0, gameState.playerStatus.health - 10) 
      })
    } catch (error) {
      console.error('Failed to update health:', error)
    }
  }

  const toggleMockData = () => {
    setUseMockData(!useMockData)
    setMockState(useMockData ? mockGameStateMinimal : mockGameState)
  }


  return (
    <div className="app">
      <div className="main-content">
        <header style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: 'bold', 
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>AI TRPG Platform</h1>
          <p style={{ fontSize: '1.2rem', color: '#9ca3af', marginBottom: '8px' }}>
            Advanced ActionInput + Status Display + Zustand State Management
          </p>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Begin your AI-driven TRPG adventure
          </p>
        </header>

        {/* Connection Status */}
        <section style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Campaign Status</h2>
          <p>Campaign: {session.sessionId || 'Not connected'}</p>
          <p>Character: {session.characterName || 'None'}</p>
          <p>WebSocket: {websocketState.isConnected ? 'Connected' : 'Disconnected'}</p>
          {currentCampaign && (
            <p>Title: {currentCampaign.title}</p>
          )}
          {campaignLoading && <p>Loading...</p>}
        </section>

        {/* Campaign Management */}
        {!session.isConnected && (
          <section style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Create or Join Campaign</h2>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Character Name"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none' }}
                disabled={campaignLoading}
              />
              <button 
                onClick={handleCreateSession} 
                disabled={campaignLoading}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '4px', 
                  border: 'none', 
                  backgroundColor: campaignLoading ? '#6b7280' : '#3b82f6', 
                  color: 'white' 
                }}
              >
                {campaignLoading ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <input
                type="text"
                placeholder="Campaign ID"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none' }}
                disabled={campaignLoading}
              />
              <button 
                onClick={handleJoinSession} 
                disabled={campaignLoading}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '4px', 
                  border: 'none', 
                  backgroundColor: campaignLoading ? '#6b7280' : '#3b82f6', 
                  color: 'white' 
                }}
              >
                {campaignLoading ? 'Joining...' : 'Join Campaign'}
              </button>
            </div>
          </section>
        )}

        {/* Action Input */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Your Action</h2>
          <ActionInput
            onSubmit={handleActionSubmit}
            onInputChange={handleInputChange}
            placeholder="Describe what you want to do in the game... (Shift+Enter to submit, Ctrl+↑/↓ for history)"
            maxLength={500}
          />
        </section>

        {/* Game Controls */}
        {session.isConnected && (
          <section style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Game Controls</h2>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={handleRollDice} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#10b981', color: 'white' }}>Roll d20</button>
              <button onClick={handleUpdateHealth} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#ef4444', color: 'white' }}>Take Damage (-10 HP)</button>
              <button onClick={disconnectFromCampaign} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#6b7280', color: 'white' }}>Disconnect</button>
            </div>
          </section>
        )}

        {/* Mock Data Toggle */}
        <section style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Status Panel Demo</h2>
          <button onClick={toggleMockData} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#8b5cf6', color: 'white' }}>
            {useMockData ? 'Show Minimal Data' : 'Show Full Mock Data'}
          </button>
          <p style={{ color: '#9ca3af', marginTop: '8px', fontSize: '0.9rem' }}>
            Toggle to see different status panel states. The panel shows player stats, status tags, and inventory.
          </p>
        </section>

        {/* Status */}
        <section style={{ textAlign: 'center', marginTop: '32px' }}>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            <strong>Current Input:</strong> {currentInput.length > 0 ? `"${currentInput}"` : 'None'}
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '8px' }}>
            <strong>Actions Count:</strong> {actions.length} | <strong>Chat Messages:</strong> {chat.messages.length}
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '8px' }}>
            Full-featured TRPG platform with Zustand + StatusPanel integration
          </p>
        </section>
      </div>
      <StatusPanel 
        gameState={mockState}
        onUpdateGameState={(newState) => setMockState(prev => ({ ...prev, ...newState }))}
      />
    </div>
  )
}

export default App