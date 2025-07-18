import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ragService } from '@/services/ragService';
import { campaignService } from '@/services/campaignService';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('openai');

describe('RAG Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(ragService.initialize()).resolves.not.toThrow();
    });
  });

  describe('generateEmbedding', () => {
    it('should generate embeddings for text', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      
      // Mock OpenAI response
      const mockOpenAI = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [{ embedding: mockEmbedding }],
            usage: { total_tokens: 10 },
          }),
        },
      };
      
      (ragService as any).openai = mockOpenAI;
      
      const result = await ragService.generateEmbedding('test text');
      
      expect(result.embedding).toHaveLength(1536);
      expect(result.tokenCount).toBe(10);
    });
  });

  describe('storeKnowledge', () => {
    it('should store knowledge with embeddings', async () => {
      const mockEntry = {
        id: 'test-id',
        agentId: 'campaign-1',
        content: 'Test content',
        type: 'knowledge',
        metadata: {
          category: 'lore',
          title: 'Test Knowledge',
          tags: ['test'],
        },
        importance: 0.7,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock Prisma create
      const mockPrisma = {
        memoryEntry: {
          create: jest.fn().mockResolvedValue(mockEntry),
        },
      };
      
      (ragService as any).prisma = mockPrisma;
      
      const data = {
        campaignId: 'campaign-1',
        category: 'lore' as const,
        title: 'Test Knowledge',
        content: 'Test content',
        tags: ['test'],
      };
      
      const result = await ragService.storeKnowledge(data);
      
      expect(result.id).toBe('test-id');
      expect(result.category).toBe('lore');
      expect(result.title).toBe('Test Knowledge');
    });
  });

  describe('searchKnowledge', () => {
    it('should search for similar knowledge entries', async () => {
      const mockResults = [
        {
          id: 'entry-1',
          content: 'Relevant content',
          metadata: { category: 'lore' },
          importance: 0.8,
          similarity: 0.9,
        },
      ];

      // Mock Prisma raw query
      const mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue(mockResults),
      };
      
      (ragService as any).prisma = mockPrisma;
      
      const params = {
        campaignId: 'campaign-1',
        query: 'search query',
        limit: 10,
      };
      
      const results = await ragService.searchKnowledge(params);
      
      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(0.9);
    });
  });
});

describe('Campaign Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCampaign', () => {
    it('should create a campaign and initialize knowledge', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        userId: 'user-1',
        title: 'Test Campaign',
        description: 'Test description',
        status: 'active',
        aiSettings: {},
        metadata: { knowledgeInitialized: false },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock Prisma operations
      const mockPrisma = {
        gameSession: {
          create: jest.fn().mockResolvedValue(mockCampaign),
          update: jest.fn().mockResolvedValue({
            ...mockCampaign,
            metadata: { knowledgeInitialized: true },
          }),
        },
      };
      
      (campaignService as any).prisma = mockPrisma;
      
      // Mock RAG service
      jest.spyOn(ragService, 'storeKnowledge').mockResolvedValue({} as any);
      
      const data = {
        userId: 'user-1',
        title: 'Test Campaign',
        settings: {
          gmProfile: {
            personality: 'Friendly',
            speechStyle: 'Casual',
            guidingPrinciples: ['Fair', 'Fun'],
          },
          worldSettings: {
            toneAndManner: 'Fantasy',
            keyConcepts: ['Magic', 'Adventure'],
          },
          opening: {
            prologue: 'Once upon a time...',
            initialStatusTags: ['Healthy'],
            initialInventory: ['Sword'],
          },
        },
      };
      
      const result = await campaignService.createCampaign(data);
      
      expect(result.id).toBe('campaign-1');
      expect(result.title).toBe('Test Campaign');
      expect(ragService.storeKnowledge).toHaveBeenCalled();
    });
  });

  describe('getCampaignStats', () => {
    it('should return campaign statistics', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        userId: 'user-1',
        title: 'Test Campaign',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock campaign service methods
      jest.spyOn(campaignService, 'getCampaign').mockResolvedValue(mockCampaign as any);
      
      // Mock RAG stats
      jest.spyOn(ragService, 'getKnowledgeStats').mockResolvedValue({
        total: 10,
        byCategory: { lore: 5, characters: 3, events: 2 },
      });
      
      // Mock Prisma counts
      const mockPrisma = {
        character: { count: jest.fn().mockResolvedValue(2) },
        conversationHistory: { count: jest.fn().mockResolvedValue(50) },
      };
      
      (campaignService as any).prisma = mockPrisma;
      
      const stats = await campaignService.getCampaignStats('campaign-1');
      
      expect(stats.campaign.id).toBe('campaign-1');
      expect(stats.statistics.knowledge.total).toBe(10);
      expect(stats.statistics.characters).toBe(2);
      expect(stats.statistics.conversations).toBe(50);
    });
  });
});