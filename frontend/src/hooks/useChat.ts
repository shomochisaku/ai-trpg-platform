import { useEffect, useCallback } from 'react';
import { useChatStore, useGameSessionStore, useGameStateStore } from '../store';
import { api, webSocketService } from '../services';
import { ChatMessage } from '../types';

export const useChat = () => {
  const chatStore = useChatStore();
  const gameSessionStore = useGameSessionStore();
  const gameStateStore = useGameStateStore();

  // Process player action (replaces sendMessage)
  const processAction = useCallback(async (action: string) => {
    const { sessionId, playerId } = gameSessionStore.session;
    if (!sessionId || !playerId) {
      throw new Error('No active campaign session');
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
      webSocketService.sendMessage(action, 'message');

      // Process action via campaign API
      const response = await api.action.processAction(sessionId, playerId, action);
      if (response.success && response.data) {
        const result = response.data;
        
        // Add GM response to chat
        chatStore.addMessage({
          content: result.narrative,
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
  }, [chatStore, gameSessionStore.session, gameStateStore]);

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
  }, [processAction, chatStore]);

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
  }, [chatStore]);

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
  }, [chatStore]);

  // Load chat history when session changes
  useEffect(() => {
    if (gameSessionStore.session.sessionId && gameSessionStore.session.isConnected) {
      loadChatHistory();
    }
  }, [gameSessionStore.session.sessionId, gameSessionStore.session.isConnected, loadChatHistory]);

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