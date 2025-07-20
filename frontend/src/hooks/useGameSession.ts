import { useEffect, useCallback, useState } from 'react';
import { useGameSessionStore, useWebSocketStore } from '../store';
import { api, webSocketService } from '../services';
import { Campaign, CreateCampaignData } from '../services/api';

// Backward compatibility alias
export const useGameSession = () => {
  return useCampaign();
};

export const useCampaign = () => {
  // Use Zustand selectors for proper subscription
  const session = useGameSessionStore((state) => state.session);
  const connect = useGameSessionStore((state) => state.connect);
  const updateSession = useGameSessionStore((state) => state.updateSession);
  const disconnect = useGameSessionStore((state) => state.disconnect);
  const resetSession = useGameSessionStore((state) => state.resetSession);
  
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
      console.log('[useCampaign] Starting connection process:', { campaignId, playerId, characterName });
      
      // Update local state to use campaign ID as session ID
      // IMPORTANT: Set playerId here to ensure it's available for processAction
      console.log('[useCampaign] Calling connect...');
      connect(campaignId, playerId, characterName);
      
      // Wait for store update to propagate
      await new Promise(resolve => {
        const checkStore = () => {
          const currentSession = useGameSessionStore.getState().session;
          console.log('[useCampaign] Checking store state:', currentSession);
          if (currentSession.sessionId === campaignId && currentSession.playerId === playerId) {
            console.log('[useCampaign] Store update confirmed!');
            resolve(void 0);
          } else {
            console.log('[useCampaign] Store not yet updated, waiting...');
            setTimeout(checkStore, 10);
          }
        };
        checkStore();
      });
      
      // Connect to WebSocket
      webSocketStore.setConnecting(true);
      await webSocketService.connect(campaignId, playerId);
      webSocketStore.setConnected(true);
      
      // Get campaign details from API
      const response = await api.campaign.getCampaign(campaignId);
      if (response.success && response.data) {
        // Handle double-wrapped response
        const responseRecord = response.data as unknown as Record<string, unknown>;
        const campaignData = responseRecord.data || response.data;
        setCurrentCampaign(campaignData as unknown as Campaign);
        
        // Final verification and forced update
        console.log('[useCampaign] Final session verification...');
        updateSession({
          sessionId: campaignId,
          playerId,
          characterName,
          isConnected: true,
          lastActivity: new Date(),
        });
        
        // Additional store propagation wait
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const finalSession = useGameSessionStore.getState().session;
        console.log('[useCampaign] Final session state:', finalSession);
        
        if (finalSession.sessionId !== campaignId || finalSession.playerId !== playerId) {
          throw new Error('Session state verification failed after connection');
        }
        
        console.log('[useCampaign] Campaign connected successfully:', {
          campaignId,
          playerId,
          characterName
        });
      }
    } catch (error) {
      console.error('Failed to connect to campaign:', error);
      webSocketStore.setError(error instanceof Error ? error.message : 'Connection failed');
      disconnect();
      throw error; // Re-throw to allow caller to handle
    } finally {
      setIsLoading(false);
    }
  }, [connect, disconnect, updateSession, webSocketStore]); // Include store dependencies

  // Create a new campaign
  const createCampaign = useCallback(async (data: CreateCampaignData, playerId: string, characterName?: string) => {
    try {
      setIsLoading(true);
      
      const response = await api.campaign.createCampaign(data);
      if (response.success && response.data) {
        // Handle double-wrapped response
        const responseRecord = response.data as unknown as Record<string, unknown>;
        const campaign = (responseRecord.data || response.data) as unknown as Campaign;
        // Use provided characterName or extract from title
        const charName = characterName || data.title.replace(/'s Adventure$/, '') || 'Player';
        await connectToCampaign(campaign.id, playerId, charName);
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
        // Handle double-wrapped response
        const responseRecord = response.data as unknown as Record<string, unknown>;
        const campaignData = responseRecord.data || response.data;
        return campaignData as unknown as Campaign;
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
      disconnect();
      setCurrentCampaign(null);
    } catch (error) {
      console.error('Failed to disconnect from campaign:', error);
    }
  }, [disconnect, webSocketStore]); // Include store dependencies

  // Simplified auto-reconnect effect
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session.sessionId && !webSocketService.isConnected()) {
        const { sessionId, playerId, characterName } = session;
        if (sessionId && playerId && characterName) {
          connectToCampaign(sessionId, playerId, characterName);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, connectToCampaign]); // Include necessary dependencies

  return {
    session,
    websocketState: webSocketStore.websocket,
    currentCampaign,
    isLoading,
    createCampaign,
    joinCampaign,
    connectToCampaign,
    disconnectFromCampaign,
    updateSession,
    resetSession,
    
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
      return createCampaign(defaultCampaignData, 'player-1', characterName);
    },
    joinSession: joinCampaign,
    disconnectFromSession: disconnectFromCampaign,
  };
};