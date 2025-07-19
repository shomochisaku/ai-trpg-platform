import { useEffect, useCallback } from 'react';
import { useChatStore, useGameSessionStore } from '../store';
import { api, webSocketService } from '../services';
import { ChatMessage } from '../types';

export const useChat = () => {
  const chatStore = useChatStore();
  const gameSessionStore = useGameSessionStore();

  // Send a message
  const sendMessage = useCallback(async (
    content: string,
    type: ChatMessage['type'] = 'message'
  ) => {
    const { sessionId } = gameSessionStore.session;
    if (!sessionId) {
      throw new Error('No active session');
    }

    try {
      chatStore.setLoading(true);
      
      // Add message to local state immediately for optimistic updates
      chatStore.addMessage({
        content,
        sender: 'player',
        type,
      });

      // Send via WebSocket for real-time updates
      webSocketService.sendMessage(content, type);

      // Also send via API for persistence
      const response = await api.chat.sendMessage(sessionId, content, type);
      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      chatStore.setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      chatStore.setLoading(false);
    }
  }, [chatStore, gameSessionStore.session]);

  // Roll dice
  const rollDice = useCallback(async (diceExpression: string) => {
    const { sessionId } = gameSessionStore.session;
    if (!sessionId) {
      throw new Error('No active session');
    }

    try {
      chatStore.setLoading(true);
      
      // Send dice roll via WebSocket
      webSocketService.rollDice(diceExpression);
      
      // Also send via API
      const response = await api.chat.rollDice(sessionId, diceExpression);
      if (!response.success) {
        throw new Error(response.error || 'Failed to roll dice');
      }
    } catch (error) {
      console.error('Failed to roll dice:', error);
      chatStore.setError(error instanceof Error ? error.message : 'Failed to roll dice');
    } finally {
      chatStore.setLoading(false);
    }
  }, [chatStore, gameSessionStore.session]);

  // Load chat history
  const loadChatHistory = useCallback(async (limit: number = 50, offset: number = 0) => {
    const { sessionId } = gameSessionStore.session;
    if (!sessionId) {
      return;
    }

    try {
      chatStore.setLoading(true);
      
      const response = await api.chat.getChatHistory(sessionId, limit, offset);
      if (response.success && response.data) {
        // Clear existing messages and add history
        chatStore.clearMessages();
        response.data.forEach(message => {
          chatStore.addMessage({
            content: message.content,
            sender: message.sender,
            type: message.type,
            metadata: message.metadata,
          });
        });
      } else {
        throw new Error(response.error || 'Failed to load chat history');
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      chatStore.setError(error instanceof Error ? error.message : 'Failed to load chat history');
    } finally {
      chatStore.setLoading(false);
    }
  }, [chatStore, gameSessionStore.session]);

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
    sendMessage,
    rollDice,
    loadChatHistory,
    clearMessages: chatStore.clearMessages,
    setError: chatStore.setError,
  };
};