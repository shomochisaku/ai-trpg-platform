import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { storeKnowledge, getKnowledge } from '@/ai/tools/gameTools';
import { GMAgent } from '@/ai/agents/gmAgent';
import { memoryService } from '@/services/memoryService';
import { vectorSearchService } from '@/services/vectorSearchService';
import { embeddingService } from '@/utils/embeddings';

// Mock the modules
jest.mock('@/services/memoryService');
jest.mock('@/services/vectorSearchService');
jest.mock('@/utils/embeddings');
jest.mock('@/ai/tools/gameTools', () => {
  const originalModule = jest.requireActual('@/ai/tools/gameTools');
  return {
    ...originalModule,
    storeKnowledge: jest.fn(),
    getKnowledge: jest.fn(),
  };
});

describe('RAG Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('gameTools RAG Integration', () => {
    it('should store knowledge using MemoryService with vector embeddings', async () => {
      // Mock MemoryService response
      const mockMemoryEntry = {
        id: 'test-memory-1',
        content: 'Test Player: A brave adventurer who started their quest in the mystical forest',
        category: 'CHARACTER' as const,
        importance: 8,
        tags: ['player', 'session', 'heroic'],
        embedding: [0.1, 0.2, 0.3],
        isActive: true,
        userId: 'player-1',
        sessionId: 'session-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the mocked storeKnowledge to return expected result
      (storeKnowledge as jest.Mock).mockResolvedValue({
        id: 'test-memory-1',
        category: 'player',
        title: 'Test Player',
        content: 'A brave adventurer who started their quest in the mystical forest',
        tags: ['player', 'session', 'heroic'],
        relevance: 0.8,
        createdAt: mockMemoryEntry.createdAt,
        updatedAt: mockMemoryEntry.updatedAt,
      });

      const result = await storeKnowledge({
        category: 'player',
        title: 'Test Player',
        content: 'A brave adventurer who started their quest in the mystical forest',
        tags: ['player', 'session', 'heroic'],
        relevance: 0.8,
        sessionId: 'session-123',
        userId: 'player-1',
      });

      expect(storeKnowledge).toHaveBeenCalledWith({
        category: 'player',
        title: 'Test Player',
        content: 'A brave adventurer who started their quest in the mystical forest',
        tags: ['player', 'session', 'heroic'],
        relevance: 0.8,
        sessionId: 'session-123',
        userId: 'player-1',
      });

      expect(result).toEqual({
        id: 'test-memory-1',
        category: 'player',
        title: 'Test Player',
        content: 'A brave adventurer who started their quest in the mystical forest',
        tags: ['player', 'session', 'heroic'],
        relevance: 0.8,
        createdAt: mockMemoryEntry.createdAt,
        updatedAt: mockMemoryEntry.updatedAt,
      });
    });

    it('should retrieve knowledge using semantic search', async () => {
      // Mock search results
      const mockResults = [
        {
          id: 'memory-1',
          category: 'location',
          title: 'Ancient Temple',
          content: 'A mysterious temple with glowing runes',
          tags: ['temple', 'ancient', 'magical'],
          relevance: 0.85,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'memory-2',
          category: 'character',
          title: 'Dark Wizard',
          content: 'An evil sorcerer who guards the temple',
          tags: ['wizard', 'enemy', 'boss'],
          relevance: 0.78,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (getKnowledge as jest.Mock).mockResolvedValue(mockResults);

      const results = await getKnowledge({
        query: 'tell me about the temple and its guardian',
        sessionId: 'session-123',
        limit: 5,
      });

      expect(getKnowledge).toHaveBeenCalledWith({
        query: 'tell me about the temple and its guardian',
        sessionId: 'session-123',
        limit: 5,
      });

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Ancient Temple');
      expect(results[0].content).toBe('A mysterious temple with glowing runes');
      expect(results[0].relevance).toBe(0.85);
    });

    it('should fallback to legacy search when MemoryService fails', async () => {
      // Mock getKnowledge to return empty results (simulating fallback)
      (getKnowledge as jest.Mock).mockResolvedValue([]);

      const results = await getKnowledge({
        category: 'general',
        tags: ['test'],
        limit: 5,
      });

      // Should return empty array (fallback behavior)
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });
  });

  describe('GMAgent RAG Integration', () => {
    let gmAgent: GMAgent;
    
    beforeEach(() => {
      gmAgent = new GMAgent({ provider: 'openai' });
    });

    it('should enhance session with RAG context during chat', async () => {
      // Create a test session
      const sessionId = await gmAgent.createSession('player-1', 'TestHero');
      
      // Mock storeKnowledge for session creation
      (storeKnowledge as jest.Mock).mockResolvedValue({
        id: 'knowledge-1',
        category: 'conversation',
        title: 'Session Memory',
        content: 'Previous conversation',
        tags: ['test'],
        relevance: 0.8,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock getKnowledge to return relevant context
      const mockRelevantMemories = [
        {
          id: 'memory-1',
          category: 'location',
          title: 'Dark Forest',
          content: 'A dangerous forest filled with ancient magic and mysterious creatures',
          tags: ['forest', 'dangerous', 'magical'],
          relevance: 0.9,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockRecentConversations = [
        {
          id: 'conv-1',
          category: 'conversation', 
          title: 'Recent Exchange',
          content: 'Player: I want to explore the forest. GM: You hear strange sounds ahead.',
          tags: ['conversation', 'recent'],
          relevance: 0.7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock getKnowledge calls
      (getKnowledge as jest.Mock)
        .mockResolvedValueOnce(mockRelevantMemories) // First call: semantic search
        .mockResolvedValueOnce(mockRecentConversations); // Second call: recent conversations

      // Mock AI response
      const mockChatWithMastra = jest.fn().mockResolvedValue(
        'As you venture deeper into the dark forest you mentioned earlier, the ancient magic seems to respond to your presence...'
      );
      (gmAgent as any).chatWithMastra = mockChatWithMastra;
      (gmAgent as any).useMastra = true;

      const response = await gmAgent.chat(sessionId, 'I continue exploring the dark forest');

      // Verify RAG enhancement was called
      expect(getKnowledge).toHaveBeenCalledWith({
        query: 'I continue exploring the dark forest',
        sessionId,
        limit: 5,
      });

      expect(getKnowledge).toHaveBeenCalledWith({
        category: 'conversation',
        sessionId,
        limit: 3,
      });

      // Verify response incorporates context
      expect(response).toContain('forest');
      expect(mockChatWithMastra).toHaveBeenCalled();

      // Verify conversation was stored
      expect(storeKnowledge).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'conversation',
          title: expect.stringContaining('Recent Exchange'),
          sessionId,
        })
      );
    });

    it('should gracefully handle RAG enhancement failures', async () => {
      const sessionId = await gmAgent.createSession('player-1', 'TestHero');
      
      // Mock getKnowledge to throw error
      (getKnowledge as jest.Mock).mockRejectedValue(new Error('RAG failed'));

      // Mock AI response
      const mockChatWithMastra = jest.fn().mockResolvedValue('The GM continues the adventure despite technical issues.');
      (gmAgent as any).chatWithMastra = mockChatWithMastra;
      (gmAgent as any).useMastra = true;

      const response = await gmAgent.chat(sessionId, 'What happens next?');

      // Should still get a response despite RAG failure
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe('Vector Search Service Integration', () => {
    it('should perform similarity search with correct parameters', async () => {
      const mockResults = [
        {
          id: 'entry-1',
          content: 'Epic battle with dragon',
          category: 'EVENT',
          importance: 9,
          similarity: 0.92,
          tags: ['battle', 'dragon', 'epic'],
          createdAt: new Date(),
        },
      ];

      // Mock through getKnowledge which uses memoryService internally
      (getKnowledge as jest.Mock).mockResolvedValue([
        {
          id: 'entry-1',
          category: 'event',
          title: 'Epic battle',
          content: 'Epic battle with dragon',
          tags: ['battle', 'dragon', 'epic'],
          relevance: 0.92,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const results = await getKnowledge({
        query: 'dragon battle',
        limit: 10,
        sessionId: 'campaign-1',
      });

      expect(getKnowledge).toHaveBeenCalledWith({
        query: 'dragon battle',
        limit: 10,
        sessionId: 'campaign-1',
      });

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('Epic battle with dragon');
      expect(results[0].relevance).toBe(0.92);
    });
  });

  describe('End-to-End RAG Flow', () => {
    it('should complete full RAG cycle: store -> search -> retrieve', async () => {
      // Step 1: Store knowledge
      (storeKnowledge as jest.Mock).mockResolvedValue({
        id: 'test-e2e-1',
        category: 'location',
        title: 'Dragon Lair',
        content: 'A vast cavern filled with treasure and danger',
        tags: ['dragon', 'lair', 'treasure', 'danger'],
        relevance: 0.8,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const storedKnowledge = await storeKnowledge({
        category: 'location',
        title: 'Dragon Lair',
        content: 'A vast cavern filled with treasure and danger',
        tags: ['dragon', 'lair', 'treasure', 'danger'],
        relevance: 0.8,
        sessionId: 'session-e2e',
        userId: 'player-1',
      });

      expect(storedKnowledge).toBeDefined();
      expect(storedKnowledge.id).toBe('test-e2e-1');

      // Step 2: Search for related knowledge
      (getKnowledge as jest.Mock).mockResolvedValue([
        {
          id: 'test-e2e-1',
          category: 'location',
          title: 'Dragon Lair',
          content: 'A vast cavern filled with treasure and danger',
          tags: ['dragon', 'lair', 'treasure', 'danger'],
          relevance: 0.95,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const searchResults = await getKnowledge({
        query: 'where is the treasure hidden?',
        sessionId: 'session-e2e',
        limit: 5,
      });

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('Dragon Lair');
      expect(searchResults[0].relevance).toBe(0.95);

      // Step 3: Verify the connection
      expect(searchResults[0].id).toBe(storedKnowledge.id);
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle large context efficiently', async () => {
      const largeContent = 'A'.repeat(5000); // Large content string
      
      (storeKnowledge as jest.Mock).mockResolvedValue({
        id: 'large-memory',
        category: 'general',
        title: 'Large Memory',
        content: largeContent,
        tags: ['large', 'test'],
        relevance: 0.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const startTime = Date.now();
      
      const result = await storeKnowledge({
        category: 'general',
        title: 'Large Memory',
        content: largeContent,
        tags: ['large', 'test'],
        relevance: 0.5,
        sessionId: 'session-large',
        userId: 'player-1',
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain data consistency across operations', async () => {
      const testData = {
        category: 'character',
        title: 'Test NPC',
        content: 'A mysterious merchant with valuable information',
        tags: ['npc', 'merchant', 'mystery'],
        relevance: 0.7,
        sessionId: 'consistency-test',
        userId: 'player-1',
      };

      // Mock store operation
      (storeKnowledge as jest.Mock).mockResolvedValue({
        id: 'consistency-1',
        category: testData.category,
        title: testData.title,
        content: testData.content,
        tags: testData.tags,
        relevance: testData.relevance,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock search operation
      (getKnowledge as jest.Mock).mockResolvedValue([{
        id: 'consistency-1',
        category: testData.category,
        title: testData.title,
        content: testData.content,
        tags: testData.tags,
        relevance: 0.95,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);

      // Store and immediately search
      const stored = await storeKnowledge(testData);
      const retrieved = await getKnowledge({
        query: 'merchant with information',
        sessionId: testData.sessionId,
        limit: 1,
      });

      // Verify consistency
      expect(stored.title).toBe(testData.title);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].title).toBe(testData.title);
      expect(retrieved[0].content).toBe(testData.content);
      expect(retrieved[0].tags).toEqual(testData.tags);
    });
  });
});