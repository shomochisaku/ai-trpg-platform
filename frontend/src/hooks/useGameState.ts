import { useEffect, useCallback } from 'react';
import { useGameStateStore, useGameSessionStore } from '../store';
import { api, webSocketService } from '../services';
import { PlayerStatus } from '../types';

export const useGameState = () => {
  const gameStateStore = useGameStateStore();
  const gameSessionStore = useGameSessionStore();

  // Simplified player status update (local only - real updates go through processAction)
  const updatePlayerStatus = useCallback((updates: Partial<PlayerStatus>) => {
    // Update local state only - real updates should go through processAction API
    gameStateStore.updatePlayerStatus(updates);
  }, []); // Empty dependency array - store methods are stable

  // Load game state from campaign data
  const loadGameState = useCallback(async () => {
    const { sessionId } = gameSessionStore.session;
    if (!sessionId) {
      return;
    }

    try {
      const response = await api.gameState.getGameState(sessionId);
      if (response.success && response.data) {
        // Extract game state from campaign metadata
        const campaign = response.data;
        if (campaign.metadata && campaign.metadata.gameState) {
          const gameState = campaign.metadata.gameState as Record<string, unknown>;
          gameStateStore.updateGameState({
            currentScene: (gameState.currentScene as string) || '',
            gameMode: (gameState.gameMode as 'playing' | 'paused' | 'ended') || 'playing',
            lastUpdate: new Date(),
            playerStatus: gameState.playerStatus as PlayerStatus || gameStateStore.gameState.playerStatus,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
    }
  }, [gameSessionStore.session.sessionId]); // Only depend on specific session value

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
  }, []); // Empty dependency array - WebSocket handlers are stable

  // Load game state when session is established
  useEffect(() => {
    if (gameSessionStore.session.sessionId && gameSessionStore.session.isConnected) {
      loadGameState();
    }
  }, [gameSessionStore.session.sessionId, gameSessionStore.session.isConnected, loadGameState]);

  return {
    gameState: gameStateStore.gameState,
    updatePlayerStatus,
    updateGameState: gameStateStore.updateGameState,
    resetGameState: gameStateStore.resetGameState,
    loadGameState,
  };
};