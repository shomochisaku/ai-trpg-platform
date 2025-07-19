import { useState } from 'react'
import './App.css'
import ActionInput from './components/ActionInput'
import { useGameSession, useChat, useGameState } from './hooks'

function App() {
  const [characterName, setCharacterName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [actions, setActions] = useState<string[]>([])
  const [currentInput, setCurrentInput] = useState('')
  
  const { 
    session, 
    websocketState, 
    createSession, 
    joinSession, 
    disconnectFromSession 
  } = useGameSession()
  
  const { 
    chat, 
    sendMessage, 
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
      console.error('Failed to create session:', error)
    }
  }

  const handleJoinSession = async () => {
    if (!sessionId.trim()) return
    try {
      await joinSession(sessionId, `player_${Date.now()}`)
    } catch (error) {
      console.error('Failed to join session:', error)
    }
  }

  const handleActionSubmit = async (action: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Add the action to the list
    setActions(prev => [...prev, action])
    
    // Send message via Zustand store
    try {
      await sendMessage(action)
    } catch (error) {
      console.error('Failed to send action:', error)
    }
    
    // Simulate potential error (10% chance)
    if (Math.random() < 0.1) {
      throw new Error('Failed to process action. Please try again.')
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

  const appStyles: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#111827',
    color: '#f3f4f6',
    padding: '20px',
    fontFamily: 'Inter, system-ui, sans-serif',
  }

  const containerStyles: React.CSSProperties = {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  }

  const headerStyles: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '32px',
  }

  const titleStyles: React.CSSProperties = {
    fontSize: '3rem',
    fontWeight: 'bold',
    marginBottom: '16px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  }

  const subtitleStyles: React.CSSProperties = {
    fontSize: '1.2rem',
    color: '#9ca3af',
    marginBottom: '8px',
  }

  return (
    <div style={appStyles}>
      <div style={containerStyles}>
        <header style={headerStyles}>
          <h1 style={titleStyles}>AI TRPG Platform</h1>
          <p style={subtitleStyles}>
            Advanced ActionInput + Zustand State Management
          </p>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Begin your AI-driven TRPG adventure
          </p>
        </header>

        {/* Connection Status */}
        <section style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '8px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Connection Status</h2>
          <p>Session: {session.sessionId || 'Not connected'}</p>
          <p>Character: {session.characterName || 'None'}</p>
          <p>WebSocket: {websocketState.isConnected ? 'Connected' : 'Disconnected'}</p>
        </section>

        {/* Session Management */}
        {!session.isConnected && (
          <section style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '8px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Create or Join Session</h2>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Character Name"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none' }}
              />
              <button onClick={handleCreateSession} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#3b82f6', color: 'white' }}>Create Session</button>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <input
                type="text"
                placeholder="Session ID"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none' }}
              />
              <button onClick={handleJoinSession} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#3b82f6', color: 'white' }}>Join Session</button>
            </div>
          </section>
        )}

        {/* Action Input */}
        <section>
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
          <section style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '8px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Game Controls</h2>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={handleRollDice} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#10b981', color: 'white' }}>Roll d20</button>
              <button onClick={handleUpdateHealth} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#ef4444', color: 'white' }}>Take Damage (-10 HP)</button>
              <button onClick={disconnectFromSession} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#6b7280', color: 'white' }}>Disconnect</button>
            </div>
          </section>
        )}

        {/* Status */}
        <section style={{ textAlign: 'center', marginTop: '32px' }}>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            <strong>Current Input:</strong> {currentInput.length > 0 ? `"${currentInput}"` : 'None'}
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '8px' }}>
            <strong>Actions Count:</strong> {actions.length} | <strong>Chat Messages:</strong> {chat.messages.length}
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '8px' }}>
            State management system powered by Zustand
          </p>
        </section>
      </div>
    </div>
  )
}

export default App