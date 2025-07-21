import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  campaignId?: string;
  category?: string;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  category: string;
  importance: number;
  similarity: number;
  tags: string[];
  createdAt: Date;
}

export class VectorSearchService {
  /**
   * Search for similar memory entries using vector similarity
   */
  async searchSimilar(
    embedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const { limit = 10, threshold = 0.8, campaignId, category } = options;

    try {
      // Convert number array to PostgreSQL vector format
      const vectorString = `[${embedding.join(',')}]`;

      // Build WHERE clause conditions
      const conditions: string[] = ['1=1']; // Always true for easier condition building
      const params: unknown[] = [vectorString, threshold];
      let paramIndex = 3; // Starting from $3 since $1 and $2 are used

      if (campaignId) {
        conditions.push(`"sessionId" = $${paramIndex}`);
        params.push(campaignId);
        paramIndex++;
      }

      if (category) {
        conditions.push(`category::text = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }

      // Add limit as the last parameter
      params.push(limit);

      const whereClause = conditions.join(' AND ');

      // Execute vector similarity search using pgvector
      const results = await prisma.$queryRawUnsafe<VectorSearchResult[]>(
        `
        SELECT 
          id,
          content,
          category,
          importance,
          tags,
          "createdAt",
          1 - (embedding::vector <=> $1::vector) as similarity
        FROM memory_entries
        WHERE ${whereClause}
          AND "isActive" = true
          AND cardinality(embedding) > 0
          AND 1 - (embedding::vector <=> $1::vector) > $2
        ORDER BY embedding::vector <=> $1::vector
        LIMIT $${paramIndex}
      `,
        ...params
      );

      logger.info(`Vector search found ${results.length} results`, {
        limit,
        threshold,
        campaignId,
        category,
      });

      return results;
    } catch (error) {
      logger.error('Vector search failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        embeddingLength: embedding.length,
        options,
      });
      throw new Error(
        `Failed to perform vector search: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Find the most similar memory entry
   */
  async findMostSimilar(
    embedding: number[],
    options: Omit<VectorSearchOptions, 'limit'> = {}
  ): Promise<VectorSearchResult | null> {
    const results = await this.searchSimilar(embedding, {
      ...options,
      limit: 1,
    });

    return results[0] || null;
  }

  /**
   * Create vector index for better performance (run once during setup)
   */
  async createVectorIndex(): Promise<void> {
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS memory_embedding_idx 
        ON memory_entries 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `;

      logger.info('Vector index created successfully');
    } catch (error) {
      logger.error('Failed to create vector index', error);
      throw new Error('Failed to create vector index');
    }
  }

  /**
   * Validate embedding vector
   */
  validateEmbedding(embedding: unknown): number[] {
    if (!Array.isArray(embedding)) {
      throw new Error('Embedding must be an array');
    }

    if (embedding.length === 0) {
      throw new Error('Embedding cannot be empty');
    }

    const validated = embedding.map((val, index) => {
      const num = Number(val);
      if (isNaN(num)) {
        throw new Error(`Invalid embedding value at index ${index}`);
      }
      return num;
    });

    return validated;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0;
      const bVal = b[i] ?? 0;
      dotProduct += aVal * bVal;
      normA += aVal * aVal;
      normB += bVal * bVal;
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}

// Export singleton instance
export const vectorSearchService = new VectorSearchService();
