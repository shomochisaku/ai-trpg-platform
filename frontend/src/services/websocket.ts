import { io, Socket } from 'socket.io-client';
import { ChatMessage, PlayerStatus } from '../types';
import { GameStateUpdateEvent, NarrativeUpdateEvent, DiceResult } from '../types/status';

// WebSocket event types
export interface WebSocketEvents {
  // Connection events
  connect: () => void;
  disconnect: () => void;
  error: (error: Error) => void;
  
  // Game events
  'game:message': (message: ChatMessage) => void;
  'game:status-update': (status: PlayerStatus) => void;
  'game:scene-change': (scene: string) => void;
  'game:player-join': (playerId: string, characterName: string) => void;
  'game:player-leave': (playerId: string) => void;
  'game:dice-result': (result: DiceResult) => void;
  
  // Real-time sync events
  'gameState:update': (event: GameStateUpdateEvent['data']) => void;
  'narrative:update': (event: NarrativeUpdateEvent['data']) => void;
  
  // System events
  'system:notification': (notification: { type: string; message: string }) => void;
  'system:error': (error: { message: string; code?: string }) => void;
}

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private sessionId: string | null = null;
  private playerId: string | null = null;

  constructor(
    private url: string = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
  ) {}

  // Initialize WebSocket connection
  connect(sessionId: string, playerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.sessionId = sessionId;
        this.playerId = playerId;

        this.socket = io(this.url, {
          transports: ['websocket'],
          autoConnect: false,
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          
          // Join the game session
          this.socket?.emit('join:session', {
            sessionId,
            playerId,
          });
          
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
          this.handleReconnect();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.handleReconnect();
          reject(error);
        });

        this.socket.connect();
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        reject(error);
      }
    });
  }

  // Disconnect WebSocket
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.sessionId = null;
    this.playerId = null;
    this.reconnectAttempts = 0;
  }

  // Handle reconnection
  private handleReconnect(): void {
    if (
      this.reconnectAttempts < this.maxReconnectAttempts &&
      this.sessionId &&
      this.playerId
    ) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      setTimeout(() => {
        this.connect(this.sessionId!, this.playerId!).catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    }
  }

  // Send message to the game session
  sendMessage(content: string, type: ChatMessage['type'] = 'message'): void {
    if (this.socket && this.sessionId) {
      this.socket.emit('game:send-message', {
        sessionId: this.sessionId,
        content,
        type,
      });
    }
  }

  // Roll dice
  rollDice(diceExpression: string): void {
    if (this.socket && this.sessionId) {
      this.socket.emit('game:roll-dice', {
        sessionId: this.sessionId,
        dice: diceExpression,
      });
    }
  }

  // Update player status
  updatePlayerStatus(updates: Partial<PlayerStatus>): void {
    if (this.socket && this.sessionId) {
      this.socket.emit('game:update-status', {
        sessionId: this.sessionId,
        updates,
      });
    }
  }

  // Event listeners
  on<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]): void {
    if (this.socket) {
      this.socket.on(event as string, listener as WebSocketEvents[K]);
    }
  }

  off<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]): void {
    if (this.socket) {
      this.socket.off(event as string, listener as WebSocketEvents[K]);
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket ID
  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  // Get connection attempts
  getConnectionAttempts(): number {
    return this.reconnectAttempts;
  }
}

// Create a singleton instance
export const webSocketService = new WebSocketService();

export default webSocketService;