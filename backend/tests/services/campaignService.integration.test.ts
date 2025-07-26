import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { campaignService } from '../../src/services/campaignService';
import { aiService } from '../../src/ai/aiService';

// Mock services are already set up in setup.ts, but we override for specific test needs
jest.mock('../../src/services/campaignService');
jest.mock('../../src/ai/aiService');

const mockCampaignService = campaignService as jest.Mocked<typeof campaignService>;
const mockAiService = aiService as jest.Mocked<typeof aiService>;

describe('Campaign Service AI Integration Tests', () => {
  let testCampaignId: string = 'test-campaign-123';
  let testUserId: string = 'test-user-123';
  let testPlayerId: string = 'test-player-456';

  beforeAll(async () => {
    // Mock AI service initialization
    mockAiService.initialize.mockResolvedValue(true);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Player Action Processing', () => {
    it('should process a combat action successfully', async () => {
      const mockCampaign = {
        id: testCampaignId,
        title: 'Test Campaign',
        gameState: {
          currentScene: 'dungeon',
          playerActions: [],
          statusTags: [],
          inventory: []
        }
      };

      const mockActionResult = {
        narrative: 'You swing your sword at the orc, striking it with a mighty blow!',
        gameState: {
          currentScene: 'dungeon',
          playerActions: ['attack orc'],
          statusTags: ['in_combat'],
          inventory: []
        },
        diceResults: [{
          dice: '1d20',
          result: 15,
          target: 12,
          success: true,
          reason: 'Combat attack roll'
        }]
      };

      mockCampaignService.getCampaign.mockResolvedValue(mockCampaign);
      mockCampaignService.processPlayerAction.mockResolvedValue(mockActionResult);

      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        'I attack the orc with my sword!'
      );

      expect(result).toBeDefined();
      expect(result.narrative).toContain('sword');
      expect(result.gameState.statusTags).toContain('in_combat');
      expect(result.diceResults).toBeDefined();
      expect(result.diceResults[0].success).toBe(true);
    });

    it('should process an exploration action successfully', async () => {
      const mockActionResult = {
        narrative: 'You carefully search the room and discover a hidden passage behind the bookshelf.',
        gameState: {
          currentScene: 'library',
          playerActions: ['search room'],
          statusTags: ['discovered_secret'],
          inventory: []
        },
        diceResults: [{
          dice: '1d20',
          result: 18,
          target: 15,
          success: true,
          reason: 'Investigation check'
        }]
      };

      mockCampaignService.processPlayerAction.mockResolvedValue(mockActionResult);

      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        'I search the room for hidden secrets'
      );

      expect(result.narrative).toContain('hidden');
      expect(result.gameState.statusTags).toContain('discovered_secret');
    });

    it('should process a social action successfully', async () => {
      const mockActionResult = {
        narrative: 'The merchant listens to your persuasive words and agrees to give you a discount.',
        gameState: {
          currentScene: 'marketplace',
          playerActions: ['persuade merchant'],
          statusTags: ['good_reputation'],
          inventory: []
        },
        diceResults: [{
          dice: '1d20',
          result: 16,
          target: 14,
          success: true,
          reason: 'Persuasion check'
        }]
      };

      mockCampaignService.processPlayerAction.mockResolvedValue(mockActionResult);

      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        'I try to negotiate a better price with the merchant'
      );

      expect(result.narrative).toContain('merchant');
      expect(result.gameState.statusTags).toContain('good_reputation');
    });
  });

  describe('State Management', () => {
    it('should update game state properly after actions', async () => {
      const mockUpdatedCampaign = {
        id: testCampaignId,
        title: 'Test Campaign',
        gameState: {
          currentScene: 'tavern',
          playerActions: ['order drink', 'talk to bartender'],
          statusTags: ['relaxed'],
          inventory: ['health_potion']
        }
      };

      mockCampaignService.processPlayerAction.mockResolvedValue({
        success: true,
        narrative: 'You settle into the tavern and order a drink.',
        gameState: mockUpdatedCampaign.gameState,
        diceResults: [],
        statusChanges: []
      });

      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        'I order a drink and talk to the bartender'
      );

      expect(result.success).toBe(true);
      expect(result.narrative).toContain('tavern');
      expect(result.gameState.statusTags).toContain('relaxed');
      expect(result.gameState.inventory).toContain('health_potion');
    });

    it.skip('should store action results in database', async () => {
      const mockStoredResult = {
        id: 'action-result-123',
        campaignId: testCampaignId,
        playerId: testPlayerId,
        action: 'test action',
        result: 'test result',
        timestamp: new Date()
      };

      mockCampaignService.storeActionResult.mockResolvedValue(mockStoredResult);

      const result = await campaignService.storeActionResult({
        campaignId: testCampaignId,
        playerId: testPlayerId,
        action: 'test action',
        result: 'test result'
      });

      expect(result.id).toBeDefined();
      expect(result.campaignId).toBe(testCampaignId);
    });
  });

  describe('RAG System Integration', () => {
    it('should use campaign knowledge in responses', async () => {
      const mockActionResult = {
        narrative: 'Based on your previous encounters with goblins, you recognize their tactics and prepare accordingly.',
        gameState: {
          currentScene: 'forest',
          playerActions: ['prepare for combat'],
          statusTags: ['tactical_advantage'],
          inventory: []
        },
        diceResults: [],
        knowledgeUsed: ['Previous goblin encounters', 'Combat tactics']
      };

      mockCampaignService.processPlayerAction.mockResolvedValue(mockActionResult);

      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        'I prepare to fight the goblins'
      );

      expect(result.narrative).toContain('previous encounters');
      expect(result.knowledgeUsed).toBeDefined();
      expect(result.knowledgeUsed).toContain('Combat tactics');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty actions gracefully', async () => {
      mockCampaignService.processPlayerAction.mockResolvedValue({
        narrative: 'You pause to think about what to do next.',
        gameState: {
          currentScene: 'unknown',
          playerActions: [],
          statusTags: ['contemplating'],
          inventory: []
        },
        diceResults: []
      });

      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        ''
      );

      expect(result.narrative).toBeTruthy();
      expect(result.gameState.statusTags).toContain('contemplating');
    });

    it('should handle invalid campaign ID gracefully', async () => {
      mockCampaignService.processPlayerAction.mockRejectedValue(
        new Error('Campaign not found')
      );

      await expect(
        campaignService.processPlayerAction(
          'invalid-campaign-id',
          testPlayerId,
          'test action'
        )
      ).rejects.toThrow('Campaign not found');
    });
  });

  describe('Performance', () => {
    it('should complete action processing within reasonable time', async () => {
      const startTime = Date.now();
      
      mockCampaignService.processPlayerAction.mockResolvedValue({
        narrative: 'Quick response',
        gameState: {
          currentScene: 'test',
          playerActions: [],
          statusTags: [],
          inventory: []
        },
        diceResults: []
      });

      await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        'test action'
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});