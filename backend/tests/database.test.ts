import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Clean up test data if it exists
    await prisma.gameMessage.deleteMany({});
    await prisma.diceRoll.deleteMany({});
    await prisma.gameEvent.deleteMany({});
    await prisma.storyElement.deleteMany({});
    await prisma.aIMessage.deleteMany({});
    await prisma.aIConversation.deleteMany({});
    await prisma.memoryEntry.deleteMany({});
    await prisma.inventoryItem.deleteMany({});
    await prisma.statusEffect.deleteMany({});
    await prisma.character.deleteMany({});
    await prisma.sessionPlayer.deleteMany({});
    await prisma.gameSession.deleteMany({});
    await prisma.userPreferences.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.systemSetting.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('User Management', () => {
    it('should create a user with preferences', async () => {
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          password: hashedPassword,
          displayName: 'Test User',
          bio: 'A test user for integration testing',
          preferences: {
            create: {
              preferredAIModel: 'gpt-4',
              aiPersonality: 'balanced',
              theme: 'dark',
              fontSize: 'medium',
              notificationsOn: true,
              autoSaveInterval: 30,
              maxMessageHistory: 1000,
            }
          }
        },
        include: {
          preferences: true,
        }
      });

      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe('testuser');
      expect(user.displayName).toBe('Test User');
      expect(user.preferences).toBeDefined();
      expect(user.preferences?.preferredAIModel).toBe('gpt-4');
      expect(user.preferences?.theme).toBe('dark');
    });

    it('should find user by email', async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
        include: { preferences: true }
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
      expect(user?.preferences).toBeDefined();
    });
  });

  describe('Game Session Management', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' }
      });
      userId = user!.id;
    });

    it('should create a game session with players', async () => {
      const gameSession = await prisma.gameSession.create({
        data: {
          name: 'Test Campaign',
          description: 'A test campaign for integration testing',
          createdBy: userId,
          systemType: 'freeform',
          maxPlayers: 4,
          genre: 'Fantasy',
          setting: 'Test setting',
          storyGoal: 'Test the database integration',
          aiGMEnabled: true,
          aiModel: 'gpt-4',
          aiPersonality: 'balanced',
          players: {
            create: [
              {
                userId: userId,
                role: 'GM',
                isActive: true,
              }
            ]
          }
        },
        include: {
          players: true,
          creator: true,
        }
      });

      expect(gameSession.name).toBe('Test Campaign');
      expect(gameSession.createdBy).toBe(userId);
      expect(gameSession.players).toHaveLength(1);
      expect(gameSession.players[0].role).toBe('GM');
      expect(gameSession.creator.email).toBe('test@example.com');
    });
  });

  describe('Character Management', () => {
    let userId: string;
    let sessionId: string;

    beforeEach(async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' }
      });
      userId = user!.id;

      const session = await prisma.gameSession.findFirst({
        where: { createdBy: userId }
      });
      sessionId = session!.id;
    });

    it('should create a character with inventory and status effects', async () => {
      const character = await prisma.character.create({
        data: {
          name: 'Test Hero',
          description: 'A brave test character',
          ownerId: userId,
          sessionId: sessionId,
          race: 'Human',
          class: 'Fighter',
          level: 1,
          experience: 0,
          strength: 16,
          dexterity: 14,
          constitution: 15,
          intelligence: 12,
          wisdom: 13,
          charisma: 11,
          hitPoints: 15,
          maxHitPoints: 15,
          armorClass: 16,
          background: 'Soldier',
          personality: 'Brave and determined',
          inventory: {
            create: [
              {
                name: 'Iron Sword',
                description: 'A sturdy iron sword',
                quantity: 1,
                weight: 3,
                value: 15,
                itemType: 'WEAPON',
                rarity: 'COMMON',
                isEquipped: true,
                bonuses: {
                  attack: 1,
                  damage: 4
                }
              },
              {
                name: 'Health Potion',
                description: 'Restores health when consumed',
                quantity: 2,
                weight: 0.5,
                value: 25,
                itemType: 'CONSUMABLE',
                rarity: 'COMMON',
              }
            ]
          },
          statusEffects: {
            create: [
              {
                name: 'Blessed',
                description: 'Blessed by the gods',
                duration: 10,
                effectType: 'BUFF',
                modifiers: {
                  allSaves: 1
                }
              }
            ]
          }
        },
        include: {
          inventory: true,
          statusEffects: true,
          owner: true,
          session: true,
        }
      });

      expect(character.name).toBe('Test Hero');
      expect(character.race).toBe('Human');
      expect(character.class).toBe('Fighter');
      expect(character.inventory).toHaveLength(2);
      expect(character.statusEffects).toHaveLength(1);
      expect(character.inventory[0].name).toBe('Iron Sword');
      expect(character.statusEffects[0].name).toBe('Blessed');
    });
  });

  describe('AI Integration', () => {
    let userId: string;
    let sessionId: string;

    beforeEach(async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' }
      });
      userId = user!.id;

      const session = await prisma.gameSession.findFirst({
        where: { createdBy: userId }
      });
      sessionId = session!.id;
    });

    it('should create AI conversation with messages', async () => {
      const conversation = await prisma.aIConversation.create({
        data: {
          title: 'Test AI Conversation',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
          userId: userId,
          sessionId: sessionId,
          context: 'Test context for AI conversation',
          messages: {
            create: [
              {
                content: 'Hello, AI assistant!',
                role: 'USER',
                tokenCount: 10,
              },
              {
                content: 'Hello! How can I help you with your TRPG session?',
                role: 'ASSISTANT',
                tokenCount: 15,
                responseTime: 1000,
              }
            ]
          }
        },
        include: {
          messages: true,
          user: true,
          session: true,
        }
      });

      expect(conversation.title).toBe('Test AI Conversation');
      expect(conversation.model).toBe('gpt-4');
      expect(conversation.messages).toHaveLength(2);
      expect(conversation.messages[0].role).toBe('USER');
      expect(conversation.messages[1].role).toBe('ASSISTANT');
      expect(conversation.user?.email).toBe('test@example.com');
    });

    it('should create memory entries with tags', async () => {
      const memoryEntry = await prisma.memoryEntry.create({
        data: {
          content: 'The character discovered a hidden passage in the ancient ruins.',
          category: 'EVENT',
          importance: 7,
          userId: userId,
          sessionId: sessionId,
          tags: ['discovery', 'ruins', 'hidden-passage'],
          isActive: true,
        },
        include: {
          user: true,
        }
      });

      expect(memoryEntry.content).toContain('hidden passage');
      expect(memoryEntry.category).toBe('EVENT');
      expect(memoryEntry.importance).toBe(7);
      expect(memoryEntry.tags).toContain('discovery');
      expect(memoryEntry.tags).toContain('ruins');
      expect(memoryEntry.tags).toContain('hidden-passage');
    });
  });

  describe('Story Management', () => {
    let sessionId: string;

    beforeEach(async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' }
      });
      const session = await prisma.gameSession.findFirst({
        where: { createdBy: user!.id }
      });
      sessionId = session!.id;
    });

    it('should create hierarchical story elements', async () => {
      const chapter = await prisma.storyElement.create({
        data: {
          title: 'Chapter 1: The Beginning',
          content: 'The first chapter of our test story',
          type: 'CHAPTER',
          sessionId: sessionId,
          priority: 10,
          tags: ['chapter', 'beginning'],
          orderIndex: 1,
        }
      });

      const scene = await prisma.storyElement.create({
        data: {
          title: 'Scene 1: The Tavern',
          content: 'A scene in a tavern',
          type: 'SCENE',
          sessionId: sessionId,
          parentId: chapter.id,
          priority: 5,
          tags: ['scene', 'tavern'],
          orderIndex: 1,
        },
        include: {
          parent: true,
          children: true,
        }
      });

      expect(scene.title).toBe('Scene 1: The Tavern');
      expect(scene.type).toBe('SCENE');
      expect(scene.parent?.title).toBe('Chapter 1: The Beginning');
      expect(scene.parentId).toBe(chapter.id);
    });

    it('should create game events with metadata', async () => {
      const event = await prisma.gameEvent.create({
        data: {
          title: 'Combat Started',
          description: 'A battle with goblins has begun',
          eventType: 'COMBAT',
          sessionId: sessionId,
          metadata: {
            enemies: ['goblin', 'goblin', 'goblin-shaman'],
            location: 'forest-clearing',
            initiative: [
              { name: 'Test Hero', initiative: 18 },
              { name: 'Goblin 1', initiative: 14 },
              { name: 'Goblin 2', initiative: 12 },
              { name: 'Goblin Shaman', initiative: 10 }
            ]
          }
        }
      });

      expect(event.title).toBe('Combat Started');
      expect(event.eventType).toBe('COMBAT');
      expect(event.metadata).toBeDefined();
      expect((event.metadata as any).enemies).toHaveLength(3);
      expect((event.metadata as any).location).toBe('forest-clearing');
    });
  });

  describe('System Settings', () => {
    it('should create and retrieve system settings', async () => {
      const setting = await prisma.systemSetting.create({
        data: {
          key: 'test_setting',
          value: 'test_value',
          description: 'A test system setting',
          category: 'test',
        }
      });

      expect(setting.key).toBe('test_setting');
      expect(setting.value).toBe('test_value');
      expect(setting.category).toBe('test');

      const retrieved = await prisma.systemSetting.findUnique({
        where: { key: 'test_setting' }
      });

      expect(retrieved?.value).toBe('test_value');
    });
  });
});