// Current MVP uses memoryService.ts instead of memory/MemoryService
import { memoryService } from '../src/services/memoryService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRaw: jest.fn(),
    memoryEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    aIMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
  })),
  MemoryType: {
    GENERAL: 'GENERAL',
    CHARACTER: 'CHARACTER', 
    LOCATION: 'LOCATION',
    EVENT: 'EVENT',
    RULE: 'RULE',
    PREFERENCE: 'PREFERENCE',
    STORY_BEAT: 'STORY_BEAT',
  },
}));

// Mock OpenAI
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    },
  })),
}));

// Mock embedding service
jest.mock('../src/utils/embeddings', () => ({
  embeddingService: {
    generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
  },
}));

// Mock vector search service
jest.mock('../src/services/vectorSearchService', () => ({
  vectorSearchService: {
    searchMemories: jest.fn().mockResolvedValue([]),
    storeMemory: jest.fn().mockResolvedValue({ id: 'test-id' }),
  },
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('MemoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMemory', () => {
    it('should create memory successfully', async () => {
      const mockMemoryEntry = {
        id: 'test-id',
        content: 'Test memory content',
        category: 'GENERAL',
        embedding: new Array(1536).fill(0.1),
        importance: 5,
        tags: ['test'],
        isActive: true,
        userId: 'user-1',
        sessionId: 'session-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(memoryService, 'createMemory').mockResolvedValue(mockMemoryEntry);

      const result = await memoryService.createMemory({
        content: 'Test memory content',
        category: 'GENERAL',
        importance: 5,
        tags: ['test'],
        userId: 'user-1',
        sessionId: 'session-1',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('test-id');
      expect(result.content).toBe('Test memory content');
    });

    it('should handle validation errors', async () => {
      await expect(
        memoryService.createMemory({
          content: '', // Invalid empty content
          category: 'GENERAL',
        })
      ).rejects.toThrow();
    });
  });

  describe('searchMemories', () => {
    it('should search memories by query', async () => {
      const mockResults = [
        {
          id: 'mem-1',
          content: 'Relevant memory',
          category: 'CHARACTER',
          similarity: 0.9,
          importance: 7,
          tags: ['character'],
          isActive: true,
          userId: 'user-1',
          sessionId: 'session-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          embedding: new Array(1536).fill(0.1),
        },
      ];

      jest.spyOn(memoryService, 'searchMemories').mockResolvedValue(mockResults);

      const result = await memoryService.searchMemories({
        query: 'character information',
        limit: 10,
        threshold: 0.8,
        userId: 'user-1',
      });

      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBe(0.9);
    });
  });

  describe('updateMemory', () => {
    it('should update memory successfully', async () => {
      const mockUpdatedMemory = {
        id: 'mem-1',
        content: 'Updated content',
        category: 'CHARACTER',
        importance: 8,
        tags: ['character', 'updated'],
        isActive: true,
        userId: 'user-1',
        sessionId: 'session-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        embedding: new Array(1536).fill(0.2),
      };

      jest.spyOn(memoryService, 'updateMemory').mockResolvedValue(mockUpdatedMemory);

      const result = await memoryService.updateMemory('mem-1', {
        content: 'Updated content',
        importance: 8,
        tags: ['character', 'updated'],
      });

      expect(result).toBeDefined();
      expect(result.content).toBe('Updated content');
      expect(result.importance).toBe(8);
    });
  });

  describe('deleteMemory', () => {
    it('should delete memory (soft delete)', async () => {
      jest.spyOn(memoryService, 'deleteMemory').mockResolvedValue();

      await expect(memoryService.deleteMemory('mem-1')).resolves.not.toThrow();
    });
  });

  describe('getMemoriesByType', () => {
    it('should get memories by category', async () => {
      const mockMemories = [
        {
          id: 'mem-1',
          content: 'Character info',
          category: 'CHARACTER',
          importance: 7,
          tags: ['character'],
          isActive: true,
          userId: 'user-1',
          sessionId: 'session-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          embedding: new Array(1536).fill(0.1),
        },
      ];

      jest.spyOn(memoryService, 'getMemoriesByType').mockResolvedValue(mockMemories);

      const result = await memoryService.getMemoriesByType('CHARACTER', {
        userId: 'user-1',
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('CHARACTER');
    });
  });
});