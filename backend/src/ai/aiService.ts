import { GMAgent, GMSession } from './agents/gmAgent';
import { logger } from '../utils/logger';
import { mastraInstance } from './config';
import {
  rollDice,
  updateStatusTags,
  storeKnowledge,
  getKnowledge,
  getStatusTags,
  clearExpiredTags,
  DiceResult,
  StatusTag,
  KnowledgeEntry,
} from './tools/gameTools';
import { GameWorkflow } from './workflows/gameWorkflow';
import { GameActionContext, ProcessGameActionResult } from './workflows/types';

/**
 * Main AI Service for managing GM agents and game sessions
 */
// Health check details interface
interface HealthCheckDetails {
  initialized?: boolean;
  stats?: {
    totalSessions: number;
    activeSessions: number;
    initialized: boolean;
  };
  error?: string;
  timestamp: string;
}

export class AIService {
  private gmAgent: GMAgent;
  private gameWorkflow: GameWorkflow | null = null;
  private initialized: boolean = false;

  constructor() {
    this.gmAgent = new GMAgent({ provider: 'openai' });
  }

  /**
   * Initialize the AI service
   */
  async initialize(): Promise<void> {
    try {
      // Mastra instance is initialized in config if available
      if (mastraInstance) {
        logger.info('Mastra framework initialized successfully');

        // Initialize game workflow with Mastra instance
        this.gameWorkflow = new GameWorkflow(mastraInstance, {
          maxRetries: 3,
          timeout: 30000,
          verbose: true,
        });

        logger.info('Game workflow initialized successfully');
      } else {
        logger.warn('Mastra framework not available, using fallback mode');
      }

      // Start periodic cleanup of expired status tags
      this.startCleanupInterval();

      this.initialized = true;
      logger.info('AI Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Create a new game session
   */
  async createGameSession(
    playerId: string,
    playerName: string
  ): Promise<string> {
    if (!this.initialized) {
      throw new Error('AI Service not initialized');
    }

    try {
      const sessionId = await this.gmAgent.createSession(playerId, playerName);

      // Store initial knowledge about the player
      await storeKnowledge({
        category: 'player',
        title: `Player: ${playerName}`,
        content: `Player ${playerName} (ID: ${playerId}) has started a new game session.`,
        tags: ['player', 'session', playerName.toLowerCase()],
        relevance: 0.8,
        sessionId,
        userId: playerId,
      });

      logger.info(
        `Game session created: ${sessionId} for player: ${playerName}`
      );
      return sessionId;
    } catch (error) {
      logger.error('Error creating game session:', error);
      throw error;
    }
  }

  /**
   * Send a message to the GM and get a response
   */
  async chatWithGM(sessionId: string, message: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('AI Service not initialized');
    }

    try {
      const response = await this.gmAgent.chat(sessionId, message);

      // Store the conversation in knowledge base for context
      await storeKnowledge({
        category: 'conversation',
        title: `Session ${sessionId} - Player Message`,
        content: `Player: ${message}\nGM: ${response}`,
        tags: ['conversation', sessionId, 'player-interaction'],
        relevance: 0.6,
        sessionId,
      });

      return response;
    } catch (error) {
      logger.error('Error in GM chat:', error);
      throw error;
    }
  }

  /**
   * Process a game action using the workflow system
   */
  async processGameAction(
    context: GameActionContext
  ): Promise<ProcessGameActionResult> {
    if (!this.initialized) {
      throw new Error('AI Service not initialized');
    }

    if (!this.gameWorkflow) {
      logger.warn(
        'Game workflow not available, falling back to simple GM chat'
      );
      // Fallback to simple GM response
      const response = await this.gmAgent.chat(
        context.campaignId,
        context.playerAction
      );
      return {
        success: true,
        narrative: response,
        gameState: context.gameState,
        suggestedActions: [
          'Continue exploring',
          'Ask for more details',
          'Try something different',
        ],
      };
    }

    try {
      logger.info(
        `Processing game action for campaign ${context.campaignId}: ${context.playerAction}`
      );

      const result = await this.gameWorkflow.processGameAction(context);

      // Store the action and result for future reference
      await storeKnowledge({
        category: 'game_action',
        title: `Campaign ${context.campaignId} - Action Processing`,
        content: `Player: ${context.playerAction}\nResult: ${result.narrative}`,
        tags: ['game_action', context.campaignId, 'workflow'],
        relevance: 0.9,
        sessionId: context.campaignId,
      });

      logger.info(
        `Game action processed successfully for campaign ${context.campaignId}`
      );
      return result;
    } catch (error) {
      logger.error('Error processing game action:', error);

      // Return fallback response in case of error
      return {
        success: false,
        narrative:
          'An unexpected event occurs, and the situation becomes unclear. The story continues...',
        gameState: context.gameState,
        suggestedActions: [
          'Try again',
          'Ask for clarification',
          'Change approach',
        ],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): GMSession | undefined {
    return this.gmAgent.getSession(sessionId);
  }

  /**
   * Get all sessions for a player
   */
  getPlayerSessions(playerId: string): GMSession[] {
    return this.gmAgent.getPlayerSessions(playerId);
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    return this.gmAgent.deleteSession(sessionId);
  }

  /**
   * Direct dice rolling utility
   */
  async rollDice(params: {
    dice: string;
    difficulty?: number;
    advantage?: boolean;
    disadvantage?: boolean;
  }): Promise<DiceResult> {
    return await rollDice(params);
  }

  /**
   * Update status tags for an entity
   */
  async updateStatusTags(params: {
    entityId: string;
    tags: Array<{
      name: string;
      description: string;
      value?: number;
      duration?: number;
      type: 'buff' | 'debuff' | 'condition' | 'injury' | 'attribute';
      action: 'add' | 'update' | 'remove';
    }>;
  }): Promise<StatusTag[]> {
    return await updateStatusTags(params);
  }

  /**
   * Get status tags for an entity
   */
  async getStatusTags(entityId: string): Promise<StatusTag[]> {
    return await getStatusTags(entityId);
  }

  /**
   * Store knowledge entry
   */
  async storeKnowledge(params: {
    category: string;
    title: string;
    content: string;
    tags: string[];
    relevance?: number;
  }): Promise<KnowledgeEntry> {
    return await storeKnowledge(params);
  }

  /**
   * Get knowledge entries
   */
  async getKnowledge(params: {
    category?: string;
    tags?: string[];
    limit?: number;
  }): Promise<KnowledgeEntry[]> {
    return await getKnowledge(params);
  }

  /**
   * Get service statistics
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    initialized: boolean;
  } {
    return {
      ...this.gmAgent.getStats(),
      initialized: this.initialized,
    };
  }

  /**
   * Health check for the AI service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: HealthCheckDetails;
  }> {
    try {
      const stats = this.getStats();

      return {
        status: this.initialized ? 'healthy' : 'unhealthy',
        details: {
          initialized: this.initialized,
          stats,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Start cleanup interval for expired status tags
   */
  private startCleanupInterval(): void {
    // Skip cleanup interval in test environment to prevent Jest open handles
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    setInterval(async () => {
      try {
        await clearExpiredTags();
      } catch (error) {
        logger.error('Error during cleanup:', error);
      }
    }, 60000); // Run every minute
  }
}

// Export singleton instance
export const aiService = new AIService();
