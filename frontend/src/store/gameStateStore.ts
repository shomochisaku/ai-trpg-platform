import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { GameState, PlayerStatus, GameStateStore } from '../types';
import { StateChanges, StatusTag, InventoryItem, DiceResult } from '../types/status';
import { webSocketService } from '../services/websocket';

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
      currentDiceResult: null,
      
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
          { gameState: initialGameState, currentDiceResult: null },
          false,
          'resetGameState'
        );
      },

      // Real-time sync handler
      handleStateChanges: (changes: StateChanges) => {
        const currentState = get().gameState;
        const currentPlayerStatus = currentState.playerStatus;
        
        set(
          (state) => {
            const newState = { ...state };
            
            // Handle status changes
            if (changes.statusChanges) {
              newState.gameState = {
                ...newState.gameState,
                playerStatus: {
                  ...newState.gameState.playerStatus,
                  ...changes.statusChanges,
                },
              };
            }
            
            // Handle status tags changes
            if (changes.addedTags || changes.removedTags || changes.updatedTags) {
              let statusTags = [...(currentPlayerStatus.statusTags || [])];
              
              // Remove tags
              if (changes.removedTags?.length) {
                statusTags = statusTags.filter(tag => 
                  typeof tag === 'string' ? 
                    !changes.removedTags.includes(tag) : 
                    !changes.removedTags.includes(tag.id || tag)
                );
              }
              
              // Add new tags
              if (changes.addedTags?.length) {
                statusTags = [...statusTags, ...changes.addedTags];
              }
              
              // Update existing tags
              if (changes.updatedTags?.length) {
                changes.updatedTags.forEach(updatedTag => {
                  const index = statusTags.findIndex(tag => 
                    typeof tag === 'string' ? 
                      tag === updatedTag.id : 
                      (tag.id || tag) === updatedTag.id
                  );
                  if (index !== -1) {
                    statusTags[index] = updatedTag;
                  }
                });
              }
              
              newState.gameState = {
                ...newState.gameState,
                playerStatus: {
                  ...newState.gameState.playerStatus,
                  statusTags,
                },
              };
            }
            
            // Handle inventory changes
            if (changes.inventoryChanges?.length) {
              let inventory = [...(currentPlayerStatus.inventory || [])];
              
              changes.inventoryChanges.forEach(change => {
                switch (change.type) {
                  case 'add':
                    const existingIndex = inventory.findIndex(item => 
                      typeof item === 'string' ? 
                        item === change.item.name : 
                        item.id === change.item.id
                    );
                    if (existingIndex !== -1 && typeof inventory[existingIndex] !== 'string') {
                      // Update quantity if item exists and is an object
                      const existingItem = inventory[existingIndex] as InventoryItem;
                      if (existingItem.quantity !== undefined) {
                        existingItem.quantity += change.quantity || 1;
                      }
                    } else {
                      // Add new item
                      inventory.push(change.item);
                    }
                    break;
                  case 'remove':
                    inventory = inventory.filter(item => 
                      typeof item === 'string' ? 
                        item !== change.item.name : 
                        item.id !== change.item.id
                    );
                    break;
                  case 'update':
                    const updateIndex = inventory.findIndex(item => 
                      typeof item === 'string' ? 
                        item === change.item.name : 
                        item.id === change.item.id
                    );
                    if (updateIndex !== -1) {
                      inventory[updateIndex] = change.item;
                    }
                    break;
                }
              });
              
              newState.gameState = {
                ...newState.gameState,
                playerStatus: {
                  ...newState.gameState.playerStatus,
                  inventory,
                },
              };
            }
            
            newState.gameState.lastUpdate = new Date();
            return newState;
          },
          false,
          'handleStateChanges'
        );
      },

      // Dice result display
      showDiceResult: (result: DiceResult) => {
        set(
          (state) => ({ ...state, currentDiceResult: result }),
          false,
          'showDiceResult'
        );
      },

      hideDiceResult: () => {
        set(
          (state) => ({ ...state, currentDiceResult: null }),
          false,
          'hideDiceResult'
        );
      },
    }),
    {
      name: 'game-state-store',
    }
  )
);

// Initialize WebSocket event listeners
let isInitialized = false;

export const initializeGameStateSync = () => {
  if (isInitialized) return;
  
  const { handleStateChanges, showDiceResult } = useGameStateStore.getState();
  
  // Listen for game state updates
  webSocketService.on('gameState:update', (data) => {
    console.log('Received game state update:', data);
    if (data.changes && handleStateChanges) {
      handleStateChanges(data.changes);
    }
  });
  
  // Listen for dice results
  webSocketService.on('game:dice-result', (result) => {
    console.log('Received dice result:', result);
    if (showDiceResult) {
      showDiceResult(result);
    }
  });
  
  isInitialized = true;
};