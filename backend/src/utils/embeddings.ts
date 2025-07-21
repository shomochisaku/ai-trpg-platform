import { logger } from '@/utils/logger';

/**
 * Embedding dimension for vectors
 * OpenAI's text-embedding-ada-002 uses 1536 dimensions
 * This will be replaced with actual API calls during Mastra AI integration
 */
export const EMBEDDING_DIMENSION = 1536;

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export class EmbeddingService {
  /**
   * Generate embedding vector for text
   * NOTE: This is a mock implementation for testing
   * Actual OpenAI/Mastra integration will be implemented in milestone 1
   */
  async generateEmbedding(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    const { dimensions = EMBEDDING_DIMENSION } = options;

    // Mock implementation: Generate deterministic vectors based on text
    const embedding: number[] = [];

    // Use text hash to generate pseudo-random but deterministic values
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Generate normalized vector components
    for (let i = 0; i < dimensions; i++) {
      // Create pseudo-random values between -1 and 1
      const seed = hash + i;
      const value = (Math.sin(seed * 0.1) + Math.cos(seed * 0.2)) / 2;
      embedding.push(value);
    }

    // Normalize the vector
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );

    const normalized = embedding.map(val => val / magnitude);

    logger.debug('Generated mock embedding', {
      textLength: text.length,
      dimensions,
      firstValues: normalized.slice(0, 5),
    });

    return normalized;
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<number[][]> {
    return Promise.all(
      texts.map(text => this.generateEmbedding(text, options))
    );
  }

  /**
   * Validate text before embedding generation
   */
  validateText(text: string): void {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    if (text.length > 8192) {
      throw new Error('Text exceeds maximum length of 8192 characters');
    }
  }

  /**
   * Create a zero vector of specified dimensions
   */
  createZeroVector(dimensions: number = EMBEDDING_DIMENSION): number[] {
    return new Array(dimensions).fill(0);
  }

  /**
   * Create a random unit vector (for testing)
   */
  createRandomVector(dimensions: number = EMBEDDING_DIMENSION): number[] {
    const vector: number[] = [];

    // Generate random components
    for (let i = 0; i < dimensions; i++) {
      vector.push(Math.random() * 2 - 1); // Random value between -1 and 1
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );

    return vector.map(val => val / magnitude);
  }

  /**
   * Calculate text similarity score (0-1) based on simple heuristics
   * This is a placeholder for actual semantic similarity
   */
  calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    // Jaccard similarity
    return intersection.size / union.size;
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
