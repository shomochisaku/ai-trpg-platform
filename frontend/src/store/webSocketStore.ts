import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { WebSocketState, WebSocketStore } from '../types';

const initialWebSocketState: WebSocketState = {
  isConnected: false,
  isConnecting: false,
  lastConnected: null,
  connectionAttempts: 0,
  error: null,
};

export const useWebSocketStore = create<WebSocketStore>()(
  devtools(
    (set) => ({
      websocket: initialWebSocketState,
      
      setConnected: (connected) => {
        set(
          (state) => ({
            websocket: {
              ...state.websocket,
              isConnected: connected,
              isConnecting: false,
              lastConnected: connected ? new Date() : state.websocket.lastConnected,
              error: connected ? null : state.websocket.error,
            },
          }),
          false,
          'setConnected'
        );
      },
      
      setConnecting: (connecting) => {
        set(
          (state) => ({
            websocket: {
              ...state.websocket,
              isConnecting: connecting,
              error: connecting ? null : state.websocket.error,
            },
          }),
          false,
          'setConnecting'
        );
      },
      
      setError: (error) => {
        set(
          (state) => ({
            websocket: {
              ...state.websocket,
              error,
              isConnecting: false,
              isConnected: false,
            },
          }),
          false,
          'setError'
        );
      },
      
      incrementConnectionAttempts: () => {
        set(
          (state) => ({
            websocket: {
              ...state.websocket,
              connectionAttempts: state.websocket.connectionAttempts + 1,
            },
          }),
          false,
          'incrementConnectionAttempts'
        );
      },
      
      resetConnectionAttempts: () => {
        set(
          (state) => ({
            websocket: {
              ...state.websocket,
              connectionAttempts: 0,
            },
          }),
          false,
          'resetConnectionAttempts'
        );
      },
    }),
    {
      name: 'websocket-store',
    }
  )
);