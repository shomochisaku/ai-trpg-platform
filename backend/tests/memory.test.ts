import { MemoryService } from '../src/services/memory/MemoryService';
import { ConversationHistoryManager } from '../src/services/memory/ConversationHistoryManager';
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
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  })),
}));

// Mock OpenAI
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3, 0.4, 0.5] }],
      }),
    },
  })),
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('MemoryService', () => {
  let memoryService: MemoryService;
  let mockPrisma: any;

  beforeEach(() => {
    memoryService = new MemoryService();
    mockPrisma = new PrismaClient();
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await memoryService.initialize();
      expect(memoryService.isInitialized).toBeTruthy();
    });

    it('should handle initialization errors', async () => {
      const memoryService = new MemoryService();
      // Mock the openai.embeddings.create to throw an error
      (memoryService as any).openai.embeddings.create = jest.fn().mockRejectedValue(new Error('Init failed'));
      
      await expect(memoryService.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('storeMemory', () => {
    beforeEach(async () => {
      await memoryService.initialize();
    });

    it('should store memory with embedding successfully', async () => {
      const mockMemoryEntry = {
        id: 'memory-123',
        content: 'Test memory content',
        category: 'GENERAL',
        importance: 5,
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      };

      mockPrisma.memoryEntry.create.mockResolvedValue(mockMemoryEntry);

      const result = await memoryService.storeMemory({
        sessionId: 'session-123',
        userId: 'user-123',
        content: 'Test memory content',
        category: 'GENERAL',
        importance: 5,
        tags: ['test', 'memory'],
      });

      expect(mockPrisma.memoryEntry.create).toHaveBeenCalledWith({
        data: {
          content: 'Test memory content',
          category: 'GENERAL',
          importance: 5,
          tags: ['test', 'memory'],
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
          userId: 'user-123',
          sessionId: 'session-123',
        },
      });

      expect(result).toEqual({
        id: 'memory-123',
        content: 'Test memory content',
        category: 'GENERAL',
        importance: 5,
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      });
    });

    it('should calculate importance if not provided', async () => {
      const mockMemoryEntry = {
        id: 'memory-123',
        content: 'Test memory content',
        category: 'GENERAL',
        importance: 3, // Default calculated importance
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      };

      mockPrisma.memoryEntry.create.mockResolvedValue(mockMemoryEntry);

      await memoryService.storeMemory({
        sessionId: 'session-123',
        content: 'Test memory content',
        category: 'GENERAL',
        tags: ['test'],
      });

      expect(mockPrisma.memoryEntry.create).toHaveBeenCalledWith({
        data: {
          content: 'Test memory content',
          category: 'GENERAL',
          importance: 3, // Should be calculated
          tags: ['test'],
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
          userId: undefined,
          sessionId: 'session-123',
        },
      });
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new MemoryService();
      
      await expect(uninitializedService.storeMemory({
        sessionId: 'session-123',
        content: 'Test',
        category: 'GENERAL',
      })).rejects.toThrow('Memory Service not initialized');
    });
  });

  describe('searchMemories', () => {
    beforeEach(async () => {
      await memoryService.initialize();
    });

    it('should search memories using semantic search', async () => {
      const mockMemories = [
        {
          id: 'memory-1',
          content: 'First memory',
          category: 'GENERAL',
          importance: 5,
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
          createdAt: new Date('2023-01-01'),
          tags: ['test'],
        },
        {
          id: 'memory-2',
          content: 'Second memory',
          category: 'CHARACTER',
          importance: 7,
          embedding: [0.2, 0.3, 0.4, 0.5, 0.6],
          createdAt: new Date('2023-01-02'),
          tags: ['character'],
        },
      ];

      mockPrisma.memoryEntry.findMany.mockResolvedValue(mockMemories);

      const results = await memoryService.searchMemories({
        query: 'test query',
        sessionId: 'session-123',
        limit: 10,
      });

      expect(mockPrisma.memoryEntry.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          sessionId: 'session-123',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('similarity');
      expect(results[0]).toHaveProperty('content');
      expect(results[0]).toHaveProperty('category');
    });

    it('should filter by category if provided', async () => {
      mockPrisma.memoryEntry.findMany.mockResolvedValue([]);

      await memoryService.searchMemories({
        query: 'test query',
        sessionId: 'session-123',
        category: 'CHARACTER',
        minImportance: 5,
      });

      expect(mockPrisma.memoryEntry.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          sessionId: 'session-123',
          category: 'CHARACTER',
          importance: { gte: 5 },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('getMemoryStats', () => {
    beforeEach(async () => {
      await memoryService.initialize();
    });

    it('should return memory statistics', async () => {
      mockPrisma.memoryEntry.count
        .mockResolvedValueOnce(100) // totalMemories
        .mockResolvedValueOnce(80); // activeMemories

      mockPrisma.memoryEntry.groupBy.mockResolvedValue([
        { category: 'GENERAL', _count: { category: 30 } },
        { category: 'CHARACTER', _count: { category: 25 } },
        { category: 'LOCATION', _count: { category: 15 } },
      ]);

      mockPrisma.memoryEntry.aggregate.mockResolvedValue({
        _avg: { importance: 6.5 },
      });

      const stats = await memoryService.getMemoryStats('session-123');

      expect(stats).toEqual({
        totalMemories: 100,
        activeMemories: 80,
        memoriesByCategory: {
          GENERAL: 30,
          CHARACTER: 25,
          LOCATION: 15,
        },
        averageImportance: 6.5,
      });
    });
  });

  describe('cleanupMemories', () => {
    beforeEach(async () => {
      await memoryService.initialize();
    });

    it('should clean up old memories', async () => {
      mockPrisma.memoryEntry.findMany.mockResolvedValue([
        { id: 'memory-1' },
        { id: 'memory-2' },
        { id: 'memory-3' },
      ]);

      mockPrisma.memoryEntry.updateMany.mockResolvedValue({ count: 5 });

      const cleanedCount = await memoryService.cleanupMemories({
        sessionId: 'session-123',
        keepCount: 3,
        minImportance: 7,
      });

      expect(cleanedCount).toBe(5);
      expect(mockPrisma.memoryEntry.updateMany).toHaveBeenCalledWith({
        where: {
          sessionId: 'session-123',
          isActive: true,
          id: { notIn: ['memory-1', 'memory-2', 'memory-3'] },
        },
        data: { isActive: false },
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all systems work', async () => {
      await memoryService.initialize();
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const health = await memoryService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details).toHaveProperty('initialized', true);
      expect(health.details).toHaveProperty('embeddingDimension', 5);
    });

    it('should return unhealthy status when systems fail', async () => {
      await memoryService.initialize();
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

      const health = await memoryService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details).toHaveProperty('error', 'Database error');
    });
  });
});

describe('ConversationHistoryManager', () => {
  let conversationManager: ConversationHistoryManager;
  let mockPrisma: any;

  beforeEach(() => {
    conversationManager = new ConversationHistoryManager();
    mockPrisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('addMessages', () => {
    it('should add messages to conversation history', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: 'Hello',
          timestamp: new Date('2023-01-01T10:00:00Z'),
        },
        {
          role: 'assistant' as const,
          content: 'Hi there!',
          timestamp: new Date('2023-01-01T10:01:00Z'),
        },
      ];

      mockPrisma.aIMessage.create.mockResolvedValue({});

      await conversationManager.addMessages('session-123', messages);

      expect(mockPrisma.aIMessage.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.aIMessage.create).toHaveBeenCalledWith({
        data: {
          content: 'Hello',
          role: 'USER',
          timestamp: new Date('2023-01-01T10:00:00Z'),
          conversationId: 'session-123',
        },
      });
      expect(mockPrisma.aIMessage.create).toHaveBeenCalledWith({
        data: {
          content: 'Hi there!',
          role: 'ASSISTANT',
          timestamp: new Date('2023-01-01T10:01:00Z'),
          conversationId: 'session-123',
        },
      });
    });
  });

  describe('getConversationHistory', () => {
    it('should retrieve conversation history with pagination', async () => {
      const mockMessages = [
        {
          role: 'USER',
          content: 'Hello',
          timestamp: new Date('2023-01-01T10:00:00Z'),
        },
        {
          role: 'ASSISTANT',
          content: 'Hi there!',
          timestamp: new Date('2023-01-01T10:01:00Z'),
        },
      ];

      mockPrisma.aIMessage.findMany.mockResolvedValue(mockMessages);
      mockPrisma.aIMessage.count.mockResolvedValue(2);

      const result = await conversationManager.getConversationHistory({
        sessionId: 'session-123',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: new Date('2023-01-01T10:00:00Z'),
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: new Date('2023-01-01T10:01:00Z'),
          },
        ],
        totalCount: 2,
        hasMore: false,
      });
    });

    it('should handle date filtering', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-02');

      mockPrisma.aIMessage.findMany.mockResolvedValue([]);
      mockPrisma.aIMessage.count.mockResolvedValue(0);

      await conversationManager.getConversationHistory({
        sessionId: 'session-123',
        startDate,
        endDate,
      });

      expect(mockPrisma.aIMessage.findMany).toHaveBeenCalledWith({
        where: {
          conversationId: 'session-123',
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('getConversationStats', () => {
    it('should return conversation statistics', async () => {
      const mockMessages = [
        {
          role: 'USER',
          content: 'Hello world',
          timestamp: new Date('2023-01-01T10:00:00Z'),
        },
        {
          role: 'ASSISTANT',
          content: 'Hi there!',
          timestamp: new Date('2023-01-01T10:01:00Z'),
        },
        {
          role: 'USER',
          content: 'How are you?',
          timestamp: new Date('2023-01-01T11:00:00Z'),
        },
      ];

      mockPrisma.aIMessage.findMany.mockResolvedValue(mockMessages);

      const stats = await conversationManager.getConversationStats('session-123');

      expect(stats).toEqual({
        totalMessages: 3,
        messagesByRole: {
          USER: 2,
          ASSISTANT: 1,
        },
        averageMessageLength: expect.any(Number),
        conversationDuration: expect.any(Number),
        messagesPerHour: expect.any(Number),
        mostActiveHour: expect.any(String),
      });
    });

    it('should handle empty conversation', async () => {
      mockPrisma.aIMessage.findMany.mockResolvedValue([]);

      const stats = await conversationManager.getConversationStats('session-123');

      expect(stats).toEqual({
        totalMessages: 0,
        messagesByRole: {},
        averageMessageLength: 0,
        conversationDuration: 0,
        messagesPerHour: 0,
        mostActiveHour: '00:00',
      });
    });
  });

  describe('searchConversationHistory', () => {
    it('should search conversation history', async () => {
      const mockMessages = [
        {
          role: 'USER',
          content: 'Hello world',
          timestamp: new Date('2023-01-01T10:00:00Z'),
        },
      ];

      mockPrisma.aIMessage.findMany.mockResolvedValue(mockMessages);

      const results = await conversationManager.searchConversationHistory({
        sessionId: 'session-123',
        query: 'hello',
        limit: 5,
      });

      expect(mockPrisma.aIMessage.findMany).toHaveBeenCalledWith({
        where: {
          conversationId: 'session-123',
          content: {
            contains: 'hello',
            mode: 'insensitive',
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 5,
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('message');
      expect(results[0]).toHaveProperty('relevanceScore');
    });
  });

  describe('cleanupOldConversations', () => {
    it('should clean up old conversations', async () => {
      mockPrisma.aIMessage.findMany.mockResolvedValue([
        { id: 'msg-1' },
        { id: 'msg-2' },
      ]);

      mockPrisma.aIMessage.deleteMany.mockResolvedValue({ count: 10 });

      const cleanedCount = await conversationManager.cleanupOldConversations({
        sessionId: 'session-123',
        keepDays: 30,
        keepCount: 100,
      });

      expect(cleanedCount).toBe(10);
      expect(mockPrisma.aIMessage.deleteMany).toHaveBeenCalled();
    });
  });
});