import { useEffect, useCallback } from 'react';
import { useChatStore, useGameSessionStore, useGameStateStore } from '../store';
import { api, webSocketService } from '../services';
import { ChatMessage } from '../types';
import { getGameSessionState } from '../store/gameSessionStore';

export const useChat = () => {
  const chatStore = useChatStore();
  // Use selector to ensure proper subscription
  const session = useGameSessionStore((state) => {
    console.log('[useChat] Selector executed, session state:', state.session);
    return state.session;
  });
  const updateSession = useGameSessionStore((state) => state.updateSession);
  const gameStateStore = useGameStateStore();

  // Process player action (replaces sendMessage)
  const processAction = useCallback(async (action: string) => {
    console.log('[useChat] processAction called with:', action);
    
    // Multi-source session verification with retry
    const getValidSession = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        // Try selector first
        const selectorSession = session;
        console.log(`[useChat] Attempt ${i + 1} - Selector session:`, selectorSession);
        
        // Try fresh store read
        const freshSession = useGameSessionStore.getState().session;
        console.log(`[useChat] Attempt ${i + 1} - Fresh session:`, freshSession);
        
        // Use fresh session if it has data and selector doesn't
        const workingSession = (freshSession.sessionId && freshSession.playerId) ? freshSession : selectorSession;
        
        if (workingSession.sessionId && workingSession.playerId) {
          console.log('[useChat] Valid session found:', workingSession);
          return workingSession;
        }
        
        console.log(`[useChat] Attempt ${i + 1} failed, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('No active campaign session after retries');
    };
    
    const validSession = await getValidSession();
    const { sessionId, playerId } = validSession;
    
    // Final failsafe: if session is still invalid, try to recover
    if (!sessionId || !playerId) {
      console.error('[useChat] Session recovery failed, attempting emergency recovery...');
      
      // Try to get session from browser storage or reconstruct
      const emergencySession = getGameSessionState();
      if (emergencySession.sessionId && emergencySession.playerId) {
        console.log('[useChat] Emergency session found:', emergencySession);
        const updateSession = useGameSessionStore.getState().updateSession;
        updateSession(emergencySession);
        
        // Wait for update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const recoveredSession = getGameSessionState();
        if (recoveredSession.sessionId && recoveredSession.playerId) {
          console.log('[useChat] Session recovery successful');
          return recoveredSession;
        }
      }
      
      throw new Error('Failed to recover session - please reconnect to campaign');
    }

    try {
      chatStore.setLoading(true);
      
      // Add player action to chat immediately for optimistic updates
      chatStore.addMessage({
        content: action,
        sender: 'player',
        type: 'message',
      });

      // Send via WebSocket for real-time updates
      // Send via WebSocket with retry
      try {
        webSocketService.sendMessage(action, 'message');
      } catch (wsError) {
        console.warn('[useChat] WebSocket send failed, continuing with API only:', wsError);
      }

      // Process action via campaign API with retry
      let response;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          response = await api.action.processAction(sessionId, playerId, action);
          break; // Success, exit retry loop
        } catch (apiError) {
          console.error(`[useChat] API attempt ${attempts} failed:`, apiError);
          if (attempts >= maxAttempts) {
            throw apiError;
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
      if (response.success && response.data) {
        // API response is double-wrapped: response.data.data contains the actual data
        const responseData = response.data; // {success: true, data: {...}}
        const result = responseData.data; // {campaignId: ..., narrative: ...}
        const narrativeContent = result.narrative;
        
        // Add GM response to chat
        chatStore.addMessage({
          content: narrativeContent || 'No response received',
          sender: 'gm',
          type: 'message',
        });

        // Update game state if provided
        if (result.gameState) {
          const gameState = result.gameState as Record<string, unknown>;
          gameStateStore.updateGameState({
            currentScene: (gameState.currentScene as string) || gameStateStore.gameState.currentScene,
            lastUpdate: new Date(),
          });
        }

        // Add dice results if any
        if (result.diceResults && Object.keys(result.diceResults).length > 0) {
          chatStore.addMessage({
            content: `Dice rolled: ${JSON.stringify(result.diceResults)}`,
            sender: 'gm',
            type: 'dice-roll',
            metadata: { 
              diceRoll: { 
                dice: 'unknown', 
                result: typeof result.diceResults === 'object' ? 0 : Number(result.diceResults) || 0
              } 
            },
          });
        }

        // Add suggested actions as system message
        if (result.suggestedActions && result.suggestedActions.length > 0) {
          chatStore.addMessage({
            content: `Suggested actions: ${result.suggestedActions.join(', ')}`,
            sender: 'gm',
            type: 'system',
          });
        }

        return result;
      } else {
        throw new Error(response.error || 'Failed to process action');
      }
    } catch (error) {
      console.error('Failed to process action:', error);
      chatStore.setError(error instanceof Error ? error.message : 'Failed to process action');
      
      // Add error message to chat
      chatStore.addMessage({
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'gm',
        type: 'system',
      });
      
      throw error;
    } finally {
      chatStore.setLoading(false);
    }
  }, []); // Remove session dependencies to prevent stale closures

  // Send a simple message (for non-action messages)
  const sendMessage = useCallback(async (
    content: string,
    type: ChatMessage['type'] = 'message'
  ) => {
    if (type === 'message') {
      // Regular messages are treated as actions
      return processAction(content);
    } else {
      // System messages, dice rolls, etc.
      chatStore.addMessage({
        content,
        sender: 'player',
        type,
      });
    }
  }, [processAction]);

  // Roll dice as an action
  const rollDice = useCallback(async (diceExpression: string) => {
    return processAction(`Roll ${diceExpression}`);
  }, [processAction]);

  // Simplified history loading (no backend endpoint for now)
  const loadChatHistory = useCallback(async () => {
    // For MVP, we'll start with empty chat each time
    // In the future, this could load from campaign data or a dedicated endpoint
    chatStore.clearMessages();
    
    // Add welcome message
    chatStore.addMessage({
      content: 'Welcome to your adventure! What would you like to do?',
      sender: 'gm',
      type: 'system',
    });
  }, []); // Empty dependency array - store methods are stable

  // Set up WebSocket event listeners
  useEffect(() => {
    const handleNewMessage = (message: ChatMessage) => {
      chatStore.addMessage({
        content: message.content,
        sender: message.sender,
        type: message.type,
        metadata: message.metadata,
      });
    };

    const handleSystemNotification = (notification: { type: string; message: string }) => {
      chatStore.addMessage({
        content: notification.message,
        sender: 'gm',
        type: 'system',
      });
    };

    const handleSystemError = (error: { message: string; code?: string }) => {
      chatStore.setError(error.message);
    };

    // Add event listeners
    webSocketService.on('game:message', handleNewMessage);
    webSocketService.on('system:notification', handleSystemNotification);
    webSocketService.on('system:error', handleSystemError);

    // Cleanup on unmount
    return () => {
      webSocketService.off('game:message', handleNewMessage);
      webSocketService.off('system:notification', handleSystemNotification);
      webSocketService.off('system:error', handleSystemError);
    };
  }, []); // Empty dependency array - WebSocket handlers are stable

  // Load chat history when session changes
  useEffect(() => {
    if (session.sessionId && session.isConnected) {
      loadChatHistory();
    }
  }, [session.sessionId, session.isConnected, loadChatHistory]);

  return {
    chat: chatStore.chat,
    processAction,
    sendMessage,
    rollDice,
    loadChatHistory,
    clearMessages: chatStore.clearMessages,
    setError: chatStore.setError,
  };
};