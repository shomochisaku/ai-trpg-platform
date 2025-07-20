import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { campaignService } from '../../src/services/campaignService';
import { aiService } from '../../src/ai/aiService';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../src/utils/logger';

const prisma = new PrismaClient();

describe('Campaign Service AI Integration Tests', () => {
  let testCampaignId: string;
  let testUserId: string = 'test-user-123';
  let testPlayerId: string = 'test-player-456';

  beforeAll(async () => {
    // Initialize AI service
    try {
      await aiService.initialize();
      logger.info('AI service initialized for testing');
    } catch (error) {
      logger.warn('AI service initialization failed, tests may skip:', error);
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testCampaignId) {
      try {
        await campaignService.deleteCampaign(testCampaignId);
      } catch (error) {
        logger.warn('Failed to clean up test campaign:', error);
      }
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create a test campaign
    const campaignData = {
      userId: testUserId,
      title: 'Test AI Integration Campaign',
      description: 'A test campaign for AI integration testing',
      settings: {
        gmProfile: {
          personality: 'friendly and helpful GM who provides detailed descriptions',
          speechStyle: 'descriptive and immersive',
          guidingPrinciples: ['player agency', 'narrative consistency', 'balanced challenge']
        },
        worldSettings: {
          toneAndManner: 'fantasy adventure with heroic themes',
          keyConcepts: ['magic', 'ancient ruins', 'heroic quests', 'mystical creatures']
        },
        opening: {
          prologue: 'You stand at the edge of an ancient forest, where legends speak of forgotten treasures and dangerous creatures. A narrow path leads deeper into the shadowy woods.',
          initialStatusTags: ['healthy', 'determined', 'equipped'],
          initialInventory: ['leather armor', 'iron sword', 'healing potion', 'torch']
        }
      }
    };

    const campaign = await campaignService.createCampaign(campaignData);
    testCampaignId = campaign.id;
  });

  describe('Player Action Processing', () => {
    it('should process a combat action successfully', async () => {
      if (!aiService.isInitialized()) {
        console.warn('Skipping test - AI service not initialized');
        return;
      }

      const playerAction = 'I draw my sword and carefully approach the rustling bushes, ready to defend myself';

      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        playerAction
      );

      // Verify result structure
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.narrative).toBeDefined();
      expect(typeof result.narrative).toBe('string');
      expect(result.narrative.length).toBeGreaterThan(0);

      // Verify game state
      expect(result.gameState).toBeDefined();
      expect(result.gameState.currentScene).toBeDefined();
      expect(Array.isArray(result.gameState.playerStatus)).toBe(true);
      expect(Array.isArray(result.gameState.npcs)).toBe(true);
      expect(result.gameState.environment).toBeDefined();

      // Verify suggested actions
      expect(result.suggestedActions).toBeDefined();
      expect(Array.isArray(result.suggestedActions)).toBe(true);
      expect(result.suggestedActions.length).toBeGreaterThan(0);

      logger.info('Combat action test completed successfully');
    }, 45000); // Longer timeout for AI processing

    it('should process an exploration action successfully', async () => {
      if (!aiService.isInitialized()) {
        console.warn('Skipping test - AI service not initialized');
        return;
      }

      const playerAction = 'I examine the ancient stone pillar for any inscriptions or clues about this place';

      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        playerAction
      );

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.narrative).toBeDefined();
      expect(result.gameState).toBeDefined();
      expect(result.suggestedActions).toBeDefined();

      // Exploration actions typically don't require dice rolls
      if (result.diceResults) {
        expect(typeof result.diceResults.total).toBe('number');
        expect(typeof result.diceResults.success).toBe('boolean');
      }

      logger.info('Exploration action test completed successfully');
    }, 45000);

    it('should process a social action successfully', async () => {
      if (!aiService.isInitialized()) {
        console.warn('Skipping test - AI service not initialized');
        return;
      }

      const playerAction = 'I call out in a friendly voice: "Hello? Is anyone there? I mean no harm and seek only passage through these woods."';

      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        playerAction
      );

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.narrative).toBeDefined();
      expect(result.gameState).toBeDefined();
      expect(result.suggestedActions).toBeDefined();

      // Social actions should provide meaningful narrative
      expect(result.narrative.length).toBeGreaterThan(50);

      logger.info('Social action test completed successfully');
    }, 45000);
  });

  describe('State Management', () => {
    it('should update game state properly after actions', async () => {
      if (!aiService.isInitialized()) {
        console.warn('Skipping test - AI service not initialized');
        return;
      }

      const initialCampaign = await campaignService.getCampaign(testCampaignId);
      const initialStatusCount = initialCampaign?.settings.opening.initialStatusTags.length || 0;

      const playerAction = 'I light my torch to illuminate the dark forest path ahead';

      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        playerAction
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Game state should reflect the action
      expect(result.gameState).toBeDefined();
      expect(result.gameState.currentScene).toBeDefined();
      
      // Player status may have changed (lighting torch might add 'illuminated' or similar)
      expect(Array.isArray(result.gameState.playerStatus)).toBe(true);

      logger.info('State management test completed successfully');
    }, 45000);

    it('should store action results in database', async () => {
      if (!aiService.isInitialized()) {
        console.warn('Skipping test - AI service not initialized');
        return;
      }

      const playerAction = 'I search the ground for useful items or clues';

      // Get message count before action
      const messagesBefore = await prisma.aIMessage.count({
        where: { conversationId: testCampaignId }
      });

      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        playerAction
      );

      expect(result).toBeDefined();

      // Check that messages were stored
      const messagesAfter = await prisma.aIMessage.count({
        where: { conversationId: testCampaignId }
      });

      expect(messagesAfter).toBeGreaterThan(messagesBefore);
      expect(messagesAfter - messagesBefore).toBeGreaterThanOrEqual(2); // Player message + AI response

      logger.info('Database storage test completed successfully');
    }, 45000);
  });

  describe('RAG System Integration', () => {
    it('should use campaign knowledge in responses', async () => {
      if (!aiService.isInitialized()) {
        console.warn('Skipping test - AI service not initialized');
        return;
      }

      // Perform multiple actions to build up knowledge
      await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        'I discover a mysterious glowing crystal embedded in a tree trunk'
      );

      // Wait a moment for knowledge to be indexed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reference the crystal in a follow-up action
      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        'I examine the glowing crystal I found earlier'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.narrative).toBeDefined();

      // The response should reference the crystal from previous context
      expect(result.narrative.toLowerCase()).toMatch(/crystal|glow/);

      logger.info('RAG integration test completed successfully');
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle empty actions gracefully', async () => {
      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        ''
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.narrative).toBeDefined();
      expect(result.gameState).toBeDefined();

      logger.info('Empty action handling test completed successfully');
    });

    it('should handle invalid campaign ID gracefully', async () => {
      await expect(campaignService.processPlayerAction(
        'invalid-campaign-id',
        testPlayerId,
        'I try to do something'
      )).rejects.toThrow('Campaign not found');

      logger.info('Invalid campaign ID handling test completed successfully');
    });
  });

  describe('Performance', () => {
    it('should complete action processing within reasonable time', async () => {
      if (!aiService.isInitialized()) {
        console.warn('Skipping test - AI service not initialized');
        return;
      }

      const startTime = Date.now();

      const result = await campaignService.processPlayerAction(
        testCampaignId,
        testPlayerId,
        'I take a step forward on the forest path'
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(45000); // Should complete within 45 seconds

      logger.info(`Action processing completed in ${processingTime}ms`);
    }, 50000);
  });
});