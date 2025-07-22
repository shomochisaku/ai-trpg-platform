import { useEffect, useState, useCallback, useRef } from 'react';
import { webSocketService } from '../services/websocket';
import { useGameStateStore } from '../store/gameStateStore';
import { useChatStore } from '../store/chatStore';
import { 
  GameStateUpdateEvent, 
  NarrativeUpdateEvent, 
  DiceResult,
  StateChanges
} from '../types/status';

interface UseRealtimeSyncReturn {
  isConnected: boolean;
  connectionStatus: string;
  diceResults: DiceResult[];
  clearDiceResults: () => void;
  stateChanges: StateChanges | null;
}

export const useRealtimeSync = (campaignId?: string): UseRealtimeSyncReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [diceResults, setDiceResults] = useState<DiceResult[]>([]);
  const [stateChanges, setStateChanges] = useState<StateChanges | null>(null);
  
  const { updateGameState } = useGameStateStore();
  const { addMessage } = useChatStore();
  
  const stateChangesTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!campaignId) return;

    // Subscribe to connection status changes
    const unsubscribeStatus = webSocketService.onConnectionStatusChange((status) => {
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
    });

    // Handle game state updates
    const handleGameStateUpdate = (event: GameStateUpdateEvent['data']) => {
      if (event.campaignId !== campaignId) return;

      // Update game state in store - convert from status GameState to store GameState
      // TODO: Unify GameState types across the project
      // For now, we're using mock data primarily

      // Set state changes for animation
      setStateChanges(event.changes);
      
      // Clear state changes after animations complete
      if (stateChangesTimeoutRef.current) {
        clearTimeout(stateChangesTimeoutRef.current);
      }
      stateChangesTimeoutRef.current = setTimeout(() => {
        setStateChanges(null);
      }, 1000);

      // Handle dice results if present
      if (event.diceResults && event.diceResults.length > 0) {
        setDiceResults(prev => [...prev, ...event.diceResults!]);
      }
    };

    // Handle narrative updates
    const handleNarrativeUpdate = (event: NarrativeUpdateEvent['data']) => {
      if (event.campaignId !== campaignId) return;

      addMessage({
        content: event.narrative,
        sender: 'gm',
        type: 'message',
      });
    };

    // Handle dice results
    const handleDiceResult = (result: DiceResult) => {
      setDiceResults(prev => [...prev, result]);
      
      // Add dice roll to chat
      addMessage({
        content: `Rolled ${result.dice}: ${result.total}${result.reason ? ` (${result.reason})` : ''}`,
        sender: 'gm',
        type: 'dice-roll',
        metadata: {
          diceRoll: {
            dice: result.dice,
            result: result.total,
          },
        },
      });
    };

    // Subscribe to WebSocket events
    webSocketService.on('gameState:update', handleGameStateUpdate);
    webSocketService.on('narrative:update', handleNarrativeUpdate);
    webSocketService.on('dice:result', handleDiceResult);

    // Request initial game state
    if (webSocketService.isConnected()) {
      webSocketService.requestGameState();
      webSocketService.subscribeToUpdates();
    }

    // Cleanup
    return () => {
      unsubscribeStatus();
      webSocketService.off('gameState:update', handleGameStateUpdate);
      webSocketService.off('narrative:update', handleNarrativeUpdate);
      webSocketService.off('dice:result', handleDiceResult);
      
      if (stateChangesTimeoutRef.current) {
        clearTimeout(stateChangesTimeoutRef.current);
      }
    };
  }, [campaignId, updateGameState, addMessage]);

  const clearDiceResults = useCallback(() => {
    setDiceResults([]);
  }, []);

  return {
    isConnected,
    connectionStatus,
    diceResults,
    clearDiceResults,
    stateChanges,
  };
};