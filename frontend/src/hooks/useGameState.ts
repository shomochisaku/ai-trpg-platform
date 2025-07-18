import { useEffect, useCallback } from 'react';
import { useGameStateStore, useGameSessionStore } from '../store';
import { api, webSocketService } from '../services';
import { PlayerStatus } from '../types';

export const useGameState = () => {
  const gameStateStore = useGameStateStore();
  const gameSessionStore = useGameSessionStore();

  // Update player status
  const updatePlayerStatus = useCallback(async (updates: Partial<PlayerStatus>) => {
    const { sessionId } = gameSessionStore.session;
    if (!sessionId) {
      throw new Error('No active session');
    }

    try {
      // Update local state immediately for optimistic updates
      gameStateStore.updatePlayerStatus(updates);

      // Send updates via WebSocket for real-time sync
      webSocketService.updatePlayerStatus(updates);

      // Also send via API for persistence
      const response = await api.gameState.updatePlayerStatus(sessionId, updates);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update player status');
      }

      // Update with server response if available
      if (response.data) {
        gameStateStore.updatePlayerStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to update player status:', error);
      // Revert optimistic update on error
      // Note: In a real app, you might want to keep track of previous state
      throw error;
    }
  }, [gameStateStore, gameSessionStore.session.sessionId]);

  // Update status tags
  const updateStatusTags = useCallback(async (statusTags: string[]) => {
    const { sessionId } = gameSessionStore.session;
    if (!sessionId) {
      throw new Error('No active session');
    }

    try {
      const response = await api.gameState.updateStatusTags(sessionId, statusTags);
      if (response.success && response.data) {
        gameStateStore.updatePlayerStatus({ statusTags: response.data.statusTags });
      } else {
        throw new Error(response.error || 'Failed to update status tags');
      }
    } catch (error) {
      console.error('Failed to update status tags:', error);
      throw error;
    }
  }, [gameStateStore, gameSessionStore.session.sessionId]);

  // Update inventory
  const updateInventory = useCallback(async (inventory: string[]) => {
    const { sessionId } = gameSessionStore.session;
    if (!sessionId) {
      throw new Error('No active session');
    }

    try {
      const response = await api.gameState.updateInventory(sessionId, inventory);
      if (response.success && response.data) {
        gameStateStore.updatePlayerStatus({ inventory: response.data.inventory });
      } else {
        throw new Error(response.error || 'Failed to update inventory');
      }
    } catch (error) {
      console.error('Failed to update inventory:', error);
      throw error;
    }
  }, [gameStateStore, gameSessionStore.session.sessionId]);

  // Update notes
  const updateNotes = useCallback(async (notes: string) => {
    const { sessionId } = gameSessionStore.session;
    if (!sessionId) {
      throw new Error('No active session');
    }

    try {
      const response = await api.gameState.updateNotes(sessionId, notes);
      if (response.success && response.data) {
        gameStateStore.updatePlayerStatus({ notes: response.data.notes });
      } else {
        throw new Error(response.error || 'Failed to update notes');
      }
    } catch (error) {
      console.error('Failed to update notes:', error);
      throw error;
    }
  }, [gameStateStore, gameSessionStore.session.sessionId]);

  // Load game state from server
  const loadGameState = useCallback(async () => {
    const { sessionId } = gameSessionStore.session;
    if (!sessionId) {
      return;
    }

    try {
      const response = await api.gameState.getGameState(sessionId);
      if (response.success && response.data) {
        gameStateStore.updatePlayerStatus(response.data);
      } else {
        throw new Error(response.error || 'Failed to load game state');
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
      throw error;
    }
  }, [gameStateStore, gameSessionStore.session.sessionId]);

  // Set up WebSocket event listeners
  useEffect(() => {
    const handleStatusUpdate = (status: PlayerStatus) => {
      gameStateStore.updatePlayerStatus(status);
    };

    const handleSceneChange = (scene: string) => {
      gameStateStore.updateGameState({ currentScene: scene });
      gameStateStore.updatePlayerStatus({ currentScene: scene });
    };

    // Add event listeners
    webSocketService.on('game:status-update', handleStatusUpdate);
    webSocketService.on('game:scene-change', handleSceneChange);

    // Cleanup on unmount
    return () => {
      webSocketService.off('game:status-update', handleStatusUpdate);
      webSocketService.off('game:scene-change', handleSceneChange);
    };
  }, [gameStateStore]);

  // Load game state when session is established
  useEffect(() => {
    if (gameSessionStore.session.sessionId && gameSessionStore.session.isConnected) {
      loadGameState();
    }
  }, [gameSessionStore.session.sessionId, gameSessionStore.session.isConnected, loadGameState]);

  return {
    gameState: gameStateStore.gameState,
    updatePlayerStatus,
    updateStatusTags,
    updateInventory,
    updateNotes,
    updateGameState: gameStateStore.updateGameState,
    resetGameState: gameStateStore.resetGameState,
    loadGameState,
  };
};