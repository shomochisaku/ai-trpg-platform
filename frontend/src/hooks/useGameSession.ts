import { useEffect, useCallback, useState } from 'react';
import { useGameSessionStore, useWebSocketStore } from '../store';
import { api, webSocketService } from '../services';
import { Campaign, CreateCampaignData } from '../services/api';

// Backward compatibility alias
export const useGameSession = () => {
  return useCampaign();
};

export const useCampaign = () => {
  const gameSessionStore = useGameSessionStore();
  const webSocketStore = useWebSocketStore();
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Connect to a campaign
  const connectToCampaign = useCallback(async (
    campaignId: string,
    playerId: string,
    characterName: string
  ) => {
    try {
      setIsLoading(true);
      
      // Update local state to use campaign ID as session ID
      gameSessionStore.connect(campaignId, playerId, characterName);
      
      // Connect to WebSocket
      webSocketStore.setConnecting(true);
      await webSocketService.connect(campaignId, playerId);
      webSocketStore.setConnected(true);
      
      // Get campaign details from API
      const response = await api.campaign.getCampaign(campaignId);
      if (response.success && response.data) {
        setCurrentCampaign(response.data);
        // Convert campaign to session format for backward compatibility
        gameSessionStore.updateSession({
          sessionId: campaignId,
          playerId,
          characterName,
          isConnected: true,
          lastActivity: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to connect to campaign:', error);
      webSocketStore.setError(error instanceof Error ? error.message : 'Connection failed');
      gameSessionStore.disconnect();
    } finally {
      setIsLoading(false);
    }
  }, [gameSessionStore, webSocketStore]);

  // Create a new campaign
  const createCampaign = useCallback(async (data: CreateCampaignData, playerId: string) => {
    try {
      setIsLoading(true);
      
      const response = await api.campaign.createCampaign(data);
      if (response.success && response.data) {
        const campaign = response.data;
        await connectToCampaign(campaign.id, playerId, 'Player');
        return campaign;
      }
      throw new Error(response.error || 'Failed to create campaign');
    } catch (error) {
      console.error('Failed to create campaign:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [connectToCampaign]);

  // Join an existing campaign (simplified for MVP)
  const joinCampaign = useCallback(async (campaignId: string, playerId: string) => {
    try {
      setIsLoading(true);
      
      const response = await api.campaign.getCampaign(campaignId);
      if (response.success && response.data) {
        await connectToCampaign(campaignId, playerId, 'Player');
        return response.data;
      }
      throw new Error(response.error || 'Failed to join campaign');
    } catch (error) {
      console.error('Failed to join campaign:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [connectToCampaign]);

  // Disconnect from campaign
  const disconnectFromCampaign = useCallback(async () => {
    try {
      // Disconnect WebSocket
      webSocketService.disconnect();
      webSocketStore.setConnected(false);
      
      // Clear local state
      gameSessionStore.disconnect();
      setCurrentCampaign(null);
    } catch (error) {
      console.error('Failed to disconnect from campaign:', error);
    }
  }, [gameSessionStore, webSocketStore]);

  // Auto-reconnect effect
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && gameSessionStore.session.sessionId) {
        // Check if we're still connected
        if (!webSocketService.isConnected()) {
          const { sessionId, playerId, characterName } = gameSessionStore.session;
          if (sessionId && playerId && characterName) {
            connectToCampaign(sessionId, playerId, characterName);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gameSessionStore.session, connectToCampaign]);

  return {
    session: gameSessionStore.session,
    websocketState: webSocketStore.websocket,
    currentCampaign,
    isLoading,
    createCampaign,
    joinCampaign,
    connectToCampaign,
    disconnectFromCampaign,
    updateSession: gameSessionStore.updateSession,
    resetSession: gameSessionStore.resetSession,
    
    // Backward compatibility
    createSession: (characterName: string) => {
      const defaultCampaignData: CreateCampaignData = {
        userId: 'default-user',
        title: `${characterName}'s Adventure`,
        settings: {
          gmProfile: {
            personality: 'Friendly and engaging',
            speechStyle: 'Casual but immersive',
            guidingPrinciples: ['Fair', 'Fun', 'Engaging'],
          },
          worldSettings: {
            toneAndManner: 'Fantasy adventure',
            keyConcepts: ['Magic', 'Adventure', 'Exploration'],
          },
          opening: {
            prologue: 'Your adventure begins in a mysterious land...',
            initialStatusTags: ['Healthy', 'Eager'],
            initialInventory: ['Basic sword', 'Simple clothes', 'Small pouch'],
          },
        },
      };
      return createCampaign(defaultCampaignData, 'player-1');
    },
    joinSession: joinCampaign,
    disconnectFromSession: disconnectFromCampaign,
  };
};