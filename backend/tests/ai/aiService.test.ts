import { AIService } from '../../src/ai/aiService';
import { rollDice } from '../../src/ai/tools/gameTools';

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await aiService.initialize();
      expect(aiService.isInitialized()).toBe(true);
    });

    it('should return healthy status after initialization', async () => {
      await aiService.initialize();
      const health = await aiService.healthCheck();
      expect(health.status).toBe('healthy');
    });
  });

  describe('dice rolling', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should roll a d20 correctly', async () => {
      const result = await aiService.rollDice({ dice: '1d20' });
      
      expect(result).toBeDefined();
      expect(result.rolls).toHaveLength(1);
      expect(result.rolls[0]).toBeGreaterThanOrEqual(1);
      expect(result.rolls[0]).toBeLessThanOrEqual(20);
      expect(result.total).toBe(result.rolls[0]);
      expect(result.finalTotal).toBe(result.total + result.modifier);
    });

    it('should roll multiple dice correctly', async () => {
      const result = await aiService.rollDice({ dice: '3d6' });
      
      expect(result).toBeDefined();
      expect(result.rolls).toHaveLength(3);
      expect(result.total).toBe(result.rolls.reduce((sum, roll) => sum + roll, 0));
      
      result.rolls.forEach(roll => {
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(6);
      });
    });

    it('should handle modifiers correctly', async () => {
      const result = await aiService.rollDice({ dice: '1d20+5' });
      
      expect(result).toBeDefined();
      expect(result.modifier).toBe(5);
      expect(result.finalTotal).toBe(result.total + 5);
    });

    it('should handle difficulty checks', async () => {
      const result = await aiService.rollDice({ 
        dice: '1d20+5', 
        difficulty: 15 
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.success).toBe(result.finalTotal >= 15);
    });

    it('should handle advantage for d20 rolls', async () => {
      const result = await aiService.rollDice({ 
        dice: '1d20', 
        advantage: true 
      });
      
      expect(result).toBeDefined();
      expect(result.rolls).toHaveLength(1); // Should keep only the highest roll
    });
  });

  describe('status tags', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should add status tags correctly', async () => {
      const tags = await aiService.updateStatusTags({
        entityId: 'player-1',
        tags: [{
          name: 'Blessed',
          description: 'Blessed by the gods',
          type: 'buff',
          action: 'add',
          value: 2,
          duration: 300,
        }],
      });
      
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe('Blessed');
      expect(tags[0].type).toBe('buff');
      expect(tags[0].value).toBe(2);
    });

    it('should retrieve status tags for an entity', async () => {
      // Add tags first
      await aiService.updateStatusTags({
        entityId: 'player-1',
        tags: [{
          name: 'Poisoned',
          description: 'Suffering from poison',
          type: 'debuff',
          action: 'add',
        }],
      });

      const tags = await aiService.getStatusTags('player-1');
      
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe('Poisoned');
      expect(tags[0].type).toBe('debuff');
    });

    it('should remove status tags correctly', async () => {
      // Add a tag first
      await aiService.updateStatusTags({
        entityId: 'player-1',
        tags: [{
          name: 'Temp Tag',
          description: 'Temporary tag',
          type: 'condition',
          action: 'add',
        }],
      });

      // Remove the tag
      await aiService.updateStatusTags({
        entityId: 'player-1',
        tags: [{
          name: 'Temp Tag',
          description: 'Temporary tag',
          type: 'condition',
          action: 'remove',
        }],
      });

      const tags = await aiService.getStatusTags('player-1');
      expect(tags).toHaveLength(0);
    });
  });

  describe('knowledge storage', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should store knowledge correctly', async () => {
      const entry = await aiService.storeKnowledge({
        category: 'test',
        title: 'Test Knowledge',
        content: 'This is a test knowledge entry',
        tags: ['test', 'knowledge'],
        relevance: 0.8,
      });
      
      expect(entry).toBeDefined();
      expect(entry.category).toBe('test');
      expect(entry.title).toBe('Test Knowledge');
      expect(entry.content).toBe('This is a test knowledge entry');
      expect(entry.tags).toContain('test');
      expect(entry.tags).toContain('knowledge');
      expect(entry.relevance).toBe(0.8);
    });

    it('should retrieve knowledge by category', async () => {
      // Store test knowledge
      await aiService.storeKnowledge({
        category: 'world',
        title: 'City of Waterdeep',
        content: 'A major city in the Sword Coast',
        tags: ['city', 'location'],
      });

      const knowledge = await aiService.getKnowledge({
        category: 'world',
        limit: 10,
      });
      
      expect(knowledge).toHaveLength(1);
      expect(knowledge[0].category).toBe('world');
      expect(knowledge[0].title).toBe('City of Waterdeep');
    });

    it('should retrieve knowledge by tags', async () => {
      // Store test knowledge
      await aiService.storeKnowledge({
        category: 'character',
        title: 'Gandalf',
        content: 'A powerful wizard',
        tags: ['wizard', 'npc', 'powerful'],
      });

      const knowledge = await aiService.getKnowledge({
        tags: ['wizard'],
        limit: 10,
      });
      
      expect(knowledge).toHaveLength(1);
      expect(knowledge[0].title).toBe('Gandalf');
      expect(knowledge[0].tags).toContain('wizard');
    });
  });

  describe('game sessions', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should create game sessions', async () => {
      const sessionId = await aiService.createGameSession('player-1', 'Test Player');
      
      expect(sessionId).toBeDefined();
      expect(sessionId).toContain('session-player-1');
      
      const session = aiService.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.playerId).toBe('player-1');
      expect(session?.gameState.playerName).toBe('Test Player');
    });

    it('should retrieve player sessions', async () => {
      const sessionId1 = await aiService.createGameSession('player-1', 'Test Player');
      const sessionId2 = await aiService.createGameSession('player-1', 'Test Player');
      
      const sessions = aiService.getPlayerSessions('player-1');
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.id)).toContain(sessionId1);
      expect(sessions.map(s => s.id)).toContain(sessionId2);
    });

    it('should delete sessions', async () => {
      const sessionId = await aiService.createGameSession('player-1', 'Test Player');
      
      const deleted = aiService.deleteSession(sessionId);
      expect(deleted).toBe(true);
      
      const session = aiService.getSession(sessionId);
      expect(session).toBeUndefined();
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should return statistics', async () => {
      await aiService.createGameSession('player-1', 'Test Player');
      
      const stats = aiService.getStats();
      expect(stats).toBeDefined();
      expect(stats.initialized).toBe(true);
      expect(stats.totalSessions).toBeGreaterThan(0);
    });
  });
});

