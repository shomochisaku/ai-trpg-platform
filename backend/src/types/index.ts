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