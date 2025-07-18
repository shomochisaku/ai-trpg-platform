import { PrismaClient, Prisma, MemoryType } from '@prisma/client';
import { logger } from '../../utils/logger';
import OpenAI from 'openai';

/**
 * Memory Service for managing agent memories with semantic search and persistence
 */
export class MemoryService {
  private prisma: PrismaClient;
  private openai: OpenAI;
  private initialized: boolean = false;

  constructor() {
    this.prisma = new PrismaClient();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Initialize the memory service
   */
  async initialize(): Promise<void> {
    try {
      // Test OpenAI connection
      await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'test',
      });
      
      this.initialized = true;
      logger.info('Memory Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Memory Service:', error);
      throw error;
    }
  }

  /**
   * Check if the service is initialized
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Store a memory entry with semantic embedding
   */
  async storeMemory(params: {
    sessionId: string;
    userId?: string;
    content: string;
    category: string;
    importance?: number;
    tags?: string[];
  }): Promise<{
    id: string;
    content: string;
    category: string;
    importance: number;
    embedding: number[];
  }> {
    if (!this.initialized) {
      throw new Error('Memory Service not initialized');
    }

    try {
      // Generate embedding for semantic search
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: params.content,
      });
      const embedding = embeddingResponse.data[0]?.embedding;
      
      if (!embedding) {
        throw new Error('Failed to generate embedding');
      }
      
      // Calculate importance score if not provided
      const importance = params.importance || await this.calculateImportance(params.content);

      // Store in database
      const memoryEntry = await this.prisma.memoryEntry.create({
        data: {
          content: params.content,
          category: params.category as MemoryType,
          importance,
          tags: params.tags || [],
          embedding,
          userId: params.userId,
          sessionId: params.sessionId,
        },
      });

      logger.info(`Memory stored: ${memoryEntry.id} for session: ${params.sessionId}`);
      
      return {
        id: memoryEntry.id,
        content: memoryEntry.content,
        category: memoryEntry.category,
        importance: memoryEntry.importance,
        embedding: memoryEntry.embedding as number[],
      };
    } catch (error) {
      logger.error('Error storing memory:', error);
      throw error;
    }
  }

  /**
   * Retrieve memories using semantic search
   */
  async searchMemories(params: {
    query: string;
    sessionId?: string;
    userId?: string;
    category?: string;
    limit?: number;
    minImportance?: number;
  }): Promise<Array<{
    id: string;
    content: string;
    category: string;
    importance: number;
    similarity: number;
    createdAt: Date;
    tags: string[];
  }>> {
    if (!this.initialized) {
      throw new Error('Memory Service not initialized');
    }

    try {
      // Generate embedding for the query
      const queryEmbeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: params.query,
      });
      const queryEmbedding = queryEmbeddingResponse.data[0]?.embedding;
      
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }
      
      // Build filter conditions
      const whereConditions: Prisma.MemoryEntryWhereInput = {
        isActive: true,
      };

      if (params.sessionId) whereConditions.sessionId = params.sessionId;
      if (params.userId) whereConditions.userId = params.userId;
      if (params.category) whereConditions.category = params.category as any;
      if (params.minImportance) whereConditions.importance = { gte: params.minImportance };

      // Get all matching memories
      const memories = await this.prisma.memoryEntry.findMany({
        where: whereConditions,
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
      });

      // Calculate similarity scores
      const memoriesWithSimilarity = memories
        .map(memory => ({
          ...memory,
          similarity: this.calculateCosineSimilarity(
            queryEmbedding,
            memory.embedding as number[]
          ),
        }))
        .filter(memory => memory.similarity > 0.1) // Filter out very low similarity
        .sort((a, b) => b.similarity - a.similarity) // Sort by similarity
        .slice(0, params.limit || 10); // Final limit

      return memoriesWithSimilarity.map(memory => ({
        id: memory.id,
        content: memory.content,
        category: memory.category,
        importance: memory.importance,
        similarity: memory.similarity,
        createdAt: memory.createdAt,
        tags: memory.tags,
      }));
    } catch (error) {
      logger.error('Error searching memories:', error);
      throw error;
    }
  }

  /**
   * Get memories by category and session
   */
  async getMemoriesByCategory(params: {
    sessionId: string;
    category: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    content: string;
    importance: number;
    createdAt: Date;
    tags: string[];
  }>> {
    try {
      const memories = await this.prisma.memoryEntry.findMany({
        where: {
          sessionId: params.sessionId,
          category: params.category as any,
          isActive: true,
        },
        orderBy: [
          { importance: 'desc' },
          { createdAt: 'desc' },
        ],
        take: params.limit || 20,
      });

      return memories.map(memory => ({
        id: memory.id,
        content: memory.content,
        importance: memory.importance,
        createdAt: memory.createdAt,
        tags: memory.tags,
      }));
    } catch (error) {
      logger.error('Error retrieving memories by category:', error);
      throw error;
    }
  }

  /**
   * Update memory importance
   */
  async updateMemoryImportance(memoryId: string, importance: number): Promise<void> {
    try {
      await this.prisma.memoryEntry.update({
        where: { id: memoryId },
        data: { importance },
      });
      
      logger.info(`Memory importance updated: ${memoryId} -> ${importance}`);
    } catch (error) {
      logger.error('Error updating memory importance:', error);
      throw error;
    }
  }

  /**
   * Deactivate old memories to manage storage
   */
  async cleanupMemories(params: {
    sessionId: string;
    keepCount: number;
    minImportance: number;
  }): Promise<number> {
    try {
      // Get memories to keep (high importance or recent)
      const memoriesToKeep = await this.prisma.memoryEntry.findMany({
        where: {
          sessionId: params.sessionId,
          isActive: true,
          OR: [
            { importance: { gte: params.minImportance } },
            { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // Last 7 days
          ],
        },
        orderBy: [
          { importance: 'desc' },
          { createdAt: 'desc' },
        ],
        take: params.keepCount,
        select: { id: true },
      });

      const keepIds = memoriesToKeep.map(m => m.id);

      // Deactivate old memories
      const result = await this.prisma.memoryEntry.updateMany({
        where: {
          sessionId: params.sessionId,
          isActive: true,
          id: { notIn: keepIds },
        },
        data: { isActive: false },
      });

      logger.info(`Cleaned up ${result.count} memories for session: ${params.sessionId}`);
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up memories:', error);
      throw error;
    }
  }

  /**
   * Get memory statistics for a session
   */
  async getMemoryStats(sessionId: string): Promise<{
    totalMemories: number;
    activeMemories: number;
    memoriesByCategory: Record<string, number>;
    averageImportance: number;
  }> {
    try {
      const [totalMemories, activeMemories, categoryCounts, avgImportance] = await Promise.all([
        this.prisma.memoryEntry.count({
          where: { sessionId },
        }),
        this.prisma.memoryEntry.count({
          where: { sessionId, isActive: true },
        }),
        this.prisma.memoryEntry.groupBy({
          by: ['category'],
          where: { sessionId, isActive: true },
          _count: { category: true },
        }),
        this.prisma.memoryEntry.aggregate({
          where: { sessionId, isActive: true },
          _avg: { importance: true },
        }),
      ]);

      const memoriesByCategory = categoryCounts.reduce((acc, item) => {
        acc[item.category] = item._count.category;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalMemories,
        activeMemories,
        memoriesByCategory,
        averageImportance: avgImportance._avg.importance || 0,
      };
    } catch (error) {
      logger.error('Error getting memory stats:', error);
      throw error;
    }
  }

  /**
   * Calculate importance score based on content analysis
   */
  private async calculateImportance(content: string): Promise<number> {
    try {
      // Basic heuristic-based importance calculation
      let importance = 1;

      // Check for important keywords
      const importantKeywords = [
        'character', 'quest', 'story', 'important', 'critical',
        'death', 'victory', 'defeat', 'discovery', 'secret',
        'treasure', 'magic', 'spell', 'artifact', 'legendary'
      ];

      const urgentKeywords = [
        'emergency', 'urgent', 'danger', 'threat', 'immediate',
        'crisis', 'alarm', 'warning', 'attack', 'combat'
      ];

      const lowercaseContent = content.toLowerCase();
      
      // Base importance on content length and keywords
      if (content.length > 200) importance += 1;
      if (content.length > 500) importance += 1;
      
      // Check for important keywords
      for (const keyword of importantKeywords) {
        if (lowercaseContent.includes(keyword)) {
          importance += 2;
          break;
        }
      }

      // Check for urgent keywords
      for (const keyword of urgentKeywords) {
        if (lowercaseContent.includes(keyword)) {
          importance += 3;
          break;
        }
      }

      // Check for questions (might be important context)
      if (content.includes('?')) importance += 1;

      // Cap importance at 10
      return Math.min(importance, 10);
    } catch (error) {
      logger.error('Error calculating importance:', error);
      return 3; // Default importance
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] || 0;
      const bVal = b[i] || 0;
      dotProduct += aVal * bVal;
      normA += aVal * aVal;
      normB += bVal * bVal;
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Get comprehensive memory context for AI
   */
  async getMemoryContext(params: {
    sessionId: string;
    query?: string;
    categories?: string[];
    limit?: number;
  }): Promise<{
    recentMemories: Array<{ content: string; importance: number; category: string }>;
    relevantMemories: Array<{ content: string; similarity: number; category: string }>;
    stats: { totalMemories: number; categoryCounts: Record<string, number> };
  }> {
    try {
      // Get recent high-importance memories
      const recentMemories = await this.prisma.memoryEntry.findMany({
        where: {
          sessionId: params.sessionId,
          isActive: true,
          ...(params.categories && { category: { in: params.categories as any } }),
        },
        orderBy: [
          { importance: 'desc' },
          { createdAt: 'desc' },
        ],
        take: params.limit || 10,
        select: {
          content: true,
          importance: true,
          category: true,
        },
      });

      // Get relevant memories if query provided
      let relevantMemories: Array<{ content: string; similarity: number; category: string }> = [];
      if (params.query) {
        relevantMemories = await this.searchMemories({
          query: params.query,
          sessionId: params.sessionId,
          limit: params.limit || 5,
        });
      }

      // Get stats
      const stats = await this.getMemoryStats(params.sessionId);

      return {
        recentMemories,
        relevantMemories,
        stats: {
          totalMemories: stats.totalMemories,
          categoryCounts: stats.memoriesByCategory,
        },
      };
    } catch (error) {
      logger.error('Error getting memory context:', error);
      throw error;
    }
  }

  /**
   * Process conversation messages into memories
   */
  async processConversationIntoMemories(params: {
    sessionId: string;
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
    }>;
    userId?: string;
  }): Promise<number> {
    try {
      let memoriesCreated = 0;

      for (const message of params.messages) {
        // Skip very short messages
        if (message.content.length < 20) continue;

        // Determine category based on content
        let category = 'GENERAL';
        const lowerContent = message.content.toLowerCase();
        
        if (lowerContent.includes('character') || lowerContent.includes('player')) {
          category = 'CHARACTER';
        } else if (lowerContent.includes('location') || lowerContent.includes('place')) {
          category = 'LOCATION';
        } else if (lowerContent.includes('event') || lowerContent.includes('happen')) {
          category = 'EVENT';
        } else if (lowerContent.includes('story') || lowerContent.includes('plot')) {
          category = 'STORY_BEAT';
        }

        // Create memory entry
        await this.storeMemory({
          sessionId: params.sessionId,
          userId: params.userId,
          content: message.content,
          category,
          tags: [message.role, 'conversation'],
        });

        memoriesCreated++;
      }

      return memoriesCreated;
    } catch (error) {
      logger.error('Error processing conversation into memories:', error);
      throw error;
    }
  }

  /**
   * Health check for memory service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      initialized?: boolean;
      embeddingDimension?: number;
      error?: string;
      timestamp: string;
    };
  }> {
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Test OpenAI embeddings service
      const testEmbeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'test',
      });
      const testEmbedding = testEmbeddingResponse.data[0]?.embedding;
      
      if (!testEmbedding) {
        throw new Error('Failed to generate test embedding');
      }
      
      return {
        status: 'healthy',
        details: {
          initialized: this.initialized,
          embeddingDimension: testEmbedding.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error('Memory service health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}