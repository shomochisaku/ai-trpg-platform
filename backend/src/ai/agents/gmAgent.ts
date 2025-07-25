import { z } from 'zod';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger';
import { mastraInstance, mastraConfig } from '../config';
import { withRetry, RetryableError } from '../../utils/retryHandler';
import { circuitBreakerManager } from '../../utils/circuitBreaker';
import { createAIServiceError } from '../../middleware/errorHandler';

// Import Mastra types conditionally
let Agent: any = null;
try {
  import('@mastra/core').then((mastraCore) => {
    Agent = mastraCore.Agent;
  });
} catch (error) {
  logger.warn('Mastra core not available, using fallback implementation');
}
import { 
  rollDice, 
  updateStatusTags, 
  storeKnowledge, 
  getKnowledge, 
  getStatusTags,
  DiceResult,
  StatusTag,
  KnowledgeEntry 
} from '../tools/gameTools';

// Message interface for conversation history
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// GM Agent conversation session
export interface GMSession {
  id: string;
  playerId: string;
  messages: Message[];
  gameState: {
    playerName: string;
    currentScene: string;
    statusTags: StatusTag[];
    knowledgeContext: KnowledgeEntry[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// GM Agent configuration
export interface GMAgentConfig {
  provider: 'openai' | 'anthropic';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

// Tool function schemas for validation
const rollDiceSchema = z.object({
  dice: z.string(),
  difficulty: z.number().optional(),
  advantage: z.boolean().optional(),
  disadvantage: z.boolean().optional(),
});

const updateStatusTagsSchema = z.object({
  entityId: z.string(),
  tags: z.array(z.object({
    name: z.string(),
    description: z.string(),
    value: z.number().optional(),
    duration: z.number().optional(),
    type: z.enum(['buff', 'debuff', 'condition', 'injury', 'attribute']),
    action: z.enum(['add', 'update', 'remove']),
  })),
});

const storeKnowledgeSchema = z.object({
  category: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  relevance: z.number().optional(),
});

/**
 * GM Agent class for handling TRPG game sessions
 */
export class GMAgent {
  private mastraAgent: any;
  private openai!: OpenAI;
  private anthropic!: Anthropic;
  private sessions: Map<string, GMSession>;
  private config: GMAgentConfig;
  private useMastra: boolean = false;

  constructor(config: GMAgentConfig = { provider: 'openai' }) {
    this.config = {
      provider: config.provider,
      model: config.model || (config.provider === 'openai' ? mastraConfig.openai.model : 'claude-3-5-sonnet-20241022'),
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2000,
      systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(),
    };

    // Try to initialize Mastra Agent
    try {
      if (mastraInstance && Agent) {
        const agentId = config.provider === 'openai' ? 'gmAgent' : 'gmAgentClaude';
        // Store mastra instance for potential future use
        this.mastraAgent = mastraInstance;
        this.useMastra = true;
        logger.info(`GM Agent initialized with Mastra framework (provider: ${this.config.provider})`);
      } else {
        throw new Error('Mastra not available');
      }
    } catch (error) {
      logger.warn('Mastra initialization failed, using fallback implementation:', error);
      this.useMastra = false;
      
      // Initialize fallback AI clients
      this.openai = new OpenAI({
        apiKey: mastraConfig.openai.apiKey,
      });

      this.anthropic = new Anthropic({
        apiKey: mastraConfig.anthropic.apiKey,
      });
      
      logger.info(`GM Agent initialized with fallback implementation (provider: ${this.config.provider})`);
    }

    this.sessions = new Map();
  }

  /**
   * Default system prompt for the GM agent
   */
  private getDefaultSystemPrompt(): string {
    return `You are a skilled Game Master (GM) for a tabletop role-playing game. Your role is to:

1. Create immersive, engaging narratives that respond to player actions
2. Manage game mechanics including dice rolls, status effects, and character progression
3. Maintain consistency in the game world and story
4. Provide fair and balanced challenges appropriate to the situation
5. Encourage creative problem-solving and roleplay

Available tools:
- rollDice: Roll dice with various configurations (e.g., "1d20", "3d6+2")
- updateStatusTags: Add, update, or remove status effects on characters
- storeKnowledge: Store important information about the game world, characters, or events
- getKnowledge: Retrieve relevant information from the knowledge base
- getStatusTags: Check current status effects on characters

Game mechanics:
- Use dice rolls to determine outcomes of uncertain actions
- Apply status effects (buffs, debuffs, conditions) as appropriate
- Track important story elements and character development
- Maintain game balance and narrative flow

Always respond in character as the GM, describing scenes vividly and asking for player input when appropriate. Use the tools to enhance the gameplay experience and maintain game state.`;
  }

  /**
   * Create a new game session
   */
  async createSession(playerId: string, playerName: string): Promise<string> {
    const sessionId = `session-${playerId}-${Date.now()}`;
    
    const session: GMSession = {
      id: sessionId,
      playerId,
      messages: [{
        role: 'system',
        content: this.config.systemPrompt!,
        timestamp: new Date(),
      }],
      gameState: {
        playerName,
        currentScene: 'Starting Adventure',
        statusTags: [],
        knowledgeContext: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    
    logger.info(`New GM session created: ${sessionId} for player: ${playerName}`);
    
    return sessionId;
  }

  /**
   * Send a message to the GM and get a response with RAG integration
   */
  async chat(sessionId: string, message: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Add user message to session
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    let response: string;

    try {
      // Enhance session with RAG-retrieved context
      await this.enhanceSessionWithRAG(session, message, sessionId);
      
      // Get response based on available implementation
      if (this.useMastra) {
        response = await this.chatWithMastra(session);
      } else {
        // Fallback to direct API calls
        if (this.config.provider === 'openai') {
          response = await this.chatWithOpenAI(session);
        } else {
          response = await this.chatWithAnthropic(session);
        }
      }

      // Store the conversation as knowledge for future RAG retrieval
      await storeKnowledge({
        category: 'conversation',
        title: `Session ${sessionId} - Recent Exchange`,
        content: `Player: ${message}\nGM: ${response}`,
        tags: ['conversation', sessionId, 'recent'],
        relevance: 0.8,
        sessionId,
      });

      // Add assistant response to session
      session.messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      });

      session.updatedAt = new Date();
      
      logger.info(`GM responded in session ${sessionId}: ${response.substring(0, 100)}...`);
      
    } catch (error) {
      logger.error(`Error in GM chat: ${error}`);
      throw error;
    }

    return response;
  }

  /**
   * Enhance session context with RAG-retrieved relevant memories
   */
  private async enhanceSessionWithRAG(session: GMSession, userMessage: string, sessionId: string): Promise<void> {
    try {
      logger.info(`Enhancing session ${sessionId} with RAG context for message: ${userMessage.substring(0, 50)}...`);

      // Retrieve relevant memories using semantic search
      const relevantMemories = await getKnowledge({
        query: userMessage,
        sessionId,
        limit: 5,
      });

      // Also get recent conversation history
      const recentConversations = await getKnowledge({
        category: 'conversation',
        sessionId,
        limit: 3,
      });

      // Combine all relevant context
      const allContext = [...relevantMemories, ...recentConversations];

      // Update session's knowledge context
      session.gameState.knowledgeContext = allContext;

      // Add a context message to help the AI understand the retrieved information
      if (allContext.length > 0) {
        const contextSummary = allContext
          .map(entry => `${entry.title}: ${entry.content.substring(0, 150)}...`)
          .join('\n');

        // Insert context before the latest user message (but after system message)
        const systemMessageIndex = session.messages.findIndex(msg => msg.role === 'system');
        const insertIndex = systemMessageIndex >= 0 ? systemMessageIndex + 1 : 0;

        session.messages.splice(insertIndex, 0, {
          role: 'system',
          content: `[RAG Context - Relevant memories and recent conversations]:
${contextSummary}

[End of context - Respond to the following player message while considering this context]`,
          timestamp: new Date(),
        });

        logger.info(`Enhanced session with ${allContext.length} relevant memories`);
      }
    } catch (error) {
      logger.warn('Failed to enhance session with RAG context:', error);
      // Continue without RAG enhancement - this is not critical for basic functionality
    }
  }

  /**
   * Chat with Mastra Agent with retry and circuit breaker
   */
  private async chatWithMastra(session: GMSession): Promise<string> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('mastra');

    return circuitBreaker.execute(
      async () => {
        return withRetry(async () => {
          try {
            // Convert messages to Mastra format
            const messages = session.messages.map(msg => ({
              role: msg.role as 'system' | 'user' | 'assistant',
              content: msg.content,
            }));

            // Simple message generation with Mastra
            const response = await this.mastraAgent.generate({
              messages,
              temperature: this.config.temperature,
              maxTokens: this.config.maxTokens,
            });

            return response.text || response.content || 'I apologize, but I was unable to generate a response.';
          } catch (error: any) {
            logger.error('Mastra chat failed:', error);
            
            // Enhance error with service information
            const enhancedError = error as RetryableError;
            enhancedError.isRetryable = this.isRetryableAIError(error);
            
            throw createAIServiceError(
              `Mastra AI service error: ${error.message}`,
              'mastra',
              error
            );
          }
        });
      },
      async () => {
        // Fallback when circuit breaker is open
        logger.warn('Mastra circuit breaker open, using fallback response');
        return "I'm experiencing some technical difficulties right now. The adventure continues, but I might need a moment to gather my thoughts. Please try again shortly.";
      }
    );
  }

  /**
   * Chat with OpenAI GPT-4 with retry and circuit breaker
   */
  private async chatWithOpenAI(session: GMSession): Promise<string> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('openai');

    return circuitBreaker.execute(
      async () => {
        return withRetry(async () => {
          try {
            const messages = session.messages.map(msg => ({
              role: msg.role as 'system' | 'user' | 'assistant',
              content: msg.content,
            }));

            const response = await this.openai.chat.completions.create({
              model: this.config.model!,
              messages,
              temperature: this.config.temperature,
              max_tokens: this.config.maxTokens,
            });

            const choice = response.choices[0];
            
            if (!choice) {
              throw new Error('No response choices received from OpenAI');
            }

            return choice.message.content || 'I apologize, but I was unable to generate a response.';
          } catch (error: any) {
            logger.error('OpenAI chat failed:', error);
            
            // Enhance error with service information
            const enhancedError = error as RetryableError;
            enhancedError.isRetryable = this.isRetryableAIError(error);
            
            // Handle OpenAI specific error codes
            if (error.status) {
              enhancedError.status = error.status;
            }
            
            throw createAIServiceError(
              `OpenAI API service error: ${error.message}`,
              'openai',
              error
            );
          }
        });
      },
      async () => {
        // Fallback when circuit breaker is open
        logger.warn('OpenAI circuit breaker open, using fallback response');
        return "I'm experiencing some technical difficulties with my AI systems right now. The adventure continues, but I might need a moment to reconnect. Please try again shortly.";
      }
    );
  }

  /**
   * Chat with Anthropic Claude with retry and circuit breaker
   */
  private async chatWithAnthropic(session: GMSession): Promise<string> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('anthropic');

    return circuitBreaker.execute(
      async () => {
        return withRetry(async () => {
          try {
            const messages = session.messages.filter(msg => msg.role !== 'system').map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
            }));

            const systemMessage = session.messages.find(msg => msg.role === 'system')?.content;

            const response = await this.anthropic.messages.create({
              model: this.config.model!,
              max_tokens: this.config.maxTokens!,
              temperature: this.config.temperature,
              system: systemMessage || 'You are a helpful AI assistant.',
              messages,
            });

            const firstContent = response.content[0];
            if (!firstContent) {
              return 'I apologize, but I was unable to generate a response.';
            }
            return firstContent.type === 'text' ? firstContent.text : 'I apologize, but I was unable to generate a response.';
          } catch (error: any) {
            logger.error('Anthropic chat failed:', error);
            
            // Enhance error with service information
            const enhancedError = error as RetryableError;
            enhancedError.isRetryable = this.isRetryableAIError(error);
            
            // Handle Anthropic specific error codes
            if (error.status) {
              enhancedError.status = error.status;
            }
            
            throw createAIServiceError(
              `Anthropic API service error: ${error.message}`,
              'anthropic',
              error
            );
          }
        });
      },
      async () => {
        // Fallback when circuit breaker is open
        logger.warn('Anthropic circuit breaker open, using fallback response');
        return "I'm experiencing some technical difficulties with my AI systems right now. The adventure continues, but I might need a moment to reconnect. Please try again shortly.";
      }
    );
  }


  /**
   * Determine if an AI service error should be retried
   */
  private isRetryableAIError(error: any): boolean {
    // Rate limiting errors should be retried
    if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
      return true;
    }

    // Server errors should be retried
    if (error.status >= 500) {
      return true;
    }

    // Timeout errors should be retried
    if (error.code === 'ETIMEDOUT' || error.message?.toLowerCase().includes('timeout')) {
      return true;
    }

    // Connection errors should be retried
    if (error.code && ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED'].includes(error.code)) {
      return true;
    }

    // OpenAI specific retryable errors
    if (error.type === 'insufficient_quota' || error.type === 'server_error') {
      return true;
    }

    // Anthropic specific retryable errors
    if (error.type === 'overloaded_error' || error.type === 'api_error') {
      return true;
    }

    return false;
  }

  /**
   * Handle tool function calls
   */
  private async handleToolCall(functionName: string, argumentsJson: string): Promise<any> {
    const args = JSON.parse(argumentsJson);

    switch (functionName) {
      case 'rollDice':
        const diceParams = rollDiceSchema.parse(args);
        return await rollDice(diceParams);

      case 'updateStatusTags':
        const statusParams = updateStatusTagsSchema.parse(args);
        return await updateStatusTags(statusParams);

      case 'storeKnowledge':
        const knowledgeParams = storeKnowledgeSchema.parse(args);
        return await storeKnowledge(knowledgeParams);

      default:
        throw new Error(`Unknown tool function: ${functionName}`);
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): GMSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a player
   */
  getPlayerSessions(playerId: string): GMSession[] {
    return Array.from(this.sessions.values()).filter(session => session.playerId === playerId);
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get session statistics
   */
  getStats(): { totalSessions: number; activeSessions: number } {
    return {
      totalSessions: this.sessions.size,
      activeSessions: this.sessions.size, // In a real implementation, you'd filter by active sessions
    };
  }
}