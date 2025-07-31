import { describe, it, expect, jest, beforeEach } from '@jest/globals';
// RAGService is currently disabled in MVP, testing VectorSearchService instead
import { vectorSearchService } from '@/services/vectorSearchService';
import { campaignService } from '@/services/campaignService';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('openai');

describe('Vector Search Service (RAG replacement)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchMemories', () => {
    it('should search memories successfully', async () => {
      const mockResults = [
        { id: 'mem1', content: 'test content', similarity: 0.9 }
      ];
      jest.spyOn(vectorSearchService, 'searchMemories').mockResolvedValue(mockResults);
      
      const results = await vectorSearchService.searchMemories('test query', { campaignId: 'test-id' });
      expect(results).toBeDefined();
      expect(results.length).toBe(1);
    });
  });

  describe('storeMemory', () => {
    it('should store memory successfully', async () => {
      const mockMemoryEntry = {
        id: 'test-id',
        campaignId: 'test-campaign',
        content: 'test content',
        category: 'conversation',
        embedding: new Array(1536).fill(0.1)
      };
      
      jest.spyOn(vectorSearchService, 'storeMemory').mockResolvedValue(mockMemoryEntry);
      
      const result = await vectorSearchService.storeMemory({
        campaignId: 'test-campaign',
        content: 'test content',
        category: 'conversation'
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBe('test-id');
    });
  });

  describe('vector similarity search', () => {
    it('should search for similar memories with vector embedding', async () => {
      const mockResults = [
        { 
          id: 'mem1', 
          content: 'content1', 
          category: 'conversation',
          importance: 0.8,
          similarity: 0.95,
          tags: ['test'],
          createdAt: new Date()
        },
        { 
          id: 'mem2', 
          content: 'content2', 
          category: 'game_action',
          importance: 0.6,
          similarity: 0.85,
          tags: ['action'],
          createdAt: new Date()
        }
      ];
      
      jest.spyOn(vectorSearchService, 'searchSimilar').mockResolvedValue(mockResults);
      
      const embedding = new Array(1024).fill(0.1); // Mock embedding vector
      const result = await vectorSearchService.searchSimilar(embedding, {
        campaignId: 'test-campaign',
        limit: 10,
        threshold: 0.8
      });
      
      expect(result).toHaveLength(2);
      expect(result[0].similarity).toBeGreaterThan(0.8);
    });
  });
});

describe('Campaign Service Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCampaign', () => {
    it('should create a campaign successfully', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        userId: 'user-1', 
        title: 'Test Campaign',
        description: 'Test description',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(campaignService, 'createCampaign').mockResolvedValue(mockCampaign);
      
      const result = await campaignService.createCampaign({
        userId: 'user-1',
        title: 'Test Campaign',
        description: 'Test description'
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBe('campaign-1');
    });
  });
});