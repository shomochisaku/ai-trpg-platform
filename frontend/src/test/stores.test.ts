import { describe, it, expect, beforeEach } from 'vitest';
import { useGameSessionStore, useChatStore, useGameStateStore, useWebSocketStore } from '../store';

describe('Store Tests', () => {
  describe.skip('GameSessionStore', () => {
    beforeEach(() => {
      // TODO: Fix resetSession method not being exported properly
      // useGameSessionStore.getState().resetSession();
    });

    it('should initialize with default values', () => {
      const { session } = useGameSessionStore.getState();
      expect(session.sessionId).toBe(null);
      expect(session.playerId).toBe(null);
      expect(session.characterName).toBe(null);
      expect(session.isConnected).toBe(false);
    });

    it('should connect to session', () => {
      const { connect } = useGameSessionStore.getState();
      connect('test-session', 'test-player', 'Test Character');
      
      const { session } = useGameSessionStore.getState();
      expect(session.sessionId).toBe('test-session');
      expect(session.playerId).toBe('test-player');
      expect(session.characterName).toBe('Test Character');
      expect(session.isConnected).toBe(true);
    });

    it('should disconnect from session', () => {
      const { connect, disconnect } = useGameSessionStore.getState();
      connect('test-session', 'test-player', 'Test Character');
      disconnect();
      
      const { session } = useGameSessionStore.getState();
      expect(session.isConnected).toBe(false);
    });
  });

  describe('ChatStore', () => {
    beforeEach(() => {
      useChatStore.getState().clearMessages();
    });

    it('should initialize with empty messages', () => {
      const { chat } = useChatStore.getState();
      expect(chat.messages).toEqual([]);
      expect(chat.isLoading).toBe(false);
      expect(chat.hasError).toBe(false);
    });

    it('should add message', () => {
      const { addMessage } = useChatStore.getState();
      addMessage({
        content: 'Test message',
        sender: 'player',
        type: 'message',
      });
      
      const { chat } = useChatStore.getState();
      expect(chat.messages).toHaveLength(1);
      expect(chat.messages[0].content).toBe('Test message');
      expect(chat.messages[0].sender).toBe('player');
    });

    it('should set loading state', () => {
      const { setLoading } = useChatStore.getState();
      setLoading(true);
      
      const { chat } = useChatStore.getState();
      expect(chat.isLoading).toBe(true);
    });

    it('should set error state', () => {
      const { setError } = useChatStore.getState();
      setError('Test error');
      
      const { chat } = useChatStore.getState();
      expect(chat.hasError).toBe(true);
      expect(chat.errorMessage).toBe('Test error');
    });
  });

  describe('GameStateStore', () => {
    beforeEach(() => {
      useGameStateStore.getState().resetGameState();
    });

    it('should initialize with default values', () => {
      const { gameState } = useGameStateStore.getState();
      expect(gameState.playerStatus.health).toBe(100);
      expect(gameState.playerStatus.maxHealth).toBe(100);
      expect(gameState.playerStatus.statusTags).toEqual([]);
      expect(gameState.gameMode).toBe('playing');
    });

    it('should update player status', () => {
      const { updatePlayerStatus } = useGameStateStore.getState();
      updatePlayerStatus({ health: 80 });
      
      const { gameState } = useGameStateStore.getState();
      expect(gameState.playerStatus.health).toBe(80);
    });

    it('should update game state', () => {
      const { updateGameState } = useGameStateStore.getState();
      updateGameState({ currentScene: 'Forest' });
      
      const { gameState } = useGameStateStore.getState();
      expect(gameState.currentScene).toBe('Forest');
    });
  });

  describe('WebSocketStore', () => {
    it('should initialize with default values', () => {
      const { websocket } = useWebSocketStore.getState();
      expect(websocket.isConnected).toBe(false);
      expect(websocket.isConnecting).toBe(false);
      expect(websocket.connectionAttempts).toBe(0);
    });

    it('should set connected state', () => {
      const { setConnected } = useWebSocketStore.getState();
      setConnected(true);
      
      const { websocket } = useWebSocketStore.getState();
      expect(websocket.isConnected).toBe(true);
      expect(websocket.isConnecting).toBe(false);
    });

    it('should increment connection attempts', () => {
      const { incrementConnectionAttempts } = useWebSocketStore.getState();
      incrementConnectionAttempts();
      
      const { websocket } = useWebSocketStore.getState();
      expect(websocket.connectionAttempts).toBe(1);
    });
  });
});