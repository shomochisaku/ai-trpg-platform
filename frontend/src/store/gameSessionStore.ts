import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { GameSession, GameSessionStore } from '../types';

const initialGameSession: GameSession = {
  sessionId: null,
  playerId: null,
  characterName: null,
  isConnected: false,
  lastActivity: null,
};

export const useGameSessionStore = create<GameSessionStore>()(
  devtools(
    (set, get) => ({
      session: initialGameSession,
      
      updateSession: (updates) => {
        set(
          (state) => ({
            session: {
              ...state.session,
              ...updates,
              lastActivity: new Date(),
            },
          }),
          false,
          'updateSession'
        );
      },
      
      resetSession: () => {
        set(
          { session: initialGameSession },
          false,
          'resetSession'
        );
      },
      
      connect: (sessionId, playerId, characterName) => {
        set(
          (state) => ({
            session: {
              ...state.session,
              sessionId,
              playerId,
              characterName,
              isConnected: true,
              lastActivity: new Date(),
            },
          }),
          false,
          'connect'
        );
      },
      
      disconnect: () => {
        set(
          (state) => ({
            session: {
              ...state.session,
              isConnected: false,
              lastActivity: new Date(),
            },
          }),
          false,
          'disconnect'
        );
      },
    }),
    {
      name: 'game-session-store',
    }
  )
);