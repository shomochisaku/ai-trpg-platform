// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Socket.IO types
export interface SocketUser {
  id: string;
  username: string;
  socketId: string;
}

// Game types (placeholder for future expansion)
export interface GameSession {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  players: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameMessage {
  id: string;
  sessionId: string;
  userId: string;
  content: string;
  type: 'player' | 'gm' | 'system' | 'ai';
  timestamp: Date;
}

// Memory management types
export interface MemoryEntry {
  id: string;
  content: string;
  category:
    | 'GENERAL'
    | 'CHARACTER'
    | 'LOCATION'
    | 'EVENT'
    | 'RULE'
    | 'PREFERENCE'
    | 'STORY_BEAT';
  importance: number;
  tags: string[];
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
  sessionId?: string;
  userId?: string;
  isActive: boolean;
}

export interface MemorySearchResult {
  id: string;
  content: string;
  category: string;
  importance: number;
  similarity: number;
  createdAt: Date;
  tags: string[];
}

export interface MemoryStats {
  totalMemories: number;
  activeMemories: number;
  memoriesByCategory: Record<string, number>;
  averageImportance: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  userId?: string;
}

export interface ConversationHistory {
  messages: ConversationMessage[];
  totalCount: number;
  hasMore: boolean;
}

export interface ConversationSummary {
  summary: string;
  messageCount: number;
  keyTopics: string[];
  participants: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ConversationStats {
  totalMessages: number;
  messagesByRole: Record<string, number>;
  averageMessageLength: number;
  conversationDuration: number;
  messagesPerHour: number;
  mostActiveHour: string;
}

// AI Role types for database storage
export enum AIRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}
