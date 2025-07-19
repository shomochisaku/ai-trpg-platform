import { useState } from 'react'
import './App.css'
import ActionInput from './components/ActionInput'

function App() {
  const [actions, setActions] = useState<string[]>([])
  const [currentInput, setCurrentInput] = useState('')

  const handleSubmit = async (action: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Add the action to the list
    setActions(prev => [...prev, action])
    
    // Simulate potential error (10% chance)
    if (Math.random() < 0.1) {
      throw new Error('Failed to process action. Please try again.')
    }
  }

  const handleInputChange = (value: string) => {
    setCurrentInput(value)
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

  const actionsListStyles: React.CSSProperties = {
    backgroundColor: '#1f2937',
    borderRadius: '8px',
    padding: '16px',
    minHeight: '200px',
    border: '1px solid #374151',
  }

  const actionItemStyles: React.CSSProperties = {
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: '#374151',
    borderRadius: '6px',
    borderLeft: '4px solid #3b82f6',
  }

  const noActionsStyles: React.CSSProperties = {
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
    padding: '40px 20px',
  }

  return (
    <div style={appStyles}>
      <div style={containerStyles}>
        <header style={headerStyles}>
          <h1 style={titleStyles}>AI TRPG Platform</h1>
          <p style={subtitleStyles}>
            React + TypeScript + Vite frontend is ready!
          </p>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Begin your AI-driven TRPG adventure
          </p>
        </header>

        <section>
          <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Game Actions</h2>
          <div style={actionsListStyles}>
            {actions.length === 0 ? (
              <div style={noActionsStyles}>
                No actions taken yet. Use the input below to start your adventure!
              </div>
            ) : (
              actions.map((action, index) => (
                <div key={index} style={actionItemStyles}>
                  <strong>Action {index + 1}:</strong> {action}
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Your Action</h2>
          <ActionInput
            onSubmit={handleSubmit}
            onInputChange={handleInputChange}
            placeholder="Describe what you want to do in the game... (Shift+Enter to submit, Ctrl+↑/↓ for history)"
            maxLength={500}
          />
        </section>

        <section style={{ textAlign: 'center', marginTop: '32px' }}>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            <strong>Current Input:</strong> {currentInput.length > 0 ? `"${currentInput}"` : 'None'}
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '8px' }}>
            <strong>Actions Count:</strong> {actions.length}
          </p>
        </section>
      </div>
    </div>
  )
}

export default App