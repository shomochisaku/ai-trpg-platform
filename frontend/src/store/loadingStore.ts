import React from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface LoadingState {
  id: string;
  message: string;
  startTime: number;
  type: 'ai-response' | 'campaign-creation' | 'general';
  cancelable: boolean;
  onCancel?: () => void;
}

interface LoadingStore {
  // State
  loadingStates: Record<string, LoadingState>;
  isAnyLoading: boolean;
  
  // Actions
  startLoading: (config: {
    id: string;
    message?: string;
    type?: LoadingState['type'];
    cancelable?: boolean;
    onCancel?: () => void;
  }) => void;
  
  stopLoading: (id: string) => void;
  
  cancelLoading: (id: string) => void;
  
  clearAllLoading: () => void;
  
  updateLoadingMessage: (id: string, message: string) => void;
  
  // Selectors
  getLoadingState: (id: string) => LoadingState | undefined;
  
  isLoading: (id: string) => boolean;
}

export const useLoadingStore = create<LoadingStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    loadingStates: {},
    isAnyLoading: false,

    // Actions
    startLoading: (config) => {
      const {
        id,
        message = 'Loading...',
        type = 'general',
        cancelable = true,
        onCancel
      } = config;

      const newLoadingState: LoadingState = {
        id,
        message,
        startTime: Date.now(),
        type,
        cancelable,
        onCancel,
      };

      set((state) => ({
        loadingStates: {
          ...state.loadingStates,
          [id]: newLoadingState,
        },
        isAnyLoading: true,
      }));
    },

    stopLoading: (id: string) => {
      set((state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _removed, ...remainingStates } = state.loadingStates;
        return {
          loadingStates: remainingStates,
          isAnyLoading: Object.keys(remainingStates).length > 0,
        };
      });
    },

    cancelLoading: (id: string) => {
      const state = get();
      const loadingState = state.loadingStates[id];
      
      if (loadingState?.onCancel) {
        loadingState.onCancel();
      }
      
      state.stopLoading(id);
    },

    clearAllLoading: () => {
      set({
        loadingStates: {},
        isAnyLoading: false,
      });
    },

    updateLoadingMessage: (id: string, message: string) => {
      set((state) => {
        const existingState = state.loadingStates[id];
        if (!existingState) return state;

        return {
          loadingStates: {
            ...state.loadingStates,
            [id]: {
              ...existingState,
              message,
            },
          },
        };
      });
    },

    // Selectors
    getLoadingState: (id: string) => {
      return get().loadingStates[id];
    },

    isLoading: (id: string) => {
      return !!get().loadingStates[id];
    },
  }))
);

// Custom hooks for common loading patterns
export const useAIResponseLoading = () => {
  const store = useLoadingStore();
  
  const startAILoading = (message = 'AI is thinking...', onCancel?: () => void) => {
    store.startLoading({
      id: 'ai-response',
      message,
      type: 'ai-response',
      cancelable: true,
      onCancel,
    });
  };

  const stopAILoading = () => {
    store.stopLoading('ai-response');
  };

  const isAILoading = store.isLoading('ai-response');
  const aiLoadingState = store.getLoadingState('ai-response');

  return {
    startAILoading,
    stopAILoading,
    isAILoading,
    aiLoadingState,
  };
};

export const useCampaignCreationLoading = () => {
  const store = useLoadingStore();
  
  const startCampaignLoading = (message = 'Creating campaign...', onCancel?: () => void) => {
    store.startLoading({
      id: 'campaign-creation',
      message,
      type: 'campaign-creation',
      cancelable: true,
      onCancel,
    });
  };

  const stopCampaignLoading = () => {
    store.stopLoading('campaign-creation');
  };

  const isCampaignLoading = store.isLoading('campaign-creation');
  const campaignLoadingState = store.getLoadingState('campaign-creation');

  return {
    startCampaignLoading,
    stopCampaignLoading,
    isCampaignLoading,
    campaignLoadingState,
  };
};

// Timeout management hook
export const useLoadingTimeout = (id: string, timeoutMs = 60000) => {
  const store = useLoadingStore();
  
  React.useEffect(() => {
    const loadingState = store.getLoadingState(id);
    if (!loadingState) return;

    const timeoutId = setTimeout(() => {
      if (store.isLoading(id)) {
        store.updateLoadingMessage(id, 'Request timed out. Please try again.');
        setTimeout(() => {
          store.stopLoading(id);
        }, 3000);
      }
    }, timeoutMs);

    return () => clearTimeout(timeoutId);
  }, [id, timeoutMs, store]);
};