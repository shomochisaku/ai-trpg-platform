import { useState } from 'react'
import './App.css'
import ChatLog from './components/ChatLog'
import { Message } from './types/message'

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Welcome to the AI TRPG Platform! Your adventure begins now...',
      timestamp: new Date(Date.now() - 300000),
      sender: {
        id: 'system',
        name: 'System',
        role: 'system'
      },
      type: 'system',
      metadata: {
        systemEventType: 'info'
      }
    },
    {
      id: '2',
      content: 'You find yourself standing at the entrance of a mysterious dungeon. The air is thick with magic and danger.',
      timestamp: new Date(Date.now() - 240000),
      sender: {
        id: 'gm-1',
        name: 'Game Master',
        role: 'gm'
      },
      type: 'normal'
    },
    {
      id: '3',
      content: 'I want to examine the entrance for any traps or magical auras.',
      timestamp: new Date(Date.now() - 180000),
      sender: {
        id: 'player-1',
        name: 'Aelindra',
        role: 'player'
      },
      type: 'action'
    },
    {
      id: '4',
      content: 'Roll for Investigation!',
      timestamp: new Date(Date.now() - 120000),
      sender: {
        id: 'gm-1',
        name: 'Game Master',
        role: 'gm'
      },
      type: 'normal'
    },
    {
      id: '5',
      content: 'Rolling for Investigation...',
      timestamp: new Date(Date.now() - 60000),
      sender: {
        id: 'player-1',
        name: 'Aelindra',
        role: 'player'
      },
      type: 'dice_roll',
      metadata: {
        diceResult: {
          formula: '1d20 + 5',
          result: 18,
          rolls: [13]
        }
      }
    },
    {
      id: '6',
      content: 'Excellent roll! You notice faint magical glyphs carved into the stone archway. They seem to be some kind of ward.',
      timestamp: new Date(),
      sender: {
        id: 'gm-1',
        name: 'Game Master',
        role: 'gm'
      },
      type: 'normal'
    }
  ])

  const handleNewMessage = (message: Message) => {
    setMessages(prev => [...prev, message])
  }

  const addSampleMessage = () => {
    const sampleMessages = [
      {
        id: `msg-${Date.now()}`,
        content: 'I cast Detect Magic to get a better understanding of these glyphs.',
        timestamp: new Date(),
        sender: {
          id: 'player-1',
          name: 'Aelindra',
          role: 'player' as const
        },
        type: 'action' as const
      },
      {
        id: `msg-${Date.now() + 1}`,
        content: 'The glyphs pulse with a soft blue light as your spell takes effect. You sense protective magic.',
        timestamp: new Date(),
        sender: {
          id: 'gm-1',
          name: 'Game Master',
          role: 'gm' as const
        },
        type: 'normal' as const
      }
    ]
    
    const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)]
    handleNewMessage(randomMessage)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6', 
      padding: '20px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          backgroundColor: '#1f2937',
          color: 'white',
          textAlign: 'center'
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: 'bold',
            marginBottom: '8px'
          }}>
            AI TRPG Platform
          </h1>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            opacity: 0.8 
          }}>
            Experience immersive AI-driven storytelling
          </p>
        </div>

        {/* Main Content */}
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              marginBottom: '8px',
              color: '#374151'
            }}>
              Live Chat Demo
            </h2>
            <p style={{ 
              fontSize: '14px', 
              color: '#6b7280',
              marginBottom: '16px'
            }}>
              Interactive chat log with GM, player, and system messages
            </p>
            
            <button
              onClick={addSampleMessage}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '16px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              Add Sample Message
            </button>
          </div>

          {/* Chat Log Component */}
          <ChatLog 
            messages={messages}
            currentUserId="player-1"
            autoScroll={true}
            onNewMessage={handleNewMessage}
          />
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          React + TypeScript + Vite • Chat Log Component Demo
        </div>
      </div>
    </div>
  )
}

export default App