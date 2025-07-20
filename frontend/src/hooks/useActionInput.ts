import { useState, useCallback, useRef } from 'react';
import { ActionInputState, ActionInputCallbacks } from '../types/action';

export const useActionInput = (
  callbacks: ActionInputCallbacks,
  maxHistorySize: number = 20
) => {
  const [state, setState] = useState<ActionInputState>({
    currentInput: '',
    isSubmitting: false,
    history: [],
    historyIndex: -1,
    error: null,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateInput = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      currentInput: value,
      historyIndex: -1, // Reset history index when typing
      error: null,
    }));
    
    // Call onInputChange asynchronously to avoid updating parent state during render
    if (callbacks.onInputChange) {
      Promise.resolve().then(() => callbacks.onInputChange(value));
    }
  }, [callbacks]); // Include callbacks in dependency array

  const addToHistory = useCallback((action: string) => {
    if (action.trim() === '') return;
    
    setState(prev => ({
      ...prev,
      history: [action, ...prev.history.slice(0, maxHistorySize - 1)],
      historyIndex: -1,
    }));
  }, [maxHistorySize]);

  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    setState(prev => {
      const { history, historyIndex } = prev;
      
      if (history.length === 0) return prev;
      
      let newIndex = historyIndex;
      
      if (direction === 'up') {
        newIndex = Math.min(historyIndex + 1, history.length - 1);
      } else {
        newIndex = Math.max(historyIndex - 1, -1);
      }
      
      const newInput = newIndex === -1 ? '' : history[newIndex];
      
      return {
        ...prev,
        currentInput: newInput,
        historyIndex: newIndex,
      };
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    setState(prev => {
      const trimmedInput = prev.currentInput.trim();
      if (!trimmedInput || prev.isSubmitting) return prev;

      // Start submission immediately
      (async () => {
        try {
          await callbacks.onSubmit(trimmedInput);
          addToHistory(trimmedInput);
          setState(current => ({
            ...current,
            currentInput: '',
            isSubmitting: false,
            historyIndex: -1,
          }));
        } catch (error) {
          setState(current => ({
            ...current,
            isSubmitting: false,
            error: error instanceof Error ? error.message : 'An error occurred',
          }));
        }
      })();

      return {
        ...prev,
        isSubmitting: true,
        error: null,
      };
    });
  }, [addToHistory, callbacks]); // Include callbacks dependency

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === 'ArrowUp' && event.ctrlKey) {
      event.preventDefault();
      navigateHistory('up');
    } else if (event.key === 'ArrowDown' && event.ctrlKey) {
      event.preventDefault();
      navigateHistory('down');
    }
  }, [handleSubmit, navigateHistory]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      currentInput: '',
      isSubmitting: false,
      history: [],
      historyIndex: -1,
      error: null,
    });
  }, []);

  return {
    state,
    actions: {
      updateInput,
      handleSubmit,
      handleKeyDown,
      clearError,
      reset,
    },
    textareaRef,
  };
};