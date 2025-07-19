import { SessionStatus, MemoryType } from '@prisma/client';

export enum WorkflowPhase {
  ACTION_ANALYSIS = 'ACTION_ANALYSIS',
  JUDGMENT_EXECUTION = 'JUDGMENT_EXECUTION',
  NARRATIVE_GENERATION = 'NARRATIVE_GENERATION',
  STATE_UPDATE = 'STATE_UPDATE'
}

export interface WorkflowResult {
  success: boolean;
  phase: WorkflowPhase;
  data?: any;
  error?: string;
  retryCount?: number;
}

export interface GameActionContext {
  campaignId: string;
  playerId: string;
  playerAction: string;
  gameState: {
    currentScene: string;
    playerStatus: string[];
    npcs: Array<{
      name: string;
      role: string;
      status: string[];
    }>;
    environment: {
      location: string;
      timeOfDay: string;
      weather?: string;
    };
  };
  previousActions: Array<{
    action: string;
    result: string;
    timestamp: Date;
  }>;
  memories?: Array<{
    type: MemoryType;
    content: string;
    metadata: any;
  }>;
}

export interface ActionAnalysisResult {
  actionType: 'combat' | 'exploration' | 'social' | 'puzzle' | 'other';
  targets: string[];
  requiresDiceRoll: boolean;
  difficulty?: number;
  skills?: string[];
  intent: string;
  possibleConsequences: string[];
}

export interface JudgmentExecutionResult {
  diceResults?: {
    roll: number;
    modifier: number;
    total: number;
    success: boolean;
    criticalSuccess?: boolean;
    criticalFailure?: boolean;
  };
  toolsExecuted: Array<{
    tool: string;
    result: any;
    success: boolean;
  }>;
  statusChanges: Array<{
    target: string;
    added: string[];
    removed: string[];
  }>;
  knowledgeStored: Array<{
    key: string;
    value: string;
  }>;
}

export interface NarrativeGenerationResult {
  narrative: string;
  mood: 'tense' | 'calm' | 'exciting' | 'mysterious' | 'dangerous';
  suggestedNextActions: string[];
  hiddenInformation?: string;
}

export interface StateUpdateResult {
  updatedGameState: {
    currentScene: string;
    playerStatus: string[];
    npcs: Array<{
      name: string;
      role: string;
      status: string[];
    }>;
    environment: {
      location: string;
      timeOfDay: string;
      weather?: string;
    };
  };
  sessionStatus: SessionStatus;
  newMemories: Array<{
    type: MemoryType;
    content: string;
    metadata: any;
  }>;
}

export interface ProcessGameActionResult {
  success: boolean;
  narrative: string;
  gameState: StateUpdateResult['updatedGameState'];
  suggestedActions: string[];
  diceResults?: JudgmentExecutionResult['diceResults'];
  error?: string;
}

export interface WorkflowOptions {
  maxRetries?: number;
  timeout?: number;
  verbose?: boolean;
}

export interface PhaseHandler<T = any> {
  execute: (context: GameActionContext, previousResults?: any) => Promise<T>;
  validate: (result: T) => boolean;
  fallback?: (context: GameActionContext, error: Error) => Promise<T>;
}