import { PrismaClient, MemoryType } from '@prisma/client';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { OpenAI } from 'openai';

const prisma = new PrismaClient();

// Types
export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

// Knowledge metadata interface
export interface KnowledgeMetadata {
  category?: string;
  title?: string;
  originalId?: string;
  source?: string;
  [key: string]: string | number | boolean | undefined;
}

// Statistics result interface
export interface KnowledgeStats {
  total: number;
  byCategory: Record<string, number>;
  lastUpdated: Date;
}

// Raw query result interface
interface RawSearchResult {
  id: string;
  content: string;
  metadata: KnowledgeMetadata;
  importance: number;
  similarity: number;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: KnowledgeMetadata;
  similarity: number;
  importance: number;
}

export interface KnowledgeEntry {
  id: string;
  campaignId: string;
  category: string;
  title: string;
  content: string;
  metadata: KnowledgeMetadata;
  embedding?: number[];
  importance: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Validation schemas
export const createKnowledgeSchema = z.object({
  campaignId: z.string(),
  category: z.enum([
    'CHARACTER',
    'LOCATION',
    'EVENT',
    'RULE',
    'STORY_BEAT',
    'GENERAL',
  ]),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  tags: z.array(z.string()).optional(),
  importance: z.number().min(0).max(1).optional(),
});

export const searchSchema = z.object({
  campaignId: z.string(),
  query: z.string().min(1).max(1000),
  category: z
    .enum(['CHARACTER', 'LOCATION', 'EVENT', 'RULE', 'STORY_BEAT', 'GENERAL'])
    .optional(),
  limit: z.number().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
});

export class RAGService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure pgvector extension is enabled (handled by migration)
      logger.info('RAG Service initialized successfully');
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize RAG Service:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text using Mastra LLM or OpenAI fallback
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      // TODO: Use Mastra embedding when API is stable
      // Currently using direct OpenAI for reliability

      // Fallback to direct OpenAI API
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      const embedding = response.data[0]?.embedding;

      if (!embedding) {
        throw new Error('Failed to generate embedding');
      }

