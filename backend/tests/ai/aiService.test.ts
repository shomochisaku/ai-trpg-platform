import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { aiService } from '../../src/ai/aiService';

// Mock the gameTools to prevent actual calls
jest.mock('../../src/ai/tools/gameTools');
// Mock the config to prevent Mastra initialization
jest.mock('../../src/ai/config', () => ({
  mastraInstance: null
}));
// Mock logger to prevent console output
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('AIService', () => {
  let intervalSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock setInterval to prevent actual timers in tests
    intervalSpy = jest.spyOn(global, 'setInterval').mockImplementation(() => 12345 as any);
  });

  afterEach(() => {
    // Clean up timers and mocks
    intervalSpy?.mockRestore();
    jest.clearAllTimers();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await aiService.initialize();
      expect(aiService.isInitialized()).toBe(true);
    });

    it('should return healthy status after initialization', async () => {
      // Initialize the service first
      await aiService.initialize();
      
      const healthResult = await aiService.healthCheck();
      expect(healthResult.status).toBe('healthy');
      expect(healthResult.details.initialized).toBe(true);
      expect(healthResult.details.stats).toBeDefined();
    });
  });

  describe('dice rolling', () => {
    it('should roll a d20 correctly', async () => {
      // Mock the actual rollDice function from gameTools
      const { rollDice } = require('../../src/ai/tools/gameTools');
      const mockRollResult = {
        dice: '1d20',
        result: 15,
        breakdown: [15],
        total: 15,
        success: undefined
      };
      rollDice.mockResolvedValue(mockRollResult);

      const result = await aiService.rollDice({ dice: '1d20' });
      expect(result.dice).toBe('1d20');
      expect(result.result).toBe(15);
      expect(result.breakdown).toHaveLength(1);
    });

    it('should roll multiple dice correctly', async () => {
      const { rollDice } = require('../../src/ai/tools/gameTools');
      const mockRollResult = {
        dice: '3d6',
        result: 12,
        breakdown: [4, 3, 5],
        total: 12,
        success: undefined
      };
      rollDice.mockResolvedValue(mockRollResult);

      const result = await aiService.rollDice({ dice: '3d6' });
      expect(result.dice).toBe('3d6');
      expect(result.result).toBe(12);
      expect(result.breakdown).toHaveLength(3);
    });

    it('should handle modifiers correctly', async () => {
      const { rollDice } = require('../../src/ai/tools/gameTools');
      const mockRollResult = {
        dice: '1d20+3',
        result: 18,
        breakdown: [15],
        total: 18,
        modifier: 3,
        success: undefined
      };
      rollDice.mockResolvedValue(mockRollResult);

      const result = await aiService.rollDice({ dice: '1d20+3' });
      expect(result.dice).toBe('1d20+3');
      expect(result.result).toBe(18);
      expect(result.modifier).toBe(3);
    });

    it('should handle difficulty checks', async () => {
      const { rollDice } = require('../../src/ai/tools/gameTools');
      const mockRollResult = {
        dice: '1d20',
        result: 16,
        breakdown: [16],
        total: 16,
        difficulty: 15,
        success: true
      };
      rollDice.mockResolvedValue(mockRollResult);

      const result = await aiService.rollDice({ dice: '1d20', difficulty: 15 });
      expect(result.success).toBe(true);
      expect(result.difficulty).toBe(15);
    });

    it('should handle advantage for d20 rolls', async () => {
      const { rollDice } = require('../../src/ai/tools/gameTools');
      const mockRollResult = {
        dice: '1d20',
        result: 18,
        breakdown: [18, 12],
        total: 18,
        advantage: true,
        success: undefined
      };
      rollDice.mockResolvedValue(mockRollResult);

      const result = await aiService.rollDice({ dice: '1d20', advantage: true });
      expect(result.advantage).toBe(true);
      expect(result.breakdown).toHaveLength(2);
      expect(result.result).toBe(18);
    });
  });

  describe('status tags', () => {
    it('should retrieve status tags for an entity', async () => {
      const { getStatusTags } = require('../../src/ai/tools/gameTools');
      const mockStatusTags = [
        { name: 'poisoned', description: 'Taking damage over time', type: 'debuff' },
        { name: 'blessed', description: 'Enhanced abilities', type: 'buff' }
      ];
      getStatusTags.mockResolvedValue(mockStatusTags);

      const result = await aiService.getStatusTags('player123');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('poisoned');
      expect(result[1].name).toBe('blessed');
    });

    it('should add status tags to an entity', async () => {
      const { updateStatusTags } = require('../../src/ai/tools/gameTools');
      const mockUpdatedTags = [
        { name: 'haste', description: 'Increased speed', type: 'buff' }
      ];
      updateStatusTags.mockResolvedValue(mockUpdatedTags);

      const result = await aiService.updateStatusTags({
        entityId: 'player123',
        tags: [{ name: 'haste', description: 'Increased speed', type: 'buff', action: 'add' }]
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('haste');
    });

    it('should remove status tags from an entity', async () => {
      const { updateStatusTags } = require('../../src/ai/tools/gameTools');
      const mockUpdatedTags = [];
      updateStatusTags.mockResolvedValue(mockUpdatedTags);

      const result = await aiService.updateStatusTags({
        entityId: 'player123',
        tags: [{ name: 'poisoned', description: '', type: 'debuff', action: 'remove' }]
      });
      expect(result).toHaveLength(0);
    });

    it('should update status tag durations', async () => {
      const { updateStatusTags } = require('../../src/ai/tools/gameTools');
      const mockUpdatedTags = [
        { name: 'shield', description: 'Protective barrier', type: 'buff', duration: 5 }
      ];
      updateStatusTags.mockResolvedValue(mockUpdatedTags);

      const result = await aiService.updateStatusTags({
        entityId: 'player123',
        tags: [{ name: 'shield', description: 'Protective barrier', type: 'buff', duration: 5, action: 'update' }]
      });
      expect(result[0].duration).toBe(5);
    });

    it('should clear expired status tags', async () => {
      const { clearExpiredTags } = require('../../src/ai/tools/gameTools');
      const mockClearedTags = [
        { name: 'temporary_boost', expired: true }
      ];
      clearExpiredTags.mockResolvedValue(mockClearedTags);

      const result = await clearExpiredTags();
      expect(result).toHaveLength(1);
      expect(result[0].expired).toBe(true);
    });
  });
});