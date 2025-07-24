import { useState, useCallback, useEffect } from 'react'
import './App.css'
import ActionInput from './components/ActionInput'
import StatusPanel from './components/StatusPanel'
import ChatLog from './components/ChatLog'
import DiceResult from './components/DiceResult'
import ConnectionIndicator from './components/ConnectionIndicator'
import CampaignCreationPage from './pages/CampaignCreationPage'
import { useCampaign, useChat, useGameState } from './hooks'
import { useRealtimeSync } from './hooks/useRealtimeSync'
import { useGameSessionStore, useChatStore } from './store'
import { mockGameState, mockGameStateMinimal } from './types/mockData'
import { GameState } from './types/status'
import { getGameSessionState } from './store/gameSessionStore'
import { adaptChatStoreForChatLog } from './utils/messageAdapter'

type AppView = 'main' | 'campaign-creation';

function App() {
  const [characterName, setCharacterName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [actions, setActions] = useState<string[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [useMockData, setUseMockData] = useState(true)
  const [mockState, setMockState] = useState<GameState>(mockGameState)
  const [activeDiceResultIndex, setActiveDiceResultIndex] = useState<number | null>(null)
  const [currentView, setCurrentView] = useState<AppView>('main')
  
  // Use direct Zustand selectors for consistent session state
  const session = useGameSessionStore((state) => {
    console.log('[App.tsx] Selector executed, session state:', state.session);
    return state.session;
  });
  
  const { 
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
  
  // Chat messages for ChatLog component
  const chatMessages = useChatStore((state) => state.chat.messages);
  const { messages: adaptedMessages, currentUserId } = adaptChatStoreForChatLog(
    chatMessages,
    session.playerId || 'player-1',
    session.characterName || undefined
  );
  
  const { 
    gameState, 
    updatePlayerStatus 
  } = useGameState()
  
  // Real-time sync
  const {
    diceResults,
    clearDiceResults,
    stateChanges
  } = useRealtimeSync(currentCampaign?.id)

  const handleCreateSession = useCallback(async () => {
    if (!characterName.trim()) return
    try {
      await createSession(characterName)
    } catch (error) {
      console.error('Failed to create campaign:', error)
    }
  }, [characterName, createSession])

  const handleJoinSession = useCallback(async () => {
    if (!sessionId.trim()) return
    try {
      await joinCampaign(sessionId, `player_${Date.now()}`)
    } catch (error) {
      console.error('Failed to join campaign:', error)
    }
  }, [sessionId, joinCampaign])

  const handleActionSubmit = useCallback(async (action: string) => {
    // Add the action to the list for display
    setActions(prev => [...prev, action])
    
    // Process action via new API with comprehensive error handling
    try {
      console.log('[App.tsx] Submitting action:', action)
      console.log('[App.tsx] Session from selector:', session)
      
      // Force fresh store read
      const freshSession = useGameSessionStore.getState().session;
      console.log('[App.tsx] Fresh session from store:', freshSession)
      
      // Pre-flight session check
      if (!freshSession.sessionId || !freshSession.playerId) {
        console.error('[App.tsx] Session invalid before action, attempting recovery...');
        
        // Try to reconnect if we have campaign info
        if (currentCampaign && characterName) {
          console.log('[App.tsx] Attempting session recovery with existing campaign...');
          await joinCampaign(currentCampaign.id, 'player-1');
          
          // Wait for connection to settle
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const recoveredSession = getGameSessionState();
          if (!recoveredSession.sessionId || !recoveredSession.playerId) {
            throw new Error('Session recovery failed - please reconnect to campaign');
          }
        } else {
          throw new Error('No active session - please create or join a campaign');
        }
      }
      
      await processAction(action)
    } catch (error) {
      console.error('[App.tsx] Failed to process action:', error)
      
      // Show user-friendly error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Add error to chat for user visibility
      const { addMessage } = useChatStore.getState();
      addMessage({
        content: `Error: ${errorMessage}`,
        sender: 'gm',
        type: 'system',
      });
    }
  }, [processAction, currentCampaign, characterName, joinCampaign, session]) // Include session dependency

  const handleInputChange = useCallback((value: string) => {
    setCurrentInput(value)
  }, [])

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
  
  // Handle dice results display
  const handleCloseDiceResult = useCallback(() => {
    if (activeDiceResultIndex !== null && diceResults.length > 0) {
      // If there are more results, show the next one
      if (activeDiceResultIndex < diceResults.length - 1) {
        setActiveDiceResultIndex(activeDiceResultIndex + 1)
      } else {
        // Otherwise clear all
        setActiveDiceResultIndex(null)
        clearDiceResults()
      }
    }
  }, [activeDiceResultIndex, diceResults.length, clearDiceResults])
  
  // Show new dice results as they come in
  useEffect(() => {
    if (diceResults.length > 0 && activeDiceResultIndex === null) {
      setActiveDiceResultIndex(0)
    }
  }, [diceResults.length, activeDiceResultIndex])

  // View switching handlers
  const handleShowCampaignCreation = useCallback(() => {
    setCurrentView('campaign-creation');
  }, []);

  const handleCancelCampaignCreation = useCallback(() => {
    setCurrentView('main');
  }, []);

  const handleCampaignCreationSuccess = useCallback((campaignId: string) => {
    console.log('[App.tsx] Campaign created successfully:', campaignId);
    setCurrentView('main');
    // The campaign creation process should have automatically joined the campaign
  }, []);

  // Render campaign creation form if that's the current view
  if (currentView === 'campaign-creation') {
    return (
      <CampaignCreationPage
        onCancel={handleCancelCampaignCreation}
        onSuccess={handleCampaignCreationSuccess}
      />
    );
  }

  return (
    <div className="app">
      <style>
        {`
          .adventure-chat-log {
            max-width: 100%;
          }
          
          .adventure-chat-log .chat-container {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          
          @media (max-width: 1024px) {
            .app {
              grid-template-columns: 1fr;
            }
            
            .adventure-chat-log {
              margin-bottom: 24px;
            }
          }
        `}
      </style>
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
          <p>WebSocket: {websocketState.isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
          {currentCampaign && (
            <p>Title: {currentCampaign.title}</p>
          )}
          {campaignLoading && <p>⏳ Loading...</p>}
          
          {/* Debug info */}
          <details style={{ marginTop: '8px', fontSize: '0.8rem', color: '#9ca3af' }}>
            <summary>Debug Info</summary>
            <p>Selector sessionId: {session.sessionId || 'null'}</p>
            <p>Selector playerId: {session.playerId || 'null'}</p>
            <p>Store sessionId: {useGameSessionStore.getState().session.sessionId || 'null'}</p>
            <p>Store playerId: {useGameSessionStore.getState().session.playerId || 'null'}</p>
          </details>
        </section>

        {/* Campaign Management */}
        {!session.isConnected && (
          <section style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Create or Join Campaign</h2>
            
            {/* Enhanced Campaign Creation Button */}
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#374151', borderRadius: '8px', border: '2px solid #3b82f6' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', color: '#3b82f6' }}>🎲 新しいキャンペーンを作成</h3>
              <p style={{ margin: '0 0 16px 0', color: '#9ca3af', fontSize: '0.9rem' }}>
                シナリオ設定、世界観、GM人格を詳細にカスタマイズできる高機能フォームを使用
              </p>
              <button 
                onClick={handleShowCampaignCreation}
                disabled={campaignLoading}
                style={{ 
                  padding: '12px 24px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: campaignLoading ? 'not-allowed' : 'pointer',
                  opacity: campaignLoading ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  width: '100%'
                }}
              >
                🎭 詳細設定でキャンペーン作成
              </button>
            </div>

            {/* Quick Campaign Creation */}
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#e5e7eb' }}>クイック作成</h4>
              <div style={{ display: 'flex', gap: '16px' }}>
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
                    backgroundColor: campaignLoading ? '#6b7280' : '#10b981', 
                    color: 'white' 
                  }}
                >
                  {campaignLoading ? 'Creating...' : 'Quick Create'}
                </button>
              </div>
            </div>

            {/* Join Campaign */}
            <div style={{ padding: '12px', backgroundColor: '#374151', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#e5e7eb' }}>既存キャンペーンに参加</h4>
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
            </div>
          </section>
        )}

        {/* Chat Log - Show conversation history */}
        {session.isConnected && (
          <section style={{ marginBottom: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Adventure Log</h2>
            <ChatLog
              messages={adaptedMessages}
              currentUserId={currentUserId}
              autoScroll={true}
              className="adventure-chat-log"
            />
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
        gameState={useMockData ? mockState : mockState}
        stateChanges={session.isConnected ? stateChanges : null}
        onUpdateGameState={(newState) => setMockState(prev => ({ ...prev, ...newState }))}
      />
      
      {/* Dice Results Display */}
      {activeDiceResultIndex !== null && diceResults[activeDiceResultIndex] && (
        <DiceResult
          result={diceResults[activeDiceResultIndex]}
          onClose={handleCloseDiceResult}
          autoClose={true}
          autoCloseDelay={5000}
        />
      )}
      
      {/* Connection Indicator */}
      <ConnectionIndicator 
        showDetails={true}
        position="bottom-right"
      />
    </div>
  )
}

export default App