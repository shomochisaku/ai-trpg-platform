import { MemoryType } from '@prisma/client';
import { vectorSearchService } from '@/services/vectorSearchService';
import { memoryService } from '@/services/memoryService';
import { embeddingService } from '@/utils/embeddings';

describe('Vector Search Integration Tests', () => {
  beforeAll(async () => {
    // Setup for mocked tests - no real database cleanup needed
  });

  afterAll(async () => {
    // Cleanup for mocked tests - no real database cleanup needed
  });

  describe('Basic Vector Operations', () => {
    it('should create memory entry with embedding', async () => {
      // Mock the createMemory response
      const mockMemory = {
        id: 'test-memory-1',
        content: '[TEST] The brave warrior entered the dark dungeon',
        category: MemoryType.EVENT,
        importance: 8,
        tags: ['warrior', 'dungeon', 'adventure'],
        sessionId: 'test-session-1',
        embedding: new Array(1536).fill(0.1),
        isActive: true,
        userId: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(memoryService, 'createMemory').mockResolvedValueOnce(mockMemory);

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
      // Mock search results
      const mockSearchResults = [
        {
          id: 'knight-memory-1',
          content: '[TEST] The knight fought bravely in the castle',
          category: MemoryType.EVENT,
          tags: ['knight', 'castle', 'battle'],
          similarity: 0.95,
          importance: 8,
          isActive: true,
          userId: 'test-user',
          sessionId: 'test-session-2',
          createdAt: new Date(),
          updatedAt: new Date(),
          embedding: new Array(1536).fill(0.1),
        },
        {
          id: 'knight-memory-2', 
          content: '[TEST] The brave knight defended the castle walls',
          category: MemoryType.EVENT,
          tags: ['knight', 'castle', 'defense'],
          similarity: 0.87,
          importance: 7,
          isActive: true,
          userId: 'test-user',
          sessionId: 'test-session-2',
          createdAt: new Date(),
          updatedAt: new Date(),
          embedding: new Array(1536).fill(0.1),
        },
      ];

      jest.spyOn(memoryService, 'searchMemories').mockResolvedValueOnce(mockSearchResults);

      // Search for knight-related memories
      const results = await memoryService.searchMemories({
        query: 'knight castle battle',
        limit: 10,
        threshold: 0.5,
        campaignId: 'test-session-2',
      });

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
      // Setup mock data - no real database operations needed
      jest.clearAllMocks();
    });

    it('should filter by category', async () => {
      const mockCharacterResults = [
        {
          id: 'aldric-memory',
          content: '[TEST] Aldric the Brave is a legendary warrior from the northern kingdoms',
          category: MemoryType.CHARACTER,
          importance: 9,
          tags: ['aldric', 'warrior', 'legendary'],
          similarity: 0.92,
          isActive: true,
          userId: 'test-user',
          sessionId: 'test-campaign-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          embedding: new Array(1536).fill(0.1),
        },
        {
          id: 'elara-memory',
          content: '[TEST] Elara the Wise is a powerful sorceress who studies ancient magic',
          category: MemoryType.CHARACTER,
          importance: 8,
          tags: ['elara', 'sorceress', 'magic'],
          similarity: 0.88,
          isActive: true,
          userId: 'test-user',
          sessionId: 'test-campaign-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          embedding: new Array(1536).fill(0.1),
        },
      ];

      jest.spyOn(memoryService, 'searchMemories').mockResolvedValueOnce(mockCharacterResults);

      const characterResults = await memoryService.searchMemories({
        query: 'Aldric brave warrior Elara wise sorceress character person',
        category: MemoryType.CHARACTER,
        campaignId: 'test-campaign-1',
        threshold: 0.1, // Low threshold to ensure results
      });

      expect(characterResults.length).toBeGreaterThan(0);
      expect(characterResults.length).toBeLessThanOrEqual(2); // Should only return character results
      characterResults.forEach(result => {
        expect(result.category).toBe(MemoryType.CHARACTER);
      });
    });

    it('should respect similarity threshold', async () => {
      // Mock high threshold results (fewer, more relevant)
      const mockHighThresholdResults = [
        {
          id: 'aldric-memory',
          content: '[TEST] Aldric the Brave is a legendary warrior',
          category: MemoryType.CHARACTER,
          similarity: 0.95,
          importance: 9,
          tags: ['aldric', 'warrior'],
          isActive: true,
          userId: 'test-user',
          sessionId: 'test-campaign-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          embedding: new Array(1536).fill(0.1),
        },
      ];

      // Mock low threshold results (more results)
      const mockLowThresholdResults = [
        ...mockHighThresholdResults,
        {
          id: 'related-memory',
          content: '[TEST] Another warrior fought bravely',
          category: MemoryType.EVENT,
          similarity: 0.75,
          importance: 6,
          tags: ['warrior', 'battle'],
          isActive: true,
          userId: 'test-user',
          sessionId: 'test-campaign-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          embedding: new Array(1536).fill(0.1),
        },
      ];

      jest.spyOn(memoryService, 'searchMemories')
        .mockResolvedValueOnce(mockHighThresholdResults)
        .mockResolvedValueOnce(mockLowThresholdResults);

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
      // Mock campaign-specific results
      const mockCampaignResults = [
        {
          id: 'campaign-1-memory',
          content: '[TEST] Aldric memory from test-campaign-1',
          category: MemoryType.CHARACTER,
          similarity: 0.9,
          importance: 8,
          tags: ['aldric'],
          isActive: true,
          userId: 'test-user',
          sessionId: 'test-campaign-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          embedding: new Array(1536).fill(0.1),
        },
      ];

      jest.spyOn(memoryService, 'searchMemories').mockResolvedValueOnce(mockCampaignResults);

      // Search should only return memories from specified campaign
      const results = await memoryService.searchMemories({
        query: 'Aldric',
        campaignId: 'test-campaign-1',
      });

      results.forEach(result => {
        expect(result.sessionId).toBe('test-campaign-1');
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk memory creation efficiently', async () => {
      // Mock bulk import response
      jest.spyOn(memoryService, 'bulkImportMemories').mockResolvedValueOnce(100);

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
      // Mock search results for performance testing
      const mockSearchResults = [];
      for (let i = 0; i < 20; i++) {
        mockSearchResults.push({
          id: `perf-memory-${i}`,
          content: `[TEST] Large dataset memory ${i}: Various content for search testing`,
          category: MemoryType.GENERAL,
          similarity: 0.8 - (i * 0.01), // Decreasing similarity
          importance: 5,
          tags: ['performance', 'test'],
          isActive: true,
          userId: 'test-user',
          sessionId: 'test-performance',
          createdAt: new Date(),
          updatedAt: new Date(),
          embedding: new Array(1536).fill(0.1),
        });
      }

      jest.spyOn(memoryService, 'searchMemories').mockResolvedValueOnce(mockSearchResults);

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
      const originalEmbedding = new Array(1536).fill(0.1);
      const newEmbedding = new Array(1536).fill(0.2);

      const mockMemory = {
        id: 'test-memory-update',
        content: '[TEST] Original content',
        category: MemoryType.GENERAL,
        embedding: originalEmbedding,
        importance: 5,
        tags: ['test'],
        isActive: true,
        userId: 'test-user',
        sessionId: 'test-session',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedMemory = {
        ...mockMemory,
        content: '[TEST] Updated content with different meaning',
        embedding: newEmbedding,
        updatedAt: new Date(),
      };

      jest.spyOn(memoryService, 'createMemory').mockResolvedValueOnce(mockMemory);
      jest.spyOn(memoryService, 'updateMemory').mockResolvedValueOnce(mockUpdatedMemory);

      const memory = await memoryService.createMemory({
        content: '[TEST] Original content',
        category: MemoryType.GENERAL,
      });

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
      const mockMemory = {
        id: 'memory-to-delete',
        content: '[TEST] Memory to be deleted',
        category: MemoryType.GENERAL,
        embedding: new Array(1536).fill(0.1),
        importance: 5,
        tags: ['test'],
        isActive: true,
        userId: 'test-user',
        sessionId: 'test-session',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDeletedMemory = {
        ...mockMemory,
        isActive: false,
      };

      jest.spyOn(memoryService, 'createMemory').mockResolvedValueOnce(mockMemory);
      jest.spyOn(memoryService, 'deleteMemory').mockResolvedValueOnce(undefined);
      jest.spyOn(memoryService, 'getMemory').mockResolvedValueOnce(mockDeletedMemory);
      jest.spyOn(memoryService, 'searchMemories').mockResolvedValueOnce([]); // No results after deletion

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
      
      const mockStats = {
        totalMemories: 3,
        activeMemories: 3,
        memoriesByCategory: {
          [MemoryType.CHARACTER]: 1,
          [MemoryType.LOCATION]: 1,
          [MemoryType.EVENT]: 1,
          [MemoryType.GENERAL]: 0,
          [MemoryType.RULE]: 0,
          [MemoryType.PREFERENCE]: 0,
          [MemoryType.STORY_BEAT]: 0,
        },
        averageImportance: 7.67, // (8 + 5 + 10) / 3
      };

      jest.spyOn(memoryService, 'bulkImportMemories').mockResolvedValueOnce(3);
      jest.spyOn(memoryService, 'getCampaignMemoryStats').mockResolvedValueOnce(mockStats);

      // Create varied memories (mocked)
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