      return {
        embedding,
        tokenCount: response.usage?.total_tokens || 0,
      };
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      throw new Error('Embedding generation failed');
    }
  }

  /**
   * Store knowledge with embeddings
   */
  async storeKnowledge(
    data: z.infer<typeof createKnowledgeSchema>
  ): Promise<KnowledgeEntry> {
    const validated = createKnowledgeSchema.parse(data);

    // Generate embedding for the content
    const { embedding } = await this.generateEmbedding(
      `${validated.title} ${validated.content}`
    );

    // Calculate importance based on content length and metadata
    const importance =
      validated.importance ?? this.calculateImportance(validated);

    // Store in database
    const entry = await prisma.memoryEntry.create({
      data: {
        sessionId: validated.campaignId,
        content: validated.content,
        category: validated.category as MemoryType,
        tags: validated.tags || [],
        importance,
        embedding,
      },
    });

    return this.formatKnowledgeEntry(entry);
  }

  /**
   * Search for similar knowledge entries
   */
  async searchKnowledge(
    params: z.infer<typeof searchSchema>
  ): Promise<SearchResult[]> {
    const validated = searchSchema.parse(params);

    // Generate embedding for the query
    const { embedding } = await this.generateEmbedding(validated.query);

    // Perform vector similarity search
    const results = await prisma.$queryRaw<RawSearchResult[]>`
      SELECT 
        id,
        content,
        metadata,
        importance,
        1 - (embedding <=> ${embedding}::vector) as similarity
      FROM "MemoryEntry"
      WHERE 
        "agentId" = ${validated.campaignId}
        AND type = 'knowledge'
        ${validated.category ? `AND metadata->>'category' = ${validated.category}` : ''}
        AND 1 - (embedding <=> ${embedding}::vector) > ${validated.threshold}
      ORDER BY similarity DESC, importance DESC
      LIMIT ${validated.limit}
    `;

    return results.map(r => ({
      id: r.id,
      content: r.content,
      metadata: r.metadata,
      similarity: r.similarity,
      importance: r.importance,
    }));
  }

  /**
   * Get knowledge by category
   */
  async getKnowledgeByCategory(
    campaignId: string,
    category: string,
    limit: number = 50
  ): Promise<KnowledgeEntry[]> {
    const entries = await prisma.memoryEntry.findMany({
      where: {
        sessionId: campaignId,
        category: category as MemoryType,
      },
      orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return entries.map(e => this.formatKnowledgeEntry(e));
  }

  /**
   * Update knowledge entry
   */
  async updateKnowledge(
    id: string,
    data: Partial<z.infer<typeof createKnowledgeSchema>>
  ): Promise<KnowledgeEntry> {
    // If content is updated, regenerate embedding
    let embedding;
    if (data.content || data.title) {
      const entry = await prisma.memoryEntry.findUnique({ where: { id } });
      if (!entry) throw new Error('Knowledge entry not found');

      const newContent = `${data.title || ''} ${data.content || entry.content}`;
      const result = await this.generateEmbedding(newContent);
      embedding = result.embedding;
    }

    const updated = await prisma.memoryEntry.update({
      where: { id },
      data: {
        content: data.content,
        category: data.category as MemoryType,
        tags: data.tags,
        importance: data.importance,
        ...(embedding && { embedding }),
      },
    });

    return this.formatKnowledgeEntry(updated);
  }

  /**
   * Delete knowledge entry
   */
  async deleteKnowledge(id: string): Promise<void> {
    await prisma.memoryEntry.delete({
      where: { id },
    });
  }

  /**
   * Get knowledge statistics
   */
  async getKnowledgeStats(campaignId: string): Promise<KnowledgeStats> {
    const stats = await prisma.memoryEntry.groupBy({
      by: ['category'],
      where: {
        sessionId: campaignId,
      },
      _count: true,
    });

    const categoryCounts: Record<string, number> = {};
    stats.forEach(stat => {
      const category = stat.category || 'other';
      categoryCounts[category] =
        (categoryCounts[category] || 0) + Number(stat._count);
    });

    const total = await prisma.memoryEntry.count({
      where: {
        sessionId: campaignId,
      },
    });

    return {
      total,
      byCategory: categoryCounts,
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate contextual prompt for AI
   */
  async generateContext(
    campaignId: string,
    query: string,
    maxTokens: number = 2000
  ): Promise<string> {
    // Search for relevant knowledge
    const results = await this.searchKnowledge({
      campaignId,
      query,
      limit: 20,
      threshold: 0.7,
    });

    // Sort by relevance and importance
    const sorted = results.sort((a, b) => {
      const scoreA = a.similarity * 0.7 + a.importance * 0.3;
      const scoreB = b.similarity * 0.7 + b.importance * 0.3;
      return scoreB - scoreA;
    });

    // Build context within token limit
    let context = '';
    let tokenCount = 0;

    for (const result of sorted) {
      const entry = `[${result.metadata?.category || 'info'}] ${result.metadata?.title || ''}: ${result.content}\n\n`;
      const entryTokens = Math.ceil(entry.length / 4); // Rough estimation

      if (tokenCount + entryTokens > maxTokens) break;

      context += entry;
      tokenCount += entryTokens;
    }

    return context.trim();
  }

  private calculateImportance(
    data: z.infer<typeof createKnowledgeSchema>
  ): number {
    // Base importance on content length and category
    let importance = 0.5;

    if (data.content.length > 500) importance += 0.1;
    if (data.content.length > 1000) importance += 0.1;

    if (data.category === 'CHARACTER' || data.category === 'RULE') {
      importance += 0.2;
    } else if (data.category === 'EVENT') {
      importance += 0.1;
    }

    return Math.min(importance, 1.0);
  }

  private formatKnowledgeEntry(entry: {
    id: string;
    sessionId: string | null;
    category: MemoryType | null;
    title?: string;
    content: string;
    importance: number;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
  }): KnowledgeEntry {
    return {
      id: entry.id,
      campaignId: entry.sessionId || '',
      category: entry.category || 'GENERAL',
      title: entry.title || '',
      content: entry.content,
      metadata: {} as KnowledgeMetadata,
      importance: entry.importance,
      tags: entry.tags || [],
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}

// Export singleton instance
export const ragService = new RAGService();
