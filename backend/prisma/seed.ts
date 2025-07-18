import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      username: 'alice',
      password: hashedPassword,
      displayName: 'Alice the Brave',
      bio: 'Veteran TRPG player who loves fantasy adventures',
      preferences: {
        create: {
          preferredAIModel: 'gpt-4',
          aiPersonality: 'heroic',
          theme: 'dark',
          fontSize: 'medium',
          notificationsOn: true,
          autoSaveInterval: 30,
          maxMessageHistory: 1000,
        }
      }
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      username: 'bob',
      password: hashedPassword,
      displayName: 'Bob the Storyteller',
      bio: 'GM who creates immersive story experiences',
      preferences: {
        create: {
          preferredAIModel: 'claude-3-sonnet',
          aiPersonality: 'dramatic',
          theme: 'light',
          fontSize: 'large',
          notificationsOn: true,
          autoSaveInterval: 60,
          maxMessageHistory: 2000,
        }
      }
    },
  });

  // Create a sample game session
  const gameSession = await prisma.gameSession.create({
    data: {
      name: 'The Lost Kingdom',
      description: 'A classic fantasy adventure in a mysterious lost kingdom',
      createdBy: alice.id,
      systemType: 'd20',
      maxPlayers: 4,
      genre: 'Fantasy',
      setting: 'Medieval fantasy with magic',
      storyGoal: 'Restore the lost kingdom and defeat the dark sorcerer',
      aiGMEnabled: true,
      aiModel: 'gpt-4',
      aiPersonality: 'epic',
      players: {
        create: [
          {
            userId: alice.id,
            role: 'PLAYER',
            isActive: true,
          },
          {
            userId: bob.id,
            role: 'GM',
            isActive: true,
          }
        ]
      }
    },
  });

  // Create sample characters
  const aliceCharacter = await prisma.character.create({
    data: {
      name: 'Lyra Brightblade',
      description: 'A skilled elven warrior with a mysterious past',
      ownerId: alice.id,
      sessionId: gameSession.id,
      race: 'Elf',
      class: 'Fighter',
      level: 3,
      experience: 1250,
      age: 120,
      height: '5\'8"',
      weight: '140 lbs',
      appearance: 'Tall and graceful with silver hair and emerald eyes',
      strength: 16,
      dexterity: 18,
      constitution: 14,
      intelligence: 12,
      wisdom: 15,
      charisma: 13,
      hitPoints: 28,
      maxHitPoints: 28,
      armorClass: 16,
      background: 'Soldier',
      personality: 'Brave and loyal, but struggles with trust',
      ideals: 'Justice and protection of the innocent',
      bonds: 'Seeking to restore honor to her fallen family',
      flaws: 'Quick to anger when her honor is questioned',
      backstory: 'Once a member of the royal guard, now seeking redemption',
      goals: 'Restore the lost kingdom and clear her family name',
      motivations: 'Honor, justice, and protecting her friends',
      inventory: {
        create: [
          {
            name: 'Elven Longsword',
            description: 'A masterwork blade passed down through generations',
            quantity: 1,
            weight: 3,
            value: 500,
            itemType: 'WEAPON',
            rarity: 'UNCOMMON',
            isEquipped: true,
            bonuses: {
              attack: 1,
              damage: 1
            }
          },
          {
            name: 'Studded Leather Armor',
            description: 'Well-crafted armor providing good protection',
            quantity: 1,
            weight: 13,
            value: 45,
            itemType: 'ARMOR',
            rarity: 'COMMON',
            isEquipped: true,
            bonuses: {
              armorClass: 2
            }
          },
          {
            name: 'Healing Potion',
            description: 'A red liquid that restores health when consumed',
            quantity: 3,
            weight: 0.5,
            value: 50,
            itemType: 'CONSUMABLE',
            rarity: 'COMMON',
            bonuses: {
              healing: 8
            }
          }
        ]
      }
    },
  });

  // Create sample story elements
  const prologue = await prisma.storyElement.create({
    data: {
      title: 'The Prologue: A Kingdom in Shadow',
      content: 'Long ago, the Kingdom of Aethermoor was a beacon of light and prosperity. But darkness came, and the kingdom fell into shadow. Now, heroes must rise to restore what was lost.',
      type: 'CHAPTER',
      sessionId: gameSession.id,
      priority: 10,
      tags: ['prologue', 'background', 'kingdom'],
      orderIndex: 1,
    },
  });

  const currentScene = await prisma.storyElement.create({
    data: {
      title: 'The Tavern: Where Adventures Begin',
      content: 'The heroes find themselves in the Silver Stag Tavern, a dimly lit establishment on the edge of the Whispering Woods. Rumors speak of ancient ruins and lost treasures hidden in the depths of the forest.',
      type: 'SCENE',
      sessionId: gameSession.id,
      parentId: prologue.id,
      priority: 5,
      tags: ['tavern', 'meeting', 'rumors'],
      orderIndex: 1,
    },
  });

  // Create sample messages
  await prisma.gameMessage.create({
    data: {
      content: 'Welcome to the Silver Stag Tavern! The fireplace crackles warmly as you enter, and the smell of roasted meat fills the air. A mysterious hooded figure sits in the corner, watching you with interest.',
      type: 'NARRATIVE',
      userId: bob.id,
      sessionId: gameSession.id,
      isNarrative: true,
      aiGenerated: true,
      aiModel: 'gpt-4',
    },
  });

  await prisma.gameMessage.create({
    data: {
      content: 'Lyra approaches the bar, her hand resting casually on her sword hilt. "Barkeep, I\'ll have an ale and whatever information you might have about the old ruins in the Whispering Woods."',
      type: 'PLAYER',
      userId: alice.id,
      sessionId: gameSession.id,
    },
  });

  // Create sample AI conversation
  const aiConversation = await prisma.aIConversation.create({
    data: {
      title: 'GM Planning Session',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 4000,
      userId: bob.id,
      sessionId: gameSession.id,
      context: 'You are a skilled Game Master running a fantasy TRPG session. Help plan engaging encounters and story beats.',
      messages: {
        create: [
          {
            content: 'I need help planning the next encounter in the Whispering Woods. The party is level 3 and consists of one fighter.',
            role: 'USER',
            tokenCount: 25,
          },
          {
            content: 'For a level 3 party with one fighter, consider a balanced encounter in the Whispering Woods. Here are some options:\n\n1. **Corrupted Wildlife**: 2-3 dire wolves affected by dark magic\n2. **Ancient Guardian**: A treant that tests the party\'s intentions\n3. **Bandit Ambush**: 4-5 bandits with a spellcaster leader\n\nI recommend the Ancient Guardian approach - it allows for both combat and roleplay opportunities while advancing the story.',
            role: 'ASSISTANT',
            tokenCount: 95,
            responseTime: 1500,
          }
        ]
      }
    },
  });

  // Create sample memory entries
  await prisma.memoryEntry.create({
    data: {
      content: 'Lyra Brightblade is seeking to restore her family honor after they were disgraced during the fall of Aethermoor Kingdom.',
      category: 'CHARACTER',
      importance: 8,
      userId: alice.id,
      sessionId: gameSession.id,
      tags: ['lyra', 'family', 'honor', 'motivation'],
      isActive: true,
    },
  });

  await prisma.memoryEntry.create({
    data: {
      content: 'The Silver Stag Tavern is located on the edge of the Whispering Woods. The barkeep knows local rumors and legends.',
      category: 'LOCATION',
      importance: 6,
      sessionId: gameSession.id,
      tags: ['tavern', 'location', 'rumors', 'whispering-woods'],
      isActive: true,
    },
  });

  // Create sample dice rolls
  await prisma.diceRoll.create({
    data: {
      expression: '1d20+5',
      result: 17,
      breakdown: '[12]+5=17',
      purpose: 'Persuasion check to get information from barkeep',
      sessionId: gameSession.id,
    },
  });

  // Create sample game events
  await prisma.gameEvent.create({
    data: {
      title: 'Session Start',
      description: 'The Lost Kingdom campaign begins at the Silver Stag Tavern',
      eventType: 'STORY',
      sessionId: gameSession.id,
      metadata: {
        location: 'Silver Stag Tavern',
        participants: ['Lyra Brightblade'],
        mood: 'mysterious'
      }
    },
  });

  // Create system settings
  await prisma.systemSetting.upsert({
    where: { key: 'default_ai_model' },
    update: {},
    create: {
      key: 'default_ai_model',
      value: 'gpt-4',
      description: 'Default AI model to use for new sessions',
      category: 'ai',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'max_session_duration' },
    update: {},
    create: {
      key: 'max_session_duration',
      value: '480',
      description: 'Maximum session duration in minutes',
      category: 'general',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'enable_vector_search' },
    update: {},
    create: {
      key: 'enable_vector_search',
      value: 'true',
      description: 'Enable vector search for RAG system',
      category: 'ai',
    },
  });

  console.log('Database seeding completed successfully!');
  console.log('Created users:', { alice: alice.id, bob: bob.id });
  console.log('Created game session:', gameSession.id);
  console.log('Created character:', aliceCharacter.id);
  console.log('Created AI conversation:', aiConversation.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });