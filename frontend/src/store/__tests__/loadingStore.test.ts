import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoadingStore, useAIResponseLoading, useCampaignCreationLoading } from '../loadingStore';

describe('loadingStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useLoadingStore.getState().clearAllLoading();
  });

  describe('useLoadingStore', () => {
    it('initializes with empty state', () => {
      const { result } = renderHook(() => useLoadingStore());
      
      expect(result.current.loadingStates).toEqual({});
      expect(result.current.isAnyLoading).toBe(false);
    });

    it('starts loading with default config', () => {
      const { result } = renderHook(() => useLoadingStore());
      
      act(() => {
        result.current.startLoading({ id: 'test-loading' });
      });

      expect(result.current.isAnyLoading).toBe(true);
      expect(result.current.loadingStates['test-loading']).toEqual({
        id: 'test-loading',
        message: 'Loading...',
        startTime: expect.any(Number),
        type: 'general',
        cancelable: true,
        onCancel: undefined,
      });
    });

    it('starts loading with custom config', () => {
      const { result } = renderHook(() => useLoadingStore());
      const onCancel = vi.fn();
      
      act(() => {
        result.current.startLoading({
          id: 'custom-loading',
          message: 'Custom message',
          type: 'ai-response',
          cancelable: false,
          onCancel,
        });
      });

      const loadingState = result.current.loadingStates['custom-loading'];
      expect(loadingState.message).toBe('Custom message');
      expect(loadingState.type).toBe('ai-response');
      expect(loadingState.cancelable).toBe(false);
      expect(loadingState.onCancel).toBe(onCancel);
    });

    it('stops loading', () => {
      const { result } = renderHook(() => useLoadingStore());
      
      act(() => {
        result.current.startLoading({ id: 'test-loading' });
      });

      expect(result.current.isAnyLoading).toBe(true);

      act(() => {
        result.current.stopLoading('test-loading');
      });

      expect(result.current.isAnyLoading).toBe(false);
      expect(result.current.loadingStates['test-loading']).toBeUndefined();
    });

    it('cancels loading with callback', () => {
      const { result } = renderHook(() => useLoadingStore());
      const onCancel = vi.fn();
      
      act(() => {
        result.current.startLoading({
          id: 'test-loading',
          onCancel,
        });
      });

      act(() => {
        result.current.cancelLoading('test-loading');
      });

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(result.current.loadingStates['test-loading']).toBeUndefined();
    });

    it('clears all loading states', () => {
      const { result } = renderHook(() => useLoadingStore());
      
      act(() => {
        result.current.startLoading({ id: 'test-1' });
        result.current.startLoading({ id: 'test-2' });
      });

      expect(Object.keys(result.current.loadingStates)).toHaveLength(2);
      expect(result.current.isAnyLoading).toBe(true);

      act(() => {
        result.current.clearAllLoading();
      });

      expect(result.current.loadingStates).toEqual({});
      expect(result.current.isAnyLoading).toBe(false);
    });

    it('updates loading message', () => {
      const { result } = renderHook(() => useLoadingStore());
      
      act(() => {
        result.current.startLoading({ id: 'test-loading', message: 'Initial message' });
      });

      expect(result.current.loadingStates['test-loading'].message).toBe('Initial message');

      act(() => {
        result.current.updateLoadingMessage('test-loading', 'Updated message');
      });

      expect(result.current.loadingStates['test-loading'].message).toBe('Updated message');
    });

    it('checks if specific loading is active', () => {
      const { result } = renderHook(() => useLoadingStore());
      
      expect(result.current.isLoading('test-loading')).toBe(false);

      act(() => {
        result.current.startLoading({ id: 'test-loading' });
      });

      expect(result.current.isLoading('test-loading')).toBe(true);
    });

    it('gets specific loading state', () => {
      const { result } = renderHook(() => useLoadingStore());
      
      expect(result.current.getLoadingState('test-loading')).toBeUndefined();

      act(() => {
        result.current.startLoading({ id: 'test-loading', message: 'Test message' });
      });

      const loadingState = result.current.getLoadingState('test-loading');
      expect(loadingState?.message).toBe('Test message');
    });
  });

  describe('useAIResponseLoading', () => {
    it('starts and stops AI loading', () => {
      const { result } = renderHook(() => useAIResponseLoading());
      
      expect(result.current.isAILoading).toBe(false);
      expect(result.current.aiLoadingState).toBeUndefined();

      act(() => {
        result.current.startAILoading('AI is thinking...');
      });

      expect(result.current.isAILoading).toBe(true);
      expect(result.current.aiLoadingState?.message).toBe('AI is thinking...');
      expect(result.current.aiLoadingState?.type).toBe('ai-response');

      act(() => {
        result.current.stopAILoading();
      });

      expect(result.current.isAILoading).toBe(false);
      expect(result.current.aiLoadingState).toBeUndefined();
    });

    it('handles AI loading with cancel callback', () => {
      const { result } = renderHook(() => useAIResponseLoading());
      const onCancel = vi.fn();
      
      act(() => {
        result.current.startAILoading('AI is thinking...', onCancel);
      });

      expect(result.current.aiLoadingState?.onCancel).toBe(onCancel);
    });
  });

  describe('useCampaignCreationLoading', () => {
    it('starts and stops campaign loading', () => {
      const { result } = renderHook(() => useCampaignCreationLoading());
      
      expect(result.current.isCampaignLoading).toBe(false);
      expect(result.current.campaignLoadingState).toBeUndefined();

      act(() => {
        result.current.startCampaignLoading('Creating campaign...');
      });

      expect(result.current.isCampaignLoading).toBe(true);
      expect(result.current.campaignLoadingState?.message).toBe('Creating campaign...');
      expect(result.current.campaignLoadingState?.type).toBe('campaign-creation');

      act(() => {
        result.current.stopCampaignLoading();
      });

      expect(result.current.isCampaignLoading).toBe(false);
      expect(result.current.campaignLoadingState).toBeUndefined();
    });
  });

  describe('multiple loading states', () => {
    it('tracks multiple loading states correctly', () => {
      const { result } = renderHook(() => useLoadingStore());
      
      act(() => {
        result.current.startLoading({ id: 'loading-1' });
        result.current.startLoading({ id: 'loading-2' });
      });

      expect(result.current.isAnyLoading).toBe(true);
      expect(Object.keys(result.current.loadingStates)).toHaveLength(2);

      act(() => {
        result.current.stopLoading('loading-1');
      });

      expect(result.current.isAnyLoading).toBe(true);
      expect(Object.keys(result.current.loadingStates)).toHaveLength(1);

      act(() => {
        result.current.stopLoading('loading-2');
      });

      expect(result.current.isAnyLoading).toBe(false);
      expect(Object.keys(result.current.loadingStates)).toHaveLength(0);
    });
  });
});