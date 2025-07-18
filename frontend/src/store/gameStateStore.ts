import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { GameState, PlayerStatus, GameStateStore } from '../types';

const initialPlayerStatus: PlayerStatus = {
  health: 100,
  maxHealth: 100,
  statusTags: [],
  currentScene: '',
  inventory: [],
  notes: '',
};

const initialGameState: GameState = {
  currentScene: '',
  playerStatus: initialPlayerStatus,
  gameMode: 'playing',
  lastUpdate: null,
};

export const useGameStateStore = create<GameStateStore>()(
  devtools(
    (set, get) => ({
      gameState: initialGameState,
      
      updateGameState: (updates) => {
        set(
          (state) => ({
            gameState: {
              ...state.gameState,
              ...updates,
              lastUpdate: new Date(),
            },
          }),
          false,
          'updateGameState'
        );
      },
      
      updatePlayerStatus: (updates) => {
        set(
          (state) => ({
            gameState: {
              ...state.gameState,
              playerStatus: {
                ...state.gameState.playerStatus,
                ...updates,
              },
              lastUpdate: new Date(),
            },
          }),
          false,
          'updatePlayerStatus'
        );
      },
      
      resetGameState: () => {
        set(
          { gameState: initialGameState },
          false,
          'resetGameState'
        );
      },
    }),
    {
      name: 'game-state-store',
    }
  )
);