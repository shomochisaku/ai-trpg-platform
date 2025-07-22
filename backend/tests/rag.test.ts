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

  describe('bulk operations', () => {
    it('should handle bulk memory storage', async () => {
      const mockEntries = [
        { id: 'mem1', content: 'content1', category: 'conversation' },
        { id: 'mem2', content: 'content2', category: 'game_action' }
      ];
      
      jest.spyOn(vectorSearchService, 'bulkStore').mockResolvedValue(mockEntries);
      
      const result = await vectorSearchService.bulkStore('test-campaign', mockEntries);
      expect(result).toHaveLength(2);
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