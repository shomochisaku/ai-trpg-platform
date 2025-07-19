import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ChatLog, ChatMessage, ChatStore } from '../types';

const initialChatLog: ChatLog = {
  messages: [],
  isLoading: false,
  hasError: false,
  errorMessage: null,
};

export const useChatStore = create<ChatStore>()(
  devtools(
    (set) => ({
      chat: initialChatLog,
      
      addMessage: (messageData) => {
        const newMessage: ChatMessage = {
          ...messageData,
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date(),
        };
        
        set(
          (state) => ({
            chat: {
              ...state.chat,
              messages: [...state.chat.messages, newMessage],
              hasError: false,
              errorMessage: null,
            },
          }),
          false,
          'addMessage'
        );
      },
      
      clearMessages: () => {
        set(
          (state) => ({
            chat: {
              ...state.chat,
              messages: [],
              hasError: false,
              errorMessage: null,
            },
          }),
          false,
          'clearMessages'
        );
      },
      
      setLoading: (loading) => {
        set(
          (state) => ({
            chat: {
              ...state.chat,
              isLoading: loading,
            },
          }),
          false,
          'setLoading'
        );
      },
      
      setError: (error) => {
        set(
          (state) => ({
            chat: {
              ...state.chat,
              hasError: error !== null,
              errorMessage: error,
              isLoading: false,
            },
          }),
          false,
          'setError'
        );
      },
    }),
    {
      name: 'chat-store',
    }
  )
);