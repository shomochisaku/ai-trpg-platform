import { ApiResponse, GameSession, ChatMessage, PlayerStatus } from '../types';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Error handling utility
class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        errorData
      );
    }

    const data = await response.json();
    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date(),
    };
  }
}

// Game Session API
export const gameSessionApi = {
  // Create a new game session
  createSession: async (characterName: string): Promise<ApiResponse<GameSession>> => {
    return apiRequest<GameSession>('/api/campaigns/sessions', {
      method: 'POST',
      body: JSON.stringify({ characterName }),
    });
  },

  // Join an existing session
  joinSession: async (sessionId: string, playerId: string): Promise<ApiResponse<GameSession>> => {
    return apiRequest<GameSession>(`/api/campaigns/sessions/${sessionId}/join`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    });
  },

  // Get session details
  getSession: async (sessionId: string): Promise<ApiResponse<GameSession>> => {
    return apiRequest<GameSession>(`/api/campaigns/sessions/${sessionId}`);
  },

  // End a session
  endSession: async (sessionId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/api/campaigns/sessions/${sessionId}/end`, {
      method: 'POST',
    });
  },
};

// Chat API
export const chatApi = {
  // Send a message
  sendMessage: async (
    sessionId: string,
    content: string,
    type: ChatMessage['type'] = 'message'
  ): Promise<ApiResponse<ChatMessage>> => {
    return apiRequest<ChatMessage>(`/api/campaigns/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  },

  // Get chat history
  getChatHistory: async (
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ApiResponse<ChatMessage[]>> => {
    return apiRequest<ChatMessage[]>(
      `/api/campaigns/sessions/${sessionId}/messages?limit=${limit}&offset=${offset}`
    );
  },

  // Roll dice
  rollDice: async (
    sessionId: string,
    diceExpression: string
  ): Promise<ApiResponse<ChatMessage>> => {
    return apiRequest<ChatMessage>(`/api/campaigns/sessions/${sessionId}/dice`, {
      method: 'POST',
      body: JSON.stringify({ dice: diceExpression }),
    });
  },
};

// Game State API
export const gameStateApi = {
  // Get current game state
  getGameState: async (sessionId: string): Promise<ApiResponse<PlayerStatus>> => {
    return apiRequest<PlayerStatus>(`/api/campaigns/sessions/${sessionId}/state`);
  },

  // Update player status
  updatePlayerStatus: async (
    sessionId: string,
    updates: Partial<PlayerStatus>
  ): Promise<ApiResponse<PlayerStatus>> => {
    return apiRequest<PlayerStatus>(`/api/campaigns/sessions/${sessionId}/state`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Update status tags
  updateStatusTags: async (
    sessionId: string,
    statusTags: string[]
  ): Promise<ApiResponse<PlayerStatus>> => {
    return apiRequest<PlayerStatus>(`/api/campaigns/sessions/${sessionId}/status-tags`, {
      method: 'PUT',
      body: JSON.stringify({ statusTags }),
    });
  },

  // Update inventory
  updateInventory: async (
    sessionId: string,
    inventory: string[]
  ): Promise<ApiResponse<PlayerStatus>> => {
    return apiRequest<PlayerStatus>(`/api/campaigns/sessions/${sessionId}/inventory`, {
      method: 'PUT',
      body: JSON.stringify({ inventory }),
    });
  },

  // Update notes
  updateNotes: async (
    sessionId: string,
    notes: string
  ): Promise<ApiResponse<PlayerStatus>> => {
    return apiRequest<PlayerStatus>(`/api/campaigns/sessions/${sessionId}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  },
};

// Health check API
export const healthApi = {
  checkHealth: async (): Promise<ApiResponse<{ status: string; timestamp: string }>> => {
    return apiRequest<{ status: string; timestamp: string }>('/api/health');
  },
};

// Export all APIs
export const api = {
  gameSession: gameSessionApi,
  chat: chatApi,
  gameState: gameStateApi,
  health: healthApi,
};

export default api;