import { ApiResponse } from '../types';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Campaign Types (matching backend)
export interface Campaign {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: string;
  aiSettings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignSettings {
  gmProfile: {
    personality: string;
    speechStyle: string;
    guidingPrinciples: string[];
  };
  worldSettings: {
    toneAndManner: string;
    keyConcepts: string[];
  };
  opening: {
    prologue: string;
    initialStatusTags: string[];
    initialInventory: string[];
  };
}

export interface CreateCampaignData {
  userId: string;
  title: string;
  description?: string;
  settings: CampaignSettings;
}

export interface PlayerActionResult {
  campaignId: string;
  playerId: string;
  action: string;
  narrative: string;
  gameState: Record<string, unknown>;
  suggestedActions: string[];
  diceResults: Record<string, unknown>;
  workflowSuccess: boolean;
  error?: string;
}

// Error handling utility
class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public response?: Record<string, unknown>
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

// Campaign API
export const campaignApi = {
  // Create a new campaign
  createCampaign: async (data: CreateCampaignData): Promise<ApiResponse<Campaign>> => {
    return apiRequest<Campaign>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get campaign details
  getCampaign: async (campaignId: string): Promise<ApiResponse<Campaign>> => {
    return apiRequest<Campaign>(`/api/campaigns/${campaignId}`);
  },

  // List campaigns for user
  listCampaigns: async (userId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ campaigns: Campaign[]; total: number }>> => {
    const params = new URLSearchParams({ userId });
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    return apiRequest<{ campaigns: Campaign[]; total: number }>(`/api/campaigns?${params}`);
  },

  // Update campaign
  updateCampaign: async (campaignId: string, data: Partial<CreateCampaignData>): Promise<ApiResponse<Campaign>> => {
    return apiRequest<Campaign>(`/api/campaigns/${campaignId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete campaign
  deleteCampaign: async (campaignId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/api/campaigns/${campaignId}`, {
      method: 'DELETE',
    });
  },

  // Get campaign statistics
  getCampaignStats: async (campaignId: string): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiRequest<Record<string, unknown>>(`/api/campaigns/${campaignId}/stats`);
  },
};

// Player Action API
export const actionApi = {
  // Process player action
  processAction: async (
    campaignId: string,
    playerId: string,
    action: string
  ): Promise<ApiResponse<PlayerActionResult>> => {
    return apiRequest<PlayerActionResult>(`/api/campaigns/${campaignId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, playerId }),
    });
  },
};

// Game State API (uses campaign data)
export const gameStateApi = {
  // Get current game state from campaign
  getGameState: async (campaignId: string): Promise<ApiResponse<Campaign>> => {
    return campaignApi.getCampaign(campaignId);
  },

  // Game state updates are handled through player actions
  // Use actionApi.processAction() to update game state
};

// Health check API
export const healthApi = {
  checkHealth: async (): Promise<ApiResponse<{ status: string; timestamp: string }>> => {
    return apiRequest<{ status: string; timestamp: string }>('/api/health');
  },
};

// Export all APIs
export const api = {
  campaign: campaignApi,
  action: actionApi,
  gameState: gameStateApi,
  health: healthApi,
};

export default api;