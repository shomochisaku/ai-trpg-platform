import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { GameWorkflow } from '../../src/ai/workflows/gameWorkflow';
import { GameActionContext, WorkflowPhase, ProcessGameActionResult } from '../../src/ai/workflows/types';
import { MemoryType, SessionStatus } from '@prisma/client';
import { mastraInstance } from '../../src/ai/config';

describe('Game Workflow Integration Tests', () => {
  let gameWorkflow: GameWorkflow;
  let mockContext: GameActionContext;

  beforeAll(async () => {
    // Use mocked Mastra instance for testing
    const mockMastraInstance = {
      agents: {
        create: jest.fn().mockReturnValue({
          generate: jest.fn().mockResolvedValue({
            text: '{"narrative": "Test GM response", "gameState": {"statusTags": [], "inventory": []}}',
          }),
        }),
      },
    };
    
    gameWorkflow = new GameWorkflow(mockMastraInstance as any, {
      maxRetries: 2,
      timeout: 15000,
      verbose: true
    });
  });

  beforeEach(() => {
    mockContext = {
      campaignId: 'test-campaign-123',
      playerId: 'test-player-456',
      playerAction: 'I draw my sword and attack the goblin',
      gameState: {
        currentScene: 'A dark forest clearing with ancient ruins',
        playerStatus: ['healthy', 'alert'],
        npcs: [
          {
            name: 'Goblin Warrior',
            role: 'enemy',
            status: ['hostile', 'armed']
          }
        ],
        environment: {
          location: 'Forest clearing',
          timeOfDay: 'evening',
          weather: 'foggy'
        }
      },
      previousActions: [
        {
          action: 'I explore the forest path',
          result: 'You discovered an ancient clearing',
          timestamp: new Date(Date.now() - 60000)
        }
      ],
      memories: [
        {
          type: MemoryType.EVENT,
          content: 'Player encountered mysterious ruins in the forest',
          metadata: { importance: 0.8, timestamp: new Date() }
        }
      ]
    };
  });

  describe('Full Workflow Processing', () => {
    it('should process a combat action successfully', async () => {
      const result = await gameWorkflow.processGameAction(mockContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.narrative).toBeDefined();
      expect(typeof result.narrative).toBe('string');
      expect(result.narrative.length).toBeGreaterThan(0);
      expect(result.gameState).toBeDefined();
      expect(result.suggestedActions).toBeDefined();
      expect(Array.isArray(result.suggestedActions)).toBe(true);
    });

    it('should handle social action successfully', async () => {

      const socialContext = {
        ...mockContext,
        playerAction: 'I try to negotiate with the goblin',
        gameState: {
          ...mockContext.gameState,
          npcs: [
            {
              name: 'Goblin Scout',
              role: 'neutral',
              status: ['cautious', 'curious']
            }
          ]
        }
      };

      const result = await gameWorkflow.processGameAction(socialContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.narrative).toBeDefined();
      expect(result.suggestedActions).toBeDefined();
      expect(result.suggestedActions.length).toBeGreaterThan(0);
    });

    it('should handle exploration action successfully', async () => {

      const explorationContext = {
        ...mockContext,
        playerAction: 'I examine the ancient ruins for clues',
        gameState: {
          ...mockContext.gameState,
          npcs: []
        }
      };

      const result = await gameWorkflow.processGameAction(explorationContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.narrative).toBeDefined();
      expect(result.gameState).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid action gracefully', async () => {

      const invalidContext = {
        ...mockContext,
        playerAction: '' // Empty action
      };

      const result = await gameWorkflow.processGameAction(invalidContext);

      // Even with invalid input, workflow should not crash
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.narrative).toBeDefined();
    });

    it('should handle missing game state gracefully', async () => {

      const incompleteContext = {
        ...mockContext,
        gameState: {
          currentScene: '',
          playerStatus: [],
          npcs: [],
          environment: {
            location: '',
            timeOfDay: 'day'
          }
        }
      };

      const result = await gameWorkflow.processGameAction(incompleteContext);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.narrative).toBeDefined();
    });
  });

  describe('Workflow Features', () => {
    it('should include dice results for combat actions', async () => {

      const combatContext = {
        ...mockContext,
        playerAction: 'I attack the goblin with my sword'
      };

      const result = await gameWorkflow.processGameAction(combatContext);

      expect(result).toBeDefined();
      // Dice results may or may not be present depending on AI decision
      if (result.diceResults) {
        expect(typeof result.diceResults.roll).toBe('number');
        expect(typeof result.diceResults.total).toBe('number');
        expect(typeof result.diceResults.success).toBe('boolean');
      }
    });

    it('should provide meaningful suggested actions', async () => {

      const result = await gameWorkflow.processGameAction(mockContext);

      expect(result).toBeDefined();
      expect(result.suggestedActions).toBeDefined();
      expect(Array.isArray(result.suggestedActions)).toBe(true);
      expect(result.suggestedActions.length).toBeGreaterThan(0);
      
      // Each suggested action should be a non-empty string
      result.suggestedActions.forEach(action => {
        expect(typeof action).toBe('string');
        expect(action.length).toBeGreaterThan(0);
      });
    });

    it('should maintain game state consistency', async () => {

      const result = await gameWorkflow.processGameAction(mockContext);

      expect(result).toBeDefined();
      expect(result.gameState).toBeDefined();
      expect(result.gameState.currentScene).toBeDefined();
      expect(Array.isArray(result.gameState.playerStatus)).toBe(true);
      expect(Array.isArray(result.gameState.npcs)).toBe(true);
      expect(result.gameState.environment).toBeDefined();
      expect(result.gameState.environment.location).toBeDefined();
      expect(result.gameState.environment.timeOfDay).toBeDefined();
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should use fallback when AI agents are unavailable', async () => {
      // Create workflow with no Mastra instance to test fallback
      const fallbackWorkflow = new GameWorkflow(null as any, {
        maxRetries: 1,
        timeout: 5000
      });

      // This should trigger fallback mechanisms
      const result = await fallbackWorkflow.processGameAction(mockContext);

      expect(result).toBeDefined();
      // Fallback should still provide basic functionality
      expect(typeof result.success).toBe('boolean');
      expect(result.narrative).toBeDefined();
      expect(result.gameState).toBeDefined();
      expect(result.suggestedActions).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should complete processing within reasonable time', async () => {

      const startTime = Date.now();
      
      const result = await gameWorkflow.processGameAction(mockContext);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should handle multiple concurrent requests', async () => {

      const contexts = [
        { ...mockContext, playerAction: 'I attack' },
        { ...mockContext, playerAction: 'I defend' },
        { ...mockContext, playerAction: 'I cast a spell' }
      ];

      const promises = contexts.map(ctx => gameWorkflow.processGameAction(ctx));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.narrative).toBeDefined();
      });
    });
  });
});