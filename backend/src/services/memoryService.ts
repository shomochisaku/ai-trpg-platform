import { PrismaClient, MemoryType } from '@prisma/client';
import { logger } from '@/utils/logger';
import { embeddingService } from '@/utils/embeddings';
import {
  vectorSearchService,
  VectorSearchOptions,
} from './vectorSearchService';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
export const createMemorySchema = z.object({
  content: z.string().min(1).max(8192),
  category: z
    .enum([
      'GENERAL',
      'CHARACTER',
      'LOCATION',
      'EVENT',
      'RULE',
      'PREFERENCE',
      'STORY_BEAT',
    ] as const)
    .default('GENERAL')
    .transform(val => val as MemoryType),
  importance: z.number().min(1).max(10).default(5),
  tags: z.array(z.string()).default([]),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

export const updateMemorySchema = z.object({
  content: z.string().min(1).max(8192).optional(),
  category: z
    .enum([
      'GENERAL',
      'CHARACTER',
      'LOCATION',
      'EVENT',
      'RULE',
      'PREFERENCE',
      'STORY_BEAT',
    ] as const)
    .optional()
    .transform(val => (val ? (val as MemoryType) : undefined)),
  importance: z.number().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const searchMemorySchema = z.object({
  query: z.string().min(1).max(8192),
  limit: z.number().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.8),
  campaignId: z.string().optional(),
  category: z
    .enum([
      'GENERAL',
      'CHARACTER',
      'LOCATION',
      'EVENT',
      'RULE',
      'PREFERENCE',
      'STORY_BEAT',
    ] as const)
    .optional()
    .transform(val => (val ? (val as MemoryType) : undefined)),
});

export interface MemoryEntry {
  id: string;
  content: string;
  category: MemoryType;
  importance: number;
  tags: string[];
  embedding: number[];
  isActive: boolean;
  userId: string | null;
  sessionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemorySearchResult {
  id: string;
  content: string;
  category: string;
  importance: number;
  similarity: number;
  tags: string[];
  createdAt: Date;
}

export class MemoryService {
  /**
   * Create a new memory entry with embedding
   */
  async createMemory(
    data: z.infer<typeof createMemorySchema>
  ): Promise<MemoryEntry> {
    const validated = createMemorySchema.parse(data);

    try {
      // Generate embedding for the content
      const embedding = await embeddingService.generateEmbedding(
        validated.content
      );

      // Create memory entry with embedding
      const memory = await prisma.memoryEntry.create({
        data: {
          content: validated.content,
          category: validated.category,
          importance: validated.importance,
          tags: validated.tags,
          embedding: embedding, // Use Float[] directly
          userId: validated.userId,
          sessionId: validated.sessionId,
        },
      });

      logger.info('Memory entry created', {
        id: memory.id,
        category: memory.category,
        tags: memory.tags,
      });

      return memory;
    } catch (error) {
      logger.error('Failed to create memory entry', error);
      throw error; // Throw original error for better debugging
    }
  }

  /**
   * Get memory entry by ID
   */
  async getMemory(id: string): Promise<MemoryEntry | null> {
    return await prisma.memoryEntry.findUnique({
      where: { id },
    });
  }

  /**
   * Update memory entry
   */
  async updateMemory(
    id: string,
    data: z.infer<typeof updateMemorySchema>
  ): Promise<MemoryEntry> {
    const validated = updateMemorySchema.parse(data);

    try {
      // If content is updated, regenerate embedding
      const updateData: z.infer<typeof updateMemorySchema> & {
        embedding?: number[];
      } = { ...validated };

      if (validated.content) {
        const embedding = await embeddingService.generateEmbedding(
          validated.content
        );
        updateData.embedding = embedding; // Use Float[] directly
      }

      const memory = await prisma.memoryEntry.update({
        where: { id },
        data: updateData,
      });

      logger.info('Memory entry updated', { id });

      return memory;
    } catch (error) {
      logger.error('Failed to update memory entry', error);
      throw new Error('Failed to update memory entry');
    }
  }

  /**
   * Delete memory entry (soft delete)
   */
  async deleteMemory(id: string): Promise<void> {
    await prisma.memoryEntry.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('Memory entry deactivated', { id });
  }

  /**
   * Search memories using vector similarity
   */
  async searchMemories(
    params: z.infer<typeof searchMemorySchema>
  ): Promise<MemorySearchResult[]> {
    const validated = searchMemorySchema.parse(params);

    try {
      // Generate embedding for search query
      const queryEmbedding = await embeddingService.generateEmbedding(
        validated.query
      );

      // Perform vector search
      const searchOptions: VectorSearchOptions = {
        limit: validated.limit,
        threshold: validated.threshold,
        campaignId: validated.campaignId,
        category: validated.category,
      };

      const results = await vectorSearchService.searchSimilar(
        queryEmbedding,
        searchOptions
      );

      logger.info('Memory search completed', {
        query: validated.query.substring(0, 50),
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Memory search failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        query: validated.query,
      });
      throw new Error(
        `Failed to search memories: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * List memories for a campaign
   */
  async listCampaignMemories(
    campaignId: string,
    options: {
      category?: MemoryType;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ memories: MemoryEntry[]; total: number }> {
    const where = {
      sessionId: campaignId,
      isActive: true,
      ...(options.category && { category: options.category }),
    };

    const [memories, total] = await Promise.all([
      prisma.memoryEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0,
      }),
      prisma.memoryEntry.count({ where }),
    ]);

    return { memories, total };
  }

  /**
   * Get memory statistics for a campaign
   */
  async getCampaignMemoryStats(campaignId: string): Promise<{
    totalMemories: number;
    activeMemories: number;
    memoriesByCategory: Record<string, number>;
    averageImportance: number;
  }> {
    const memories = await prisma.memoryEntry.findMany({
      where: { sessionId: campaignId },
      select: {
        isActive: true,
        category: true,
        importance: true,
      },
    });

    const activeMemories = memories.filter(m => m.isActive).length;
    const memoriesByCategory: Record<string, number> = {};
    let totalImportance = 0;

    memories.forEach(memory => {
      if (memory.isActive) {
        memoriesByCategory[memory.category] =
          (memoriesByCategory[memory.category] || 0) + 1;
        totalImportance += memory.importance;
      }
    });

    return {
      totalMemories: memories.length,
      activeMemories,
      memoriesByCategory,
      averageImportance:
        activeMemories > 0 ? totalImportance / activeMemories : 0,
    };
  }

  /**
   * Initialize vector index for better performance
   */
  async initializeVectorIndex(): Promise<void> {
    await vectorSearchService.createVectorIndex();
  }

  /**
   * Bulk import memories (useful for campaign initialization)
   */
  async bulkImportMemories(
    memories: Array<{
      content: string;
      category?: MemoryType;
      importance?: number;
      tags?: string[];
      userId?: string;
      sessionId?: string;
    }>
  ): Promise<number> {
    let successCount = 0;

    for (const memory of memories) {
      try {
        await this.createMemory({
          content: memory.content,
          category: memory.category || MemoryType.GENERAL,
          importance: memory.importance || 5,
          tags: memory.tags || [],
          userId: memory.userId,
          sessionId: memory.sessionId,
        });
        successCount++;
      } catch (error) {
        logger.error('Failed to import memory', { memory, error });
      }
    }

    logger.info(
      `Bulk import completed: ${successCount}/${memories.length} successful`
    );
    return successCount;
  }
}

// Export singleton instance
export const memoryService = new MemoryService();
