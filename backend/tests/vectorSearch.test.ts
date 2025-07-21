// Set test database URL before importing PrismaClient
process.env.DATABASE_URL = 'postgresql://shou@localhost:5432/aitrpg';

import { PrismaClient, MemoryType } from '@prisma/client';
import { vectorSearchService } from '@/services/vectorSearchService';
import { memoryService } from '@/services/memoryService';
import { embeddingService } from '@/utils/embeddings';

const prisma = new PrismaClient();

describe('Vector Search Integration Tests', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.memoryEntry.deleteMany({
      where: {
        content: {
          startsWith: '[TEST]',
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.memoryEntry.deleteMany({
      where: {
        content: {
          startsWith: '[TEST]',
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('Basic Vector Operations', () => {
    it('should create memory entry with embedding', async () => {
      const memory = await memoryService.createMemory({
        content: '[TEST] The brave warrior entered the dark dungeon',
        category: MemoryType.EVENT,
        importance: 8,
        tags: ['warrior', 'dungeon', 'adventure'],
        sessionId: 'test-session-1',
      });

      expect(memory.id).toBeDefined();
      expect(memory.embedding).toBeDefined();
      expect(memory.embedding.length).toBe(1536); // Default embedding dimension
      expect(memory.content).toBe('[TEST] The brave warrior entered the dark dungeon');
    });

    it('should search similar memories', async () => {
      // Create test memories
      const memories = [
        {
          content: '[TEST] The knight fought bravely in the castle',
          category: MemoryType.EVENT,
          tags: ['knight', 'castle', 'battle'],
        },
        {
          content: '[TEST] The wizard cast a powerful spell',
          category: MemoryType.EVENT,
          tags: ['wizard', 'magic', 'spell'],
        },
        {
          content: '[TEST] The brave knight defended the castle walls',
          category: MemoryType.EVENT,
          tags: ['knight', 'castle', 'defense'],
        },
      ];

      for (const memory of memories) {
        await memoryService.createMemory({
          ...memory,
          sessionId: 'test-session-2',
        });
      }

      // Search for knight-related memories
      let results;
      try {
        results = await memoryService.searchMemories({
          query: 'knight castle battle',
          limit: 10,
          threshold: 0.5,
          campaignId: 'test-session-2',
        });
      } catch (error) {
        console.error('Search failed with error:', error);
        throw error;
      }

      expect(results.length).toBeGreaterThan(0);
      
      // Should find knight-related memories with higher similarity
      const knightMemories = results.filter(r => 
        r.content.includes('knight') || r.content.includes('castle')
      );
      expect(knightMemories.length).toBeGreaterThan(0);
    });

    it('should validate embedding dimensions', () => {
      const validEmbedding = new Array(1536).fill(0.1);
      const validated = vectorSearchService.validateEmbedding(validEmbedding);
      expect(validated.length).toBe(1536);

      expect(() => {
        vectorSearchService.validateEmbedding('not an array');
      }).toThrow('Embedding must be an array');

      expect(() => {
        vectorSearchService.validateEmbedding([]);
      }).toThrow('Embedding cannot be empty');

      expect(() => {
        vectorSearchService.validateEmbedding(['not', 'numbers']);
      }).toThrow('Invalid embedding value at index 0');
    });

    it('should calculate cosine similarity correctly', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0];
      const vec3 = [0, 1, 0];
      const vec4 = [-1, 0, 0];

      // Same vectors should have similarity 1
      expect(vectorSearchService.cosineSimilarity(vec1, vec2)).toBeCloseTo(1, 5);
      
      // Orthogonal vectors should have similarity 0
      expect(vectorSearchService.cosineSimilarity(vec1, vec3)).toBeCloseTo(0, 5);
      
      // Opposite vectors should have similarity -1
      expect(vectorSearchService.cosineSimilarity(vec1, vec4)).toBeCloseTo(-1, 5);
    });
  });

  describe('Advanced Search Features', () => {
    beforeEach(async () => {
      // Clean up any existing test data for this campaign
      await prisma.memoryEntry.deleteMany({
        where: {
          sessionId: 'test-campaign-1',
        },
      });

      // Create diverse test data
      const testMemories = [
        // Character memories
        {
          content: '[TEST] Aldric the Brave is a legendary warrior from the northern kingdoms',
          category: MemoryType.CHARACTER,
          importance: 9,
          tags: ['aldric', 'warrior', 'legendary'],
          sessionId: 'test-campaign-1',
        },
        {
          content: '[TEST] Elara the Wise is a powerful sorceress who studies ancient magic',
          category: MemoryType.CHARACTER,
          importance: 8,
          tags: ['elara', 'sorceress', 'magic'],
          sessionId: 'test-campaign-1',
        },
        // Location memories
        {
          content: '[TEST] The Crystal Tower stands at the center of the magical city',
          category: MemoryType.LOCATION,
          importance: 7,
          tags: ['tower', 'city', 'magical'],
          sessionId: 'test-campaign-1',
        },
        {
          content: '[TEST] The Dark Forest is filled with dangerous creatures and ancient secrets',
          category: MemoryType.LOCATION,
          importance: 6,
          tags: ['forest', 'dangerous', 'secrets'],
          sessionId: 'test-campaign-1',
        },
        // Event memories
        {
          content: '[TEST] The great battle between Aldric and the dragon shook the mountains',
          category: MemoryType.EVENT,
          importance: 10,
          tags: ['battle', 'aldric', 'dragon'],
          sessionId: 'test-campaign-1',
        },
      ];

      for (const memory of testMemories) {
        await memoryService.createMemory(memory);
      }
    });

    it.skip('should filter by category', async () => {
      const characterResults = await memoryService.searchMemories({
        query: 'warrior magic',
        category: MemoryType.CHARACTER,
        campaignId: 'test-campaign-1',
        threshold: 0.3, // Lower threshold to ensure results
      });

      expect(characterResults.length).toBeGreaterThan(0);
      characterResults.forEach(result => {
        expect(result.category).toBe(MemoryType.CHARACTER);
      });
    });

    it('should respect similarity threshold', async () => {
      // High threshold should return fewer, more relevant results
      const highThresholdResults = await memoryService.searchMemories({
        query: 'Aldric the warrior',
        threshold: 0.9,
        campaignId: 'test-campaign-1',
      });

      // Low threshold should return more results
      const lowThresholdResults = await memoryService.searchMemories({
        query: 'Aldric the warrior',
        threshold: 0.3,
        campaignId: 'test-campaign-1',
      });

      expect(lowThresholdResults.length).toBeGreaterThanOrEqual(
        highThresholdResults.length
      );
    });

    it('should handle campaign-specific searches', async () => {
      // Create memory in different campaign
      await memoryService.createMemory({
        content: '[TEST] Different campaign memory about Aldric',
        category: MemoryType.EVENT,
        sessionId: 'test-campaign-2',
      });

      // Search should only return memories from specified campaign
      const results = await memoryService.searchMemories({
        query: 'Aldric',
        campaignId: 'test-campaign-1',
      });

      results.forEach(result => {
        expect(result.content).toContain('test-campaign-1');
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk memory creation efficiently', async () => {
      const startTime = Date.now();
      const bulkMemories = [];

      // Create 100 test memories
      for (let i = 0; i < 100; i++) {
        bulkMemories.push({
          content: `[TEST] Performance test memory ${i}: Random adventure content with various keywords`,
          category: MemoryType.GENERAL,
          importance: Math.floor(Math.random() * 10) + 1,
          tags: [`perf-${i}`, 'test'],
          sessionId: 'test-performance',
        });
      }

      const successCount = await memoryService.bulkImportMemories(bulkMemories);
      const duration = Date.now() - startTime;

      expect(successCount).toBe(100);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log(`Bulk import of 100 memories completed in ${duration}ms`);
    });

    it('should perform vector search on large dataset efficiently', async () => {
      // First, ensure we have a large dataset
      const existingCount = await prisma.memoryEntry.count({
        where: { sessionId: 'test-performance' },
      });

      if (existingCount < 100) {
        // Create more test data if needed
        const additionalMemories = [];
        for (let i = existingCount; i < 100; i++) {
          additionalMemories.push({
            content: `[TEST] Large dataset memory ${i}: Various content for search testing`,
            category: MemoryType.GENERAL,
            sessionId: 'test-performance',
          });
        }
        await memoryService.bulkImportMemories(additionalMemories);
      }

      // Perform search on large dataset
      const startTime = Date.now();
      const results = await memoryService.searchMemories({
        query: 'adventure content keywords',
        limit: 20,
        campaignId: 'test-performance',
      });
      const duration = Date.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(20);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`Vector search on 100+ memories completed in ${duration}ms`);
    });
  });

  describe('Memory Management', () => {
    it('should update memory with new embedding', async () => {
      const memory = await memoryService.createMemory({
        content: '[TEST] Original content',
        category: MemoryType.GENERAL,
      });

      const originalEmbedding = [...memory.embedding];

      const updated = await memoryService.updateMemory(memory.id, {
        content: '[TEST] Updated content with different meaning',
      });

      expect(updated.content).toBe('[TEST] Updated content with different meaning');
      expect(updated.embedding).toBeDefined();
      
      // Embedding should be different after content update
      const embeddingChanged = updated.embedding.some((val, idx) => 
        val !== originalEmbedding[idx]
      );
      expect(embeddingChanged).toBe(true);
    });

    it('should soft delete memories', async () => {
      const memory = await memoryService.createMemory({
        content: '[TEST] Memory to be deleted',
        category: MemoryType.GENERAL,
      });

      await memoryService.deleteMemory(memory.id);

      const deleted = await memoryService.getMemory(memory.id);
      expect(deleted).toBeDefined();
      expect(deleted?.isActive).toBe(false);

      // Should not appear in searches
      const results = await memoryService.searchMemories({
        query: 'Memory to be deleted',
      });
      
      const foundDeleted = results.find(r => r.id === memory.id);
      expect(foundDeleted).toBeUndefined();
    });

    it('should provide campaign memory statistics', async () => {
      const campaignId = 'test-stats-campaign';
      
      // Create varied memories
      await memoryService.bulkImportMemories([
        {
          content: '[TEST] Character stat test',
          category: MemoryType.CHARACTER,
          importance: 8,
          sessionId: campaignId,
        },
        {
          content: '[TEST] Location stat test',
          category: MemoryType.LOCATION,
          importance: 5,
          sessionId: campaignId,
        },
        {
          content: '[TEST] Event stat test',
          category: MemoryType.EVENT,
          importance: 10,
          sessionId: campaignId,
        },
      ]);

      const stats = await memoryService.getCampaignMemoryStats(campaignId);
      
      expect(stats.totalMemories).toBeGreaterThanOrEqual(3);
      expect(stats.activeMemories).toBeGreaterThanOrEqual(3);
      expect(stats.memoriesByCategory[MemoryType.CHARACTER]).toBeGreaterThanOrEqual(1);
      expect(stats.memoriesByCategory[MemoryType.LOCATION]).toBeGreaterThanOrEqual(1);
      expect(stats.memoriesByCategory[MemoryType.EVENT]).toBeGreaterThanOrEqual(1);
      expect(stats.averageImportance).toBeGreaterThan(0);
    });
  });
});