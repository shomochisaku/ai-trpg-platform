// Game Session Types
export interface GameSession {
  sessionId: string | null;
  playerId: string | null;
  characterName: string | null;
  isConnected: boolean;
  lastActivity: Date | null;
}

// Chat Message Types
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'player' | 'gm';
  timestamp: Date;
  type: 'message' | 'system' | 'dice-roll' | 'status-update';
  metadata?: {
    diceRoll?: {
      dice: string;
      result: number;
    };
    statusUpdate?: {
      field: string;
      oldValue: string;
      newValue: string;
    };
  };
}

export interface ChatLog {
  messages: ChatMessage[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

// Game State Types
export interface PlayerStatus {
  health: number;
  maxHealth: number;
  statusTags: string[];
  currentScene: string;
  inventory: string[];
  notes: string;
}

export interface GameState {
  currentScene: string;
  playerStatus: PlayerStatus;
  gameMode: 'playing' | 'paused' | 'ended';
  lastUpdate: Date | null;
}

// WebSocket Connection Types
export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected: Date | null;
  connectionAttempts: number;
  error: string | null;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

// Store State Types
export interface GameSessionStore {
  session: GameSession;
  updateSession: (updates: Partial<GameSession>) => void;
  resetSession: () => void;
  connect: (sessionId: string, playerId: string, characterName: string) => void;
  disconnect: () => void;
}

export interface ChatStore {
  chat: ChatLog;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export interface GameStateStore {
  gameState: GameState;
  updateGameState: (updates: Partial<GameState>) => void;
  updatePlayerStatus: (updates: Partial<PlayerStatus>) => void;
  resetGameState: () => void;
  // Real-time sync support
  handleStateChanges?: (changes: any) => void;
  // Dice result display
  currentDiceResult?: any;
  showDiceResult: (result: any) => void;
  hideDiceResult: () => void;
}

export interface WebSocketStore {
  websocket: WebSocketState;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
  incrementConnectionAttempts: () => void;
  resetConnectionAttempts: () => void;
}

// Combined Store Type
export interface RootStore {
  gameSession: GameSessionStore;
  chat: ChatStore;
  gameState: GameStateStore;
  websocket: WebSocketStore;
}