import { useEffect, useCallback } from 'react';
import { useGameSessionStore, useWebSocketStore } from '../store';
import { api, webSocketService } from '../services';
import { GameSession } from '../types';

export const useGameSession = () => {
  const gameSessionStore = useGameSessionStore();
  const webSocketStore = useWebSocketStore();

  // Connect to a game session
  const connectToSession = useCallback(async (
    sessionId: string,
    playerId: string,
    characterName: string
  ) => {
    try {
      // Update local state
      gameSessionStore.connect(sessionId, playerId, characterName);
      
      // Connect to WebSocket
      webSocketStore.setConnecting(true);
      await webSocketService.connect(sessionId, playerId);
      webSocketStore.setConnected(true);
      
      // Get session details from API
      const response = await api.gameSession.getSession(sessionId);
      if (response.success && response.data) {
        gameSessionStore.updateSession(response.data);
      }
    } catch (error) {
      console.error('Failed to connect to session:', error);
      webSocketStore.setError(error instanceof Error ? error.message : 'Connection failed');
      gameSessionStore.disconnect();
    }
  }, [gameSessionStore, webSocketStore]);

  // Create a new game session
  const createSession = useCallback(async (characterName: string) => {
    try {
      const response = await api.gameSession.createSession(characterName);
      if (response.success && response.data) {
        const session = response.data;
        await connectToSession(session.sessionId!, session.playerId!, characterName);
        return session;
      }
      throw new Error(response.error || 'Failed to create session');
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }, [connectToSession]);

  // Join an existing session
  const joinSession = useCallback(async (sessionId: string, playerId: string) => {
    try {
      const response = await api.gameSession.joinSession(sessionId, playerId);
      if (response.success && response.data) {
        const session = response.data;
        await connectToSession(sessionId, playerId, session.characterName || '');
        return session;
      }
      throw new Error(response.error || 'Failed to join session');
    } catch (error) {
      console.error('Failed to join session:', error);
      throw error;
    }
  }, [connectToSession]);

  // Disconnect from session
  const disconnectFromSession = useCallback(async () => {
    try {
      const { sessionId } = gameSessionStore.session;
      
      // Disconnect WebSocket
      webSocketService.disconnect();
      webSocketStore.setConnected(false);
      
      // End session via API if we have a session ID
      if (sessionId) {
        await api.gameSession.endSession(sessionId);
      }
      
      // Clear local state
      gameSessionStore.disconnect();
    } catch (error) {
      console.error('Failed to disconnect from session:', error);
    }
  }, [gameSessionStore, webSocketStore]);

  // Auto-reconnect effect
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && gameSessionStore.session.sessionId) {
        // Check if we're still connected
        if (!webSocketService.isConnected()) {
          const { sessionId, playerId, characterName } = gameSessionStore.session;
          if (sessionId && playerId && characterName) {
            connectToSession(sessionId, playerId, characterName);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gameSessionStore.session, connectToSession]);

  return {
    session: gameSessionStore.session,
    websocketState: webSocketStore.websocket,
    createSession,
    joinSession,
    connectToSession,
    disconnectFromSession,
    updateSession: gameSessionStore.updateSession,
    resetSession: gameSessionStore.resetSession,
  };
};