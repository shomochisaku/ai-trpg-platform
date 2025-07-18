import { z } from 'zod';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger';
import { mastraConfig } from '../config';
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
  private openai: OpenAI;
  private anthropic: Anthropic;
  private sessions: Map<string, GMSession>;
  private config: GMAgentConfig;

  constructor(config: GMAgentConfig = { provider: 'openai' }) {
    this.config = {
      provider: config.provider,
      model: config.model || (config.provider === 'openai' ? 'gpt-4' : 'claude-3-5-sonnet-20241022'),
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2000,
      systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(),
    };

    // Initialize AI clients
    this.openai = new OpenAI({
      apiKey: mastraConfig.openai.apiKey,
    });

    this.anthropic = new Anthropic({
      apiKey: mastraConfig.anthropic.apiKey,
    });

    this.sessions = new Map();
    
    logger.info(`GM Agent initialized with provider: ${this.config.provider}`);
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
      // Get response from AI provider
      if (this.config.provider === 'openai') {
        response = await this.chatWithOpenAI(session);
      } else {
        response = await this.chatWithAnthropic(session);
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
   * Chat with OpenAI GPT-4
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
      tools: [
        {
          type: 'function',
          function: {
            name: 'rollDice',
            description: 'Roll dice with specified configuration',
            parameters: {
              type: 'object',
              properties: {
                dice: { type: 'string', description: 'Dice notation (e.g., "1d20", "3d6+2")' },
                difficulty: { type: 'number', description: 'Difficulty class for success/failure' },
                advantage: { type: 'boolean', description: 'Roll with advantage (d20 only)' },
                disadvantage: { type: 'boolean', description: 'Roll with disadvantage (d20 only)' },
              },
              required: ['dice'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'updateStatusTags',
            description: 'Update status tags for a character or entity',
            parameters: {
              type: 'object',
              properties: {
                entityId: { type: 'string', description: 'ID of the entity to update' },
                tags: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      value: { type: 'number' },
                      duration: { type: 'number' },
                      type: { type: 'string', enum: ['buff', 'debuff', 'condition', 'injury', 'attribute'] },
                      action: { type: 'string', enum: ['add', 'update', 'remove'] },
                    },
                    required: ['name', 'description', 'type', 'action'],
                  },
                },
              },
              required: ['entityId', 'tags'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'storeKnowledge',
            description: 'Store knowledge entries for the GM knowledge base',
            parameters: {
              type: 'object',
              properties: {
                category: { type: 'string', description: 'Category of knowledge' },
                title: { type: 'string', description: 'Title of the knowledge entry' },
                content: { type: 'string', description: 'Content of the knowledge entry' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
                relevance: { type: 'number', description: 'Relevance score (0-1)' },
              },
              required: ['category', 'title', 'content', 'tags'],
            },
          },
        },
      ],
      tool_choice: 'auto',
    });

    const choice = response.choices[0];
    
    // Handle tool calls
    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        const result = await this.handleToolCall(toolCall.function.name, toolCall.function.arguments);
        // In a more complete implementation, you would pass the tool result back to the AI
        logger.info(`Tool ${toolCall.function.name} called with result: ${JSON.stringify(result)}`);
      }
    }

    return choice.message.content || 'I apologize, but I was unable to generate a response.';
  }

  /**
   * Chat with Anthropic Claude
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
      system: systemMessage,
      messages,
    });

    return response.content[0].type === 'text' ? response.content[0].text : 'I apologize, but I was unable to generate a response.';
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