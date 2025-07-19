import { z } from 'zod';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger';
import { mastraInstance, mastraConfig } from '../config';

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
      model: config.model || (config.provider === 'openai' ? 'gpt-4' : 'claude-3-5-sonnet-20241022'),
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
   * Send a message to the GM and get a response
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
   * Chat with Mastra Agent
   */
  private async chatWithMastra(session: GMSession): Promise<string> {
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
    } catch (error) {
      logger.error('Mastra chat failed:', error);
      throw error;
    }
  }

  /**
   * Chat with OpenAI GPT-4 (fallback)
   */
  private async chatWithOpenAI(session: GMSession): Promise<string> {
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
  }

  /**
   * Chat with Anthropic Claude (fallback)
   */
  private async chatWithAnthropic(session: GMSession): Promise<string> {
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