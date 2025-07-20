import { PrismaClient } from '@prisma/client';

// Skip this test file if CI is not set (local development)
const testCondition = process.env.CI || process.env.DATABASE_URL?.includes('test.db');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./test.db'
    }
  }
});

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Clean up test data if it exists
    await prisma.gameSession.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GameSession Management', () => {
    it('should create a game session', async () => {
      const session = await prisma.gameSession.create({
        data: {
          name: 'Test Campaign',
          description: 'A test campaign for integration testing',
          status: 'ACTIVE',
          systemType: 'freeform',
          maxPlayers: 6,
          currentTurn: 0,
          aiSettings: JSON.stringify({ model: 'gpt-4' }),
          metadata: JSON.stringify({ theme: 'fantasy' })
        }
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.name).toBe('Test Campaign');
      expect(session.status).toBe('ACTIVE');
    });

    it('should update game session', async () => {
      const session = await prisma.gameSession.create({
        data: {
          name: 'Update Test Campaign',
          status: 'ACTIVE'
        }
      });

      const updated = await prisma.gameSession.update({
        where: { id: session.id },
        data: {
          status: 'PAUSED',
          currentTurn: 5
        }
      });

      expect(updated.status).toBe('PAUSED');
      expect(updated.currentTurn).toBe(5);
    });

    it('should find active sessions', async () => {
      await prisma.gameSession.create({
        data: {
          name: 'Active Campaign 1',
          status: 'ACTIVE'
        }
      });

      await prisma.gameSession.create({
        data: {
          name: 'Completed Campaign',
          status: 'COMPLETED'
        }
      });

      const activeSessions = await prisma.gameSession.findMany({
        where: { status: 'ACTIVE' }
      });

      expect(activeSessions.length).toBeGreaterThan(0);
      expect(activeSessions.every(s => s.status === 'ACTIVE')).toBe(true);
    });

    it('should handle JSON fields correctly', async () => {
      const aiSettings = {
        model: 'gpt-4',
        temperature: 0.8,
        personality: 'friendly'
      };

      const metadata = {
        theme: 'sci-fi',
        difficulty: 'medium',
        customRules: ['rule1', 'rule2']
      };

      const session = await prisma.gameSession.create({
        data: {
          name: 'JSON Test Campaign',
          aiSettings: JSON.stringify(aiSettings),
          metadata: JSON.stringify(metadata)
        }
      });

      // Parse JSON fields
      const parsedAiSettings = JSON.parse(session.aiSettings);
      const parsedMetadata = JSON.parse(session.metadata);

      expect(parsedAiSettings.model).toBe('gpt-4');
      expect(parsedAiSettings.temperature).toBe(0.8);
      expect(parsedMetadata.theme).toBe('sci-fi');
      expect(parsedMetadata.customRules).toHaveLength(2);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce required fields', async () => {
      await expect(
        prisma.gameSession.create({
          data: {
            // Missing required 'name' field
            status: 'ACTIVE'
          } as any
        })
      ).rejects.toThrow();
    });

    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        prisma.gameSession.create({
          data: {
            name: `Concurrent Campaign ${i}`,
            status: 'ACTIVE'
          }
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      expect(new Set(results.map(r => r.id)).size).toBe(5); // All unique IDs
    });
  });
});