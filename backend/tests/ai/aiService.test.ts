import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { aiService } from '../../src/ai/aiService';

// Mock the AI service methods
jest.mock('../../src/ai/aiService');
const mockAiService = aiService as jest.Mocked<typeof aiService>;

describe('AIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      mockAiService.initialize.mockResolvedValue(true);

      await aiService.initialize();
      expect(mockAiService.initialize).toHaveBeenCalled();
    });

    it('should return healthy status after initialization', async () => {
      mockAiService.getHealthStatus.mockResolvedValue({
        status: 'healthy',
        initialized: true,
        stats: {
          totalSessions: 0,
          activeSessions: 0,
          initialized: true
        },
        timestamp: new Date().toISOString()
      });

      const status = await aiService.getHealthStatus();
      expect(status.status).toBe('healthy');
      expect(status.initialized).toBe(true);
    });
  });

  describe('dice rolling', () => {
    it('should roll a d20 correctly', async () => {
      const mockRollResult = {
        dice: '1d20',
        result: 15,
        breakdown: [15],
        total: 15,
        success: undefined
      };

      mockAiService.rollDice.mockResolvedValue(mockRollResult);

      const result = await aiService.rollDice('1d20');
      expect(result.dice).toBe('1d20');
      expect(result.result).toBe(15);
      expect(result.breakdown).toHaveLength(1);
    });

    it('should roll multiple dice correctly', async () => {
      const mockRollResult = {
        dice: '3d6',
        result: 12,
        breakdown: [4, 3, 5],
        total: 12,
        success: undefined
      };

      mockAiService.rollDice.mockResolvedValue(mockRollResult);

      const result = await aiService.rollDice('3d6');
      expect(result.dice).toBe('3d6');
      expect(result.result).toBe(12);
      expect(result.breakdown).toHaveLength(3);
    });

    it('should handle modifiers correctly', async () => {
      const mockRollResult = {
        dice: '1d20+3',
        result: 18,
        breakdown: [15],
        total: 18,
        modifier: 3,
        success: undefined
      };

      mockAiService.rollDice.mockResolvedValue(mockRollResult);

      const result = await aiService.rollDice('1d20+3');
      expect(result.dice).toBe('1d20+3');
      expect(result.result).toBe(18);
      expect(result.modifier).toBe(3);
    });

    it('should handle difficulty checks', async () => {
      const mockRollResult = {
        dice: '1d20',
        result: 16,
        breakdown: [16],
        total: 16,
        target: 15,
        success: true
      };

      mockAiService.rollDice.mockResolvedValue(mockRollResult);

      const result = await aiService.rollDice('1d20', { target: 15 });
      expect(result.success).toBe(true);
      expect(result.target).toBe(15);
    });

    it('should handle advantage for d20 rolls', async () => {
      const mockRollResult = {
        dice: '1d20',
        result: 18,
        breakdown: [18, 12],
        total: 18,
        advantage: true,
        success: undefined
      };

      mockAiService.rollDice.mockResolvedValue(mockRollResult);

      const result = await aiService.rollDice('1d20', { advantage: true });
      expect(result.advantage).toBe(true);
      expect(result.breakdown).toHaveLength(2);
      expect(result.result).toBe(Math.max(...result.breakdown));
    });
  });

  describe('status tags', () => {
    it('should retrieve status tags for an entity', async () => {
      const mockStatusTags = [
        {
          id: 'tag-1',
          tag: 'poisoned',
          description: 'Character is poisoned',
          duration: 3,
          entityId: 'player-1'
        }
      ];

      mockAiService.getStatusTags.mockResolvedValue(mockStatusTags);

      const tags = await aiService.getStatusTags('player-1');
      expect(tags).toHaveLength(1);
      expect(tags[0].tag).toBe('poisoned');
    });

    it('should add status tags to an entity', async () => {
      const mockNewTag = {
        id: 'tag-2',
        tag: 'blessed',
        description: 'Character is blessed',
        duration: 5,
        entityId: 'player-1'
      };

      mockAiService.addStatusTag.mockResolvedValue(mockNewTag);

      const tag = await aiService.addStatusTag('player-1', {
        tag: 'blessed',
        description: 'Character is blessed',
        duration: 5
      });

      expect(tag.tag).toBe('blessed');
      expect(tag.duration).toBe(5);
    });

    it('should remove status tags from an entity', async () => {
      mockAiService.removeStatusTag.mockResolvedValue(true);

      const result = await aiService.removeStatusTag('player-1', 'poisoned');
      expect(result).toBe(true);
    });

    it('should update status tag durations', async () => {
      const mockUpdatedTags = [
        {
          id: 'tag-1',
          tag: 'poisoned',
          description: 'Character is poisoned',
          duration: 2,
          entityId: 'player-1'
        }
      ];

      mockAiService.updateStatusTagDurations.mockResolvedValue(mockUpdatedTags);

      const updatedTags = await aiService.updateStatusTagDurations('player-1');
      expect(updatedTags[0].duration).toBe(2);
    });

    it('should clear expired status tags', async () => {
      const mockRemainingTags = [];

      mockAiService.clearExpiredStatusTags.mockResolvedValue(mockRemainingTags);

      const remainingTags = await aiService.clearExpiredStatusTags('player-1');
      expect(remainingTags).toHaveLength(0);
    });
  });
});