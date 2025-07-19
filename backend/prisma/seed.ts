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

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      email: 'charlie@example.com',
      username: 'charlie',
      password: hashedPassword,
      displayName: 'Charlie the Explorer',
      bio: 'Sci-fi enthusiast and tech-savvy player',
      preferences: {
        create: {
          preferredAIModel: 'gpt-4',
          aiPersonality: 'analytical',
          theme: 'dark',
          fontSize: 'small',
          notificationsOn: true,
          autoSaveInterval: 45,
          maxMessageHistory: 1500,
        }
      }
    },
  });

  const diana = await prisma.user.upsert({
    where: { email: 'diana@example.com' },
    update: {},
    create: {
      email: 'diana@example.com',
      username: 'diana',
      password: hashedPassword,
      displayName: 'Diana the Mysterious',
      bio: 'Horror and mystery game specialist',
      preferences: {
        create: {
          preferredAIModel: 'claude-3-sonnet',
          aiPersonality: 'atmospheric',
          theme: 'dark',
          fontSize: 'medium',
          notificationsOn: false,
          autoSaveInterval: 60,
          maxMessageHistory: 800,
        }
      }
    },
  });

  // ============================================================================
  // FANTASY CAMPAIGN: The Lost Kingdom
  // ============================================================================

  const fantasySession = await prisma.gameSession.create({
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

  // Fantasy Character: Lyra Brightblade
  const lyraCharacter = await prisma.character.create({
    data: {
      name: 'Lyra Brightblade',
      description: 'A skilled elven warrior with a mysterious past',
      ownerId: alice.id,
      sessionId: fantasySession.id,
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
      },
      statusEffects: {
        create: [
          {
            name: 'Blessed',
            description: 'Blessed by the temple priests, gaining +2 to all saves',
            duration: 10,
            effectType: 'BUFF',
            modifiers: {
              savingThrows: 2
            }
          }
        ]
      }
    },
  });

  // ============================================================================
  // SCI-FI CAMPAIGN: Starfall Colony
  // ============================================================================

  const scifiSession = await prisma.gameSession.create({
    data: {
      name: 'Starfall Colony',
      description: 'A sci-fi survival adventure on a distant colony world',
      createdBy: charlie.id,
      systemType: 'cyberpunk',
      maxPlayers: 5,
      genre: 'Science Fiction',
      setting: 'Distant future colony on alien world',
      storyGoal: 'Survive hostile environment and uncover alien conspiracy',
      aiGMEnabled: true,
      aiModel: 'gpt-4',
      aiPersonality: 'analytical',
      players: {
        create: [
          {
            userId: charlie.id,
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

  // Sci-Fi Character: Zara Nova
  const zaraCharacter = await prisma.character.create({
    data: {
      name: 'Zara Nova',
      description: 'A cybernetic enhanced engineer specialized in alien technology',
      ownerId: charlie.id,
      sessionId: scifiSession.id,
      race: 'Human',
      class: 'Engineer',
      level: 2,
      experience: 800,
      age: 28,
      height: '5\'6"',
      weight: '135 lbs',
      appearance: 'Athletic build with cybernetic implants visible along her arms',
      strength: 12,
      dexterity: 16,
      constitution: 15,
      intelligence: 18,
      wisdom: 14,
      charisma: 11,
      hitPoints: 24,
      maxHitPoints: 24,
      armorClass: 14,
      background: 'Colony Technician',
      personality: 'Logical and methodical, but curious about alien technology',
      ideals: 'Knowledge and technological advancement',
      bonds: 'Protect the colony and unlock alien secrets',
      flaws: 'Obsessive about understanding alien tech, sometimes ignores danger',
      backstory: 'Former Earth engineer sent to establish colony infrastructure',
      goals: 'Reverse-engineer alien technology to save the colony',
      motivations: 'Scientific discovery and protecting fellow colonists',
      inventory: {
        create: [
          {
            name: 'Plasma Cutter',
            description: 'Industrial tool that doubles as a weapon',
            quantity: 1,
            weight: 2,
            value: 800,
            itemType: 'WEAPON',
            rarity: 'UNCOMMON',
            isEquipped: true,
            bonuses: {
              attack: 2,
              damage: 6
            }
          },
          {
            name: 'Environmental Suit',
            description: 'Protective suit against alien atmosphere',
            quantity: 1,
            weight: 8,
            value: 1200,
            itemType: 'ARMOR',
            rarity: 'COMMON',
            isEquipped: true,
            bonuses: {
              armorClass: 4,
              environmentalProtection: true
            }
          },
          {
            name: 'Med-Kit',
            description: 'Advanced medical supplies with nano-healers',
            quantity: 2,
            weight: 1,
            value: 300,
            itemType: 'CONSUMABLE',
            rarity: 'COMMON',
            bonuses: {
              healing: 12
            }
          }
        ]
      },
      statusEffects: {
        create: [
          {
            name: 'Cybernetic Enhancement',
            description: 'Enhanced reflexes and processing speed',
            duration: -1,
            effectType: 'PERMANENT',
            modifiers: {
              dexterity: 2,
              intelligence: 1
            }
          }
        ]
      }
    },
  });

  // ============================================================================
  // HORROR CAMPAIGN: The Whispering Manor
  // ============================================================================

  const horrorSession = await prisma.gameSession.create({
    data: {
      name: 'The Whispering Manor',
      description: 'A psychological horror investigation in a haunted Victorian mansion',
      createdBy: diana.id,
      systemType: 'call-of-cthulhu',
      maxPlayers: 4,
      genre: 'Horror',
      setting: 'Victorian era haunted mansion',
      storyGoal: 'Survive the night and uncover the dark secrets of the manor',
      aiGMEnabled: true,
      aiModel: 'claude-3-sonnet',
      aiPersonality: 'atmospheric',
      players: {
        create: [
          {
            userId: diana.id,
            role: 'PLAYER',
            isActive: true,
          },
          {
            userId: alice.id,
            role: 'GM',
            isActive: true,
          }
        ]
      }
    },
  });

  // Horror Character: Dr. Marcus Blackwood
  const marcusCharacter = await prisma.character.create({
    data: {
      name: 'Dr. Marcus Blackwood',
      description: 'A paranormal investigator with a troubled past',
      ownerId: diana.id,
      sessionId: horrorSession.id,
      race: 'Human',
      class: 'Investigator',
      level: 1,
      experience: 200,
      age: 45,
      height: '6\'0"',
      weight: '175 lbs',
      appearance: 'Gaunt figure with graying hair and haunted eyes',
      strength: 11,
      dexterity: 13,
      constitution: 12,
      intelligence: 17,
      wisdom: 16,
      charisma: 14,
      hitPoints: 18,
      maxHitPoints: 18,
      armorClass: 12,
      background: 'Occult Scholar',
      personality: 'Methodical and scholarly, but haunted by past experiences',
      ideals: 'Truth and understanding of the supernatural',
      bonds: 'Seeks to understand the death of his research partner',
      flaws: 'Suffers from nightmares and paranoia',
      backstory: 'Former university professor turned paranormal investigator',
      goals: 'Uncover the truth behind supernatural phenomena',
      motivations: 'Redemption and protecting others from supernatural threats',
      inventory: {
        create: [
          {
            name: 'Antique Revolver',
            description: 'An old but reliable firearm',
            quantity: 1,
            weight: 2,
            value: 150,
            itemType: 'WEAPON',
            rarity: 'COMMON',
            isEquipped: true,
            bonuses: {
              attack: 1,
              damage: 4
            }
          },
          {
            name: 'Leather Coat',
            description: 'Worn but sturdy protective coat',
            quantity: 1,
            weight: 3,
            value: 50,
            itemType: 'ARMOR',
            rarity: 'COMMON',
            isEquipped: true,
            bonuses: {
              armorClass: 1
            }
          },
          {
            name: 'Laudanum',
            description: 'Medicinal opiate for pain and anxiety',
            quantity: 1,
            weight: 0.2,
            value: 20,
            itemType: 'CONSUMABLE',
            rarity: 'COMMON',
            bonuses: {
              healing: 3,
              sanity: 2
            }
          }
        ]
      },
      statusEffects: {
        create: [
          {
            name: 'Haunted',
            description: 'Plagued by supernatural nightmares',
            duration: -1,
            effectType: 'DEBUFF',
            modifiers: {
              wisdom: -1,
              sleepPenalty: true
            }
          }
        ]
      }
    },
  });

  // ============================================================================
  // STORY ELEMENTS AND MESSAGES
  // ============================================================================

  // Fantasy Story Elements
  const fantasyPrologue = await prisma.storyElement.create({
    data: {
      title: 'The Prologue: A Kingdom in Shadow',
      content: 'Long ago, the Kingdom of Aethermoor was a beacon of light and prosperity. But darkness came, and the kingdom fell into shadow. Now, heroes must rise to restore what was lost.',
      type: 'CHAPTER',
      sessionId: fantasySession.id,
      priority: 10,
      tags: ['prologue', 'background', 'kingdom'],
      orderIndex: 1,
    },
  });

  const fantasyScene = await prisma.storyElement.create({
    data: {
      title: 'The Tavern: Where Adventures Begin',
      content: 'The heroes find themselves in the Silver Stag Tavern, a dimly lit establishment on the edge of the Whispering Woods. Rumors speak of ancient ruins and lost treasures hidden in the depths of the forest.',
      type: 'SCENE',
      sessionId: fantasySession.id,
      parentId: fantasyPrologue.id,
      priority: 5,
      tags: ['tavern', 'meeting', 'rumors'],
      orderIndex: 1,
    },
  });

  // Sci-Fi Story Elements
  const scifiPrologue = await prisma.storyElement.create({
    data: {
      title: 'Colony Initialization',
      content: 'The colony ship Prometheus has arrived at Kepler-442b after a 50-year journey. The automated systems have begun establishing basic infrastructure, but strange readings from the planet\'s core suggest the world holds secrets.',
      type: 'CHAPTER',
      sessionId: scifiSession.id,
      priority: 10,
      tags: ['prologue', 'colony', 'alien-world'],
      orderIndex: 1,
    },
  });

  const scifiScene = await prisma.storyElement.create({
    data: {
      title: 'The Engineering Bay',
      content: 'The colony\'s engineering bay hums with activity. Massive 3D printers work to construct habitation modules while atmospheric processors clean the alien air. However, sensor arrays are detecting anomalous energy signatures from the planet\'s crust.',
      type: 'SCENE',
      sessionId: scifiSession.id,
      parentId: scifiPrologue.id,
      priority: 5,
      tags: ['engineering', 'colony', 'mystery'],
      orderIndex: 1,
    },
  });

  // Horror Story Elements
  const horrorPrologue = await prisma.storyElement.create({
    data: {
      title: 'The Inheritance',
      content: 'The fog-shrouded manor stands as a monument to forgotten sorrows. Dr. Blackwood has inherited this Victorian mansion from a distant relative, but local whispers speak of tragedy and madness that befell the previous inhabitants.',
      type: 'CHAPTER',
      sessionId: horrorSession.id,
      priority: 10,
      tags: ['prologue', 'inheritance', 'manor'],
      orderIndex: 1,
    },
  });

  const horrorScene = await prisma.storyElement.create({
    data: {
      title: 'The Grand Foyer',
      content: 'The manor\'s grand foyer is draped in dust and shadow. A massive chandelier hangs precariously overhead, and portraits of stern-faced ancestors line the walls. The air is thick with the scent of decay and something else... something wrong.',
      type: 'SCENE',
      sessionId: horrorSession.id,
      parentId: horrorPrologue.id,
      priority: 5,
      tags: ['foyer', 'atmosphere', 'portraits'],
      orderIndex: 1,
    },
  });

  // ============================================================================
  // SAMPLE MESSAGES AND CONVERSATIONS
  // ============================================================================

  // Fantasy Messages
  await prisma.gameMessage.create({
    data: {
      content: 'Welcome to the Silver Stag Tavern! The fireplace crackles warmly as you enter, and the smell of roasted meat fills the air. A mysterious hooded figure sits in the corner, watching you with interest.',
      type: 'NARRATIVE',
      userId: bob.id,
      sessionId: fantasySession.id,
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
      sessionId: fantasySession.id,
    },
  });

  await prisma.gameMessage.create({
    data: {
      content: 'The grizzled barkeep eyes you warily before pouring a frothy ale. "The ruins, eh? Most folk avoid that place. Strange lights been seen there lately, and old Gareth swears he heard singing coming from the stones. Mad singing, he says."',
      type: 'GM',
      userId: bob.id,
      sessionId: fantasySession.id,
      aiGenerated: true,
      aiModel: 'gpt-4',
    },
  });

  // Sci-Fi Messages
  await prisma.gameMessage.create({
    data: {
      content: 'The engineering bay\'s emergency lights flash amber as you enter. The atmospheric processors are working overtime, but something is wrong. The seismic sensors are detecting rhythmic pulses from deep beneath the colony.',
      type: 'NARRATIVE',
      userId: bob.id,
      sessionId: scifiSession.id,
      isNarrative: true,
      aiGenerated: true,
      aiModel: 'gpt-4',
    },
  });

  await prisma.gameMessage.create({
    data: {
      content: 'Zara quickly accesses the main terminal, her cybernetic implants interfacing directly with the colony\'s systems. "These readings don\'t match any known geological phenomena. We need to investigate the source before it affects critical systems."',
      type: 'PLAYER',
      userId: charlie.id,
      sessionId: scifiSession.id,
    },
  });

  await prisma.gameMessage.create({
    data: {
      content: 'As you interface with the system, your enhanced vision picks up data streams that shouldn\'t exist. The pulses aren\'t random - they\'re following a pattern. Almost like... communication.',
      type: 'GM',
      userId: bob.id,
      sessionId: scifiSession.id,
      aiGenerated: true,
      aiModel: 'gpt-4',
    },
  });

  // Horror Messages
  await prisma.gameMessage.create({
    data: {
      content: 'The floorboards creak ominously under your weight as you enter the manor. The air is thick with dust and something else - a sweet, cloying scent that makes your stomach turn. In the dim light, you swear you see movement in the shadows.',
      type: 'NARRATIVE',
      userId: alice.id,
      sessionId: horrorSession.id,
      isNarrative: true,
      aiGenerated: true,
      aiModel: 'claude-3-sonnet',
    },
  });

  await prisma.gameMessage.create({
    data: {
      content: 'Dr. Blackwood steadies himself against the doorframe, his academic mind trying to rationalize what his eyes are seeing. "Just dust motes in the light," he whispers, though his trembling hands suggest otherwise.',
      type: 'PLAYER',
      userId: diana.id,
      sessionId: horrorSession.id,
    },
  });

  await prisma.gameMessage.create({
    data: {
      content: 'As you speak, the shadows seem to shift and dance independently of any light source. From somewhere deeper in the house comes the sound of a music box, playing a hauntingly familiar melody.',
      type: 'GM',
      userId: alice.id,
      sessionId: horrorSession.id,
      aiGenerated: true,
      aiModel: 'claude-3-sonnet',
    },
  });

  // ============================================================================
  // DICE ROLLS AND GAME EVENTS
  // ============================================================================

  // Fantasy Dice Rolls
  await prisma.diceRoll.create({
    data: {
      expression: '1d20+5',
      result: 17,
      breakdown: '[12]+5=17',
      purpose: 'Persuasion check to get information from barkeep',
      sessionId: fantasySession.id,
    },
  });

  await prisma.diceRoll.create({
    data: {
      expression: '1d6+3',
      result: 8,
      breakdown: '[5]+3=8',
      purpose: 'Longsword damage against goblin',
      sessionId: fantasySession.id,
    },
  });

  // Sci-Fi Dice Rolls
  await prisma.diceRoll.create({
    data: {
      expression: '1d20+8',
      result: 23,
      breakdown: '[15]+8=23',
      purpose: 'Technology skill check to analyze alien signals',
      sessionId: scifiSession.id,
    },
  });

  // Horror Dice Rolls
  await prisma.diceRoll.create({
    data: {
      expression: '1d100',
      result: 78,
      breakdown: '[78]=78',
      purpose: 'Sanity check after encountering supernatural phenomenon',
      sessionId: horrorSession.id,
    },
  });

  // Game Events
  await prisma.gameEvent.create({
    data: {
      title: 'Fantasy Session Start',
      description: 'The Lost Kingdom campaign begins at the Silver Stag Tavern',
      eventType: 'STORY',
      sessionId: fantasySession.id,
      metadata: {
        location: 'Silver Stag Tavern',
        participants: ['Lyra Brightblade'],
        mood: 'mysterious'
      }
    },
  });

  await prisma.gameEvent.create({
    data: {
      title: 'Colony Anomaly Detected',
      description: 'Strange energy readings discovered beneath the colony',
      eventType: 'STORY',
      sessionId: scifiSession.id,
      metadata: {
        location: 'Engineering Bay',
        participants: ['Zara Nova'],
        threat_level: 'unknown'
      }
    },
  });

  await prisma.gameEvent.create({
    data: {
      title: 'Manor Investigation Begins',
      description: 'Dr. Blackwood enters the haunted Whispering Manor',
      eventType: 'STORY',
      sessionId: horrorSession.id,
      metadata: {
        location: 'Whispering Manor',
        participants: ['Dr. Marcus Blackwood'],
        atmosphere: 'foreboding'
      }
    },
  });

  // ============================================================================
  // AI CONVERSATIONS AND MEMORY ENTRIES
  // ============================================================================

  // Fantasy AI Conversation
  const fantasyAI = await prisma.aIConversation.create({
    data: {
      title: 'Fantasy GM Planning Session',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 4000,
      userId: bob.id,
      sessionId: fantasySession.id,
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

  // Sci-Fi AI Conversation
  const scifiAI = await prisma.aIConversation.create({
    data: {
      title: 'Sci-Fi Colony Management',
      model: 'gpt-4',
      temperature: 0.8,
      maxTokens: 4000,
      userId: bob.id,
      sessionId: scifiSession.id,
      context: 'You are an AI assistant helping to manage a sci-fi colony survival scenario. Focus on realistic technology and alien mysteries.',
      messages: {
        create: [
          {
            content: 'The colony is detecting strange seismic patterns. How should I present this mystery to the player?',
            role: 'USER',
            tokenCount: 20,
          },
          {
            content: 'Present it as a gradual revelation:\n\n1. **Initial Detection**: Sensors show rhythmic pulses from deep underground\n2. **Pattern Recognition**: The pulses follow a mathematical sequence\n3. **Equipment Interference**: Colony systems begin experiencing unexplained malfunctions\n4. **Discovery**: The patterns match no known geological phenomena\n\nThis builds tension while giving the engineer character opportunities to use their technical skills.',
            role: 'ASSISTANT',
            tokenCount: 85,
            responseTime: 1200,
          }
        ]
      }
    },
  });

  // Horror AI Conversation
  const horrorAI = await prisma.aIConversation.create({
    data: {
      title: 'Horror Atmosphere Building',
      model: 'claude-3-sonnet',
      temperature: 0.6,
      maxTokens: 4000,
      userId: alice.id,
      sessionId: horrorSession.id,
      context: 'You are a master of atmospheric horror, helping to create psychological tension and dread in a Victorian manor setting.',
      messages: {
        create: [
          {
            content: 'How can I build tension in the manor without relying on jump scares?',
            role: 'USER',
            tokenCount: 15,
          },
          {
            content: 'Focus on psychological elements:\n\n1. **Sensory Details**: Describe unsettling sounds, smells, and textures\n2. **Implied Presence**: Suggest someone/something is watching without showing it\n3. **Environmental Storytelling**: Let the manor\'s decay tell a story\n4. **Uncanny Elements**: Familiar objects in wrong places or configurations\n\nThe key is building dread through anticipation rather than shock.',
            role: 'ASSISTANT',
            tokenCount: 78,
            responseTime: 1800,
          }
        ]
      }
    },
  });

  // Memory Entries
  await prisma.memoryEntry.create({
    data: {
      content: 'Lyra Brightblade is seeking to restore her family honor after they were disgraced during the fall of Aethermoor Kingdom.',
      category: 'CHARACTER',
      importance: 8,
      userId: alice.id,
      sessionId: fantasySession.id,
      tags: ['lyra', 'family', 'honor', 'motivation'],
      isActive: true,
    },
  });

  await prisma.memoryEntry.create({
    data: {
      content: 'The Silver Stag Tavern is located on the edge of the Whispering Woods. The barkeep knows local rumors and legends.',
      category: 'LOCATION',
      importance: 6,
      sessionId: fantasySession.id,
      tags: ['tavern', 'location', 'rumors', 'whispering-woods'],
      isActive: true,
    },
  });

  await prisma.memoryEntry.create({
    data: {
      content: 'Zara Nova\'s cybernetic implants allow her to interface directly with colony systems and detect anomalous data patterns.',
      category: 'CHARACTER',
      importance: 7,
      userId: charlie.id,
      sessionId: scifiSession.id,
      tags: ['zara', 'cybernetics', 'technology', 'abilities'],
      isActive: true,
    },
  });

  await prisma.memoryEntry.create({
    data: {
      content: 'The colony\'s seismic sensors are detecting rhythmic pulses from deep beneath the surface that follow a mathematical pattern.',
      category: 'EVENT',
      importance: 9,
      sessionId: scifiSession.id,
      tags: ['seismic', 'mystery', 'alien', 'patterns'],
      isActive: true,
    },
  });

  await prisma.memoryEntry.create({
    data: {
      content: 'Dr. Blackwood suffers from recurring nightmares related to his previous paranormal investigations and his research partner\'s death.',
      category: 'CHARACTER',
      importance: 8,
      userId: diana.id,
      sessionId: horrorSession.id,
      tags: ['marcus', 'nightmares', 'trauma', 'motivation'],
      isActive: true,
    },
  });

  await prisma.memoryEntry.create({
    data: {
      content: 'The Whispering Manor has a history of tragic deaths and madness among its inhabitants. Local legends speak of cursed bloodlines.',
      category: 'LOCATION',
      importance: 9,
      sessionId: horrorSession.id,
      tags: ['manor', 'curse', 'history', 'tragedy'],
      isActive: true,
    },
  });

  // ============================================================================
  // SYSTEM SETTINGS
  // ============================================================================

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

  await prisma.systemSetting.upsert({
    where: { key: 'default_fantasy_personality' },
    update: {},
    create: {
      key: 'default_fantasy_personality',
      value: 'epic',
      description: 'Default AI personality for fantasy campaigns',
      category: 'ai',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'default_scifi_personality' },
    update: {},
    create: {
      key: 'default_scifi_personality',
      value: 'analytical',
      description: 'Default AI personality for sci-fi campaigns',
      category: 'ai',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'default_horror_personality' },
    update: {},
    create: {
      key: 'default_horror_personality',
      value: 'atmospheric',
      description: 'Default AI personality for horror campaigns',
      category: 'ai',
    },
  });

  console.log('Database seeding completed successfully!');
  console.log('=====================================');
  console.log('Created users:', { 
    alice: alice.id, 
    bob: bob.id, 
    charlie: charlie.id, 
    diana: diana.id 
  });
  console.log('Created sessions:', { 
    fantasy: fantasySession.id, 
    scifi: scifiSession.id, 
    horror: horrorSession.id 
  });
  console.log('Created characters:', { 
    lyra: lyraCharacter.id, 
    zara: zaraCharacter.id, 
    marcus: marcusCharacter.id 
  });
  console.log('Created AI conversations:', { 
    fantasy: fantasyAI.id, 
    scifi: scifiAI.id, 
    horror: horrorAI.id 
  });
  console.log('=====================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });