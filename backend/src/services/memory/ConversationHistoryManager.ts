import { PrismaClient, Prisma, AIRole } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface ConversationChunk {
  id: string;
  sessionId: string;
  startTime: Date;
  endTime: Date;
  messageCount: number;
  summary: string;
  participants: string[];
  keyTopics: string[];
  importance: number;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  userId?: string;
}

/**
 * Manages conversation history with efficient chunking and retrieval
 */
export class ConversationHistoryManager {
  private prisma: PrismaClient;
  private readonly MAX_CHUNK_SIZE = 50; // Max messages per chunk
  private readonly MAX_CHUNK_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Add messages to conversation history
   */
  async addMessages(
    sessionId: string,
    messages: ConversationMessage[]
  ): Promise<void> {
    try {
      // Store messages individually first
      const messagePromises = messages.map(msg => 
        this.prisma.aIMessage.create({
          data: {
            content: msg.content,
            role: msg.role === 'user' ? AIRole.USER : 
                  msg.role === 'assistant' ? AIRole.ASSISTANT : AIRole.SYSTEM,
            timestamp: msg.timestamp,
            conversationId: sessionId, // Using session ID as conversation ID
          },
        })
      );

      await Promise.all(messagePromises);

      // Check if we need to create a new chunk
      await this.checkAndCreateChunk(sessionId);
      
      logger.info(`Added ${messages.length} messages to session: ${sessionId}`);
    } catch (error) {
      logger.error('Error adding messages to conversation history:', error);
      throw error;
    }
  }

  /**
   * Get conversation history with pagination
   */
  async getConversationHistory(params: {
    sessionId: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    messages: ConversationMessage[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const where: Prisma.AIMessageWhereInput = {
        conversationId: params.sessionId,
      };

      if (params.startDate || params.endDate) {
        where.timestamp = {};
        if (params.startDate) where.timestamp.gte = params.startDate;
        if (params.endDate) where.timestamp.lte = params.endDate;
      }

      const [messages, totalCount] = await Promise.all([
        this.prisma.aIMessage.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: params.limit || 50,
          skip: params.offset || 0,
        }),
        this.prisma.aIMessage.count({ where }),
      ]);

      const conversationMessages: ConversationMessage[] = messages.map(msg => ({
        role: msg.role === AIRole.USER ? 'user' : 
              msg.role === AIRole.ASSISTANT ? 'assistant' : 'system',
        content: msg.content,
        timestamp: msg.timestamp,
      }));

      return {
        messages: conversationMessages,
        totalCount,
        hasMore: totalCount > (params.offset || 0) + conversationMessages.length,
      };
    } catch (error) {
      logger.error('Error retrieving conversation history:', error);
      throw error;
    }
  }

  /**
   * Get conversation summary for a time period
   */
  async getConversationSummary(params: {
    sessionId: string;
    startDate?: Date;
    endDate?: Date;
    maxMessages?: number;
  }): Promise<{
    summary: string;
    messageCount: number;
    keyTopics: string[];
    participants: string[];
    timeRange: { start: Date; end: Date };
  }> {
    try {
      const where: Prisma.AIMessageWhereInput = {
        conversationId: params.sessionId,
      };

      if (params.startDate || params.endDate) {
        where.timestamp = {};
        if (params.startDate) where.timestamp.gte = params.startDate;
        if (params.endDate) where.timestamp.lte = params.endDate;
      }

      const messages = await this.prisma.aIMessage.findMany({
        where,
        orderBy: { timestamp: 'asc' },
        take: params.maxMessages || 100,
      });

      if (messages.length === 0) {
        return {
          summary: 'No messages found in the specified time range.',
          messageCount: 0,
          keyTopics: [],
          participants: [],
          timeRange: { start: new Date(), end: new Date() },
        };
      }

      // Generate summary and extract key topics
      const summary = await this.generateConversationSummary(messages);
      const keyTopics = this.extractKeyTopics(messages);
      const participants = [...new Set(messages.map(m => m.role))];

      return {
        summary,
        messageCount: messages.length,
        keyTopics,
        participants,
        timeRange: {
          start: messages[0]?.timestamp || new Date(),
          end: messages[messages.length - 1]?.timestamp || new Date(),
        },
      };
    } catch (error) {
      logger.error('Error generating conversation summary:', error);
      throw error;
    }
  }

  /**
   * Search conversation history
   */
  async searchConversationHistory(params: {
    sessionId: string;
    query: string;
    limit?: number;
    contextSize?: number;
  }): Promise<Array<{
    message: ConversationMessage;
    context: ConversationMessage[];
    relevanceScore: number;
  }>> {
    try {
      // Simple text search for now (can be enhanced with semantic search)
      const messages = await this.prisma.aIMessage.findMany({
        where: {
          conversationId: params.sessionId,
          content: {
            contains: params.query,
            mode: 'insensitive',
          },
        },
        orderBy: { timestamp: 'desc' },
        take: params.limit || 10,
      });

      const results = [];
      
      for (const message of messages) {
        // Get context around the message
        const contextMessages = await this.getMessageContext(
          params.sessionId,
          message.timestamp,
          params.contextSize || 3
        );

        // Calculate simple relevance score
        const relevanceScore = this.calculateRelevanceScore(message.content, params.query);

        results.push({
          message: {
            role: message.role === AIRole.USER ? 'user' as const : 
                  message.role === AIRole.ASSISTANT ? 'assistant' as const : 'system' as const,
            content: message.content,
            timestamp: message.timestamp,
          },
          context: contextMessages,
          relevanceScore,
        });
      }

      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      logger.error('Error searching conversation history:', error);
      throw error;
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(sessionId: string): Promise<{
    totalMessages: number;
    messagesByRole: Record<string, number>;
    averageMessageLength: number;
    conversationDuration: number;
    messagesPerHour: number;
    mostActiveHour: string;
  }> {
    try {
      const messages = await this.prisma.aIMessage.findMany({
        where: { conversationId: sessionId },
        orderBy: { timestamp: 'asc' },
      });

      if (messages.length === 0) {
        return {
          totalMessages: 0,
          messagesByRole: {},
          averageMessageLength: 0,
          conversationDuration: 0,
          messagesPerHour: 0,
          mostActiveHour: '00:00',
        };
      }

      const totalMessages = messages.length;
      const messagesByRole = messages.reduce((acc, msg) => {
        acc[msg.role] = (acc[msg.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const averageMessageLength = messages.reduce((sum, msg) => sum + msg.content.length, 0) / totalMessages;

      const startTime = messages[0]?.timestamp || new Date();
      const endTime = messages[messages.length - 1]?.timestamp || new Date();
      const conversationDuration = endTime.getTime() - startTime.getTime();

      const messagesPerHour = conversationDuration > 0 ? 
        (totalMessages / (conversationDuration / (60 * 60 * 1000))) : 0;

      // Find most active hour
      const hourCounts: Record<string, number> = {};
      messages.forEach(msg => {
        const hour = msg.timestamp.getHours().toString().padStart(2, '0') + ':00';
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const mostActiveHour = Object.keys(hourCounts).reduce((a, b) => 
        (hourCounts[a] || 0) > (hourCounts[b] || 0) ? a : b, '00:00');

      return {
        totalMessages,
        messagesByRole,
        averageMessageLength,
        conversationDuration,
        messagesPerHour,
        mostActiveHour,
      };
    } catch (error) {
      logger.error('Error getting conversation stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old conversation data
   */
  async cleanupOldConversations(params: {
    sessionId: string;
    keepDays: number;
    keepCount: number;
  }): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - params.keepDays);

      // Get messages to keep (recent or important)
      const messagesToKeep = await this.prisma.aIMessage.findMany({
        where: {
          conversationId: params.sessionId,
          timestamp: { gte: cutoffDate },
        },
        orderBy: { timestamp: 'desc' },
        take: params.keepCount,
        select: { id: true },
      });

      const keepIds = messagesToKeep.map(m => m.id);

      // Delete old messages
      const result = await this.prisma.aIMessage.deleteMany({
        where: {
          conversationId: params.sessionId,
          timestamp: { lt: cutoffDate },
          id: { notIn: keepIds },
        },
      });

      logger.info(`Cleaned up ${result.count} old messages for session: ${params.sessionId}`);
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up old conversations:', error);
      throw error;
    }
  }

  /**
   * Check if we need to create a new conversation chunk
   */
  private async checkAndCreateChunk(sessionId: string): Promise<void> {
    try {
      const recentMessages = await this.prisma.aIMessage.findMany({
        where: { conversationId: sessionId },
        orderBy: { timestamp: 'desc' },
        take: this.MAX_CHUNK_SIZE + 1,
      });

      if (recentMessages.length <= this.MAX_CHUNK_SIZE) {
        return;
      }

      // Check if we need to chunk based on time
      const oldestMessage = recentMessages[recentMessages.length - 1];
      const newestMessage = recentMessages[0];
      const timeDiff = (newestMessage?.timestamp?.getTime() || 0) - (oldestMessage?.timestamp?.getTime() || 0);

      if (timeDiff > this.MAX_CHUNK_DURATION || recentMessages.length > this.MAX_CHUNK_SIZE) {
        // Create a chunk for older messages
        const chunkMessages = recentMessages.slice(this.MAX_CHUNK_SIZE);
        await this.createConversationChunk(sessionId, chunkMessages);
      }
    } catch (error) {
      logger.error('Error checking conversation chunk:', error);
      throw error;
    }
  }

  /**
   * Create a conversation chunk
   */
  private async createConversationChunk(sessionId: string, messages: { role: AIRole; content: string; timestamp: Date }[]): Promise<void> {
    try {
      if (messages.length === 0) return;

      const startTime = messages[messages.length - 1]?.timestamp || new Date();
      const endTime = messages[0]?.timestamp || new Date();
      const summary = await this.generateConversationSummary(messages);
      const keyTopics = this.extractKeyTopics(messages);
      const participants = [...new Set(messages.map(m => m.role))];

      // Store chunk metadata (could be stored in a separate table)
      logger.info(`Created conversation chunk for session ${sessionId}: ${messages.length} messages, ${startTime} to ${endTime}`);
      
      // Note: In a full implementation, you might want to store these chunks in a separate table
      // For now, we're just logging the chunk creation
    } catch (error) {
      logger.error('Error creating conversation chunk:', error);
      throw error;
    }
  }

  /**
   * Generate a summary of conversation messages
   */
  private async generateConversationSummary(messages: { role: AIRole; content: string; timestamp: Date }[]): Promise<string> {
    if (messages.length === 0) return '';

    // Simple summary generation - in a full implementation, this could use AI
    const userMessages = messages.filter(m => m.role === AIRole.USER);
    const assistantMessages = messages.filter(m => m.role === AIRole.ASSISTANT);
    
    const topics = this.extractKeyTopics(messages);
    const topicSummary = topics.length > 0 ? `Key topics: ${topics.join(', ')}. ` : '';

    return `${topicSummary}Conversation included ${userMessages.length} user messages and ${assistantMessages.length} assistant responses spanning ${this.formatDuration(messages[0]?.timestamp || new Date(), messages[messages.length - 1]?.timestamp || new Date())}.`;
  }

  /**
   * Extract key topics from messages
   */
  private extractKeyTopics(messages: { content: string }[]): string[] {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    
    // Simple keyword extraction - in a full implementation, this could use NLP
    const keywords = [
      'character', 'story', 'quest', 'adventure', 'combat', 'magic',
      'treasure', 'location', 'npc', 'skill', 'spell', 'weapon',
      'monster', 'dungeon', 'town', 'forest', 'castle', 'dragon'
    ];

    return keywords.filter(keyword => text.includes(keyword));
  }

  /**
   * Get context messages around a specific timestamp
   */
  private async getMessageContext(
    sessionId: string,
    timestamp: Date,
    contextSize: number
  ): Promise<ConversationMessage[]> {
    try {
      // Get messages before and after the timestamp
      const messages = await this.prisma.aIMessage.findMany({
        where: {
          conversationId: sessionId,
          timestamp: {
            gte: new Date(timestamp.getTime() - 30 * 60 * 1000), // 30 minutes before
            lte: new Date(timestamp.getTime() + 30 * 60 * 1000), // 30 minutes after
          },
        },
        orderBy: { timestamp: 'asc' },
        take: contextSize * 2 + 1,
      });

      return messages.map(msg => ({
        role: msg.role === AIRole.USER ? 'user' : 
              msg.role === AIRole.ASSISTANT ? 'assistant' : 'system',
        content: msg.content,
        timestamp: msg.timestamp,
      }));
    } catch (error) {
      logger.error('Error getting message context:', error);
      return [];
    }
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevanceScore(content: string, query: string): number {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Simple scoring based on exact matches and word proximity
    let score = 0;
    
    // Exact query match
    if (lowerContent.includes(lowerQuery)) {
      score += 10;
    }

    // Individual word matches
    const queryWords = lowerQuery.split(/\s+/);
    const contentWords = lowerContent.split(/\s+/);
    
    queryWords.forEach(qword => {
      if (contentWords.includes(qword)) {
        score += 5;
      }
    });

    // Normalize by content length
    return score / Math.max(content.length / 100, 1);
  }

  /**
   * Format duration between two dates
   */
  private formatDuration(start: Date, end: Date): string {
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}