describe('Game Tools', () => {
  describe('rollDice', () => {
    it('should throw error for invalid dice notation', async () => {
      await expect(rollDice({ dice: 'invalid' })).rejects.toThrow('Invalid dice notation');
    });

    it('should roll dice without modifiers', async () => {
      const result = await rollDice({ dice: '2d6' });
      
      expect(result.rolls).toHaveLength(2);
      expect(result.modifier).toBe(0);
      expect(result.total).toBe(result.rolls[0] + result.rolls[1]);
      expect(result.finalTotal).toBe(result.total);
    });

    it('should handle negative modifiers', async () => {
      const result = await rollDice({ dice: '1d20-3' });
      
      expect(result.modifier).toBe(-3);
      expect(result.finalTotal).toBe(result.total - 3);
    });

    it('should detect critical success and failure', async () => {
      // Note: This test might be flaky due to randomness
      // In a real scenario, you'd want to mock the random number generator
      const results = [];
      for (let i = 0; i < 100; i++) {
        const result = await rollDice({ dice: '1d20', difficulty: 15 });
        results.push(result);
      }
      
      // Check that we have some variety in rolls
      const hasVariety = results.some(r => r.rolls[0] === 1) || results.some(r => r.rolls[0] === 20);
      expect(hasVariety).toBe(true);
    });
  });
});