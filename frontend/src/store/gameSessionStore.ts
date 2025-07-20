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
    (set, get) => {
      const store = {
        session: initialGameSession,
      
        updateSession: (updates: Partial<GameSession>) => {
          console.log('[GameSessionStore] updateSession called with:', updates);
          console.log('[GameSessionStore] Current state before update:', get().session);
          
          set(
            (state) => {
              const newSession = {
                ...state.session,
                ...updates,
                lastActivity: new Date(),
              };
              console.log('[GameSessionStore] Session updating from:', state.session);
              console.log('[GameSessionStore] Session updating to:', newSession);
              
              return { session: newSession };
            },
            true, // Replace entire state to force re-render
            'updateSession'
          );
          
          // Force immediate state verification and subscriber notification
          setTimeout(() => {
            const currentState = get().session;
            console.log('[GameSessionStore] Post-update verification:', currentState);
            if (JSON.stringify(currentState.sessionId) !== JSON.stringify(updates.sessionId) && updates.sessionId !== undefined) {
              console.error('[GameSessionStore] STATE UPDATE FAILED!');
              // Force another update
              set(
                (state) => ({ ...state, session: { ...state.session, ...updates, lastActivity: new Date() } }),
                true,
                'updateSession-retry'
              );
            }
          }, 0);
        },
      
      resetSession: () => {
        set(
          { session: initialGameSession },
          false,
          'resetSession'
        );
      },
      
        connect: (sessionId: string, playerId: string, characterName: string) => {
          console.log('[GameSessionStore] connect() called with:', { sessionId, playerId, characterName });
          console.log('[GameSessionStore] Current state before connect:', get().session);
          
          const newSession = {
            sessionId,
            playerId,
            characterName,
            isConnected: true,
            lastActivity: new Date(),
          };
          
          set(
            () => ({ session: newSession }),
            true, // Replace entire state to force re-render
            'connect'
          );
          
          console.log('[GameSessionStore] Connect executed, new session:', newSession);
          
          // Multiple verification attempts with forced updates
          let verificationAttempts = 0;
          const verifyConnection = () => {
            verificationAttempts++;
            const currentState = get().session;
            console.log(`[GameSessionStore] Verification attempt ${verificationAttempts}:`, currentState);
            
            const isValid = currentState.sessionId === sessionId && 
                           currentState.playerId === playerId && 
                           currentState.characterName === characterName;
            
            if (!isValid && verificationAttempts < 3) {
              console.log('[GameSessionStore] Connection verification failed, retrying...');
              set(() => ({ session: newSession }), true, `connect-retry-${verificationAttempts}`);
              setTimeout(verifyConnection, 10);
            } else {
              console.log('[GameSessionStore] Connection verification complete:', { 
                success: isValid, 
                attempts: verificationAttempts 
              });
            }
          };
          
          setTimeout(verifyConnection, 0);
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
      };
      
      return store;
    },
    {
      name: 'game-session-store',
    }
  )
);

// Direct store access function
export const getGameSessionState = () => {
  return useGameSessionStore.getState().session;
};