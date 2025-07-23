import { logger } from '../src/utils/logger';

// Mock logger for tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock PrismaClient for consistent testing
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    
    // Campaign related tables
    campaign: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    
    gameSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    
    memoryEntry: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    
    aIMessage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
    MemoryType: {
      GENERAL: 'GENERAL',
      CHARACTER: 'CHARACTER',
      LOCATION: 'LOCATION',
      EVENT: 'EVENT',
      RULE: 'RULE',
      PREFERENCE: 'PREFERENCE',
      STORY_BEAT: 'STORY_BEAT',
    },
    CampaignStatus: {
      DRAFT: 'DRAFT',
      ACTIVE: 'ACTIVE',
      PAUSED: 'PAUSED',
      COMPLETED: 'COMPLETED',
    },
  };
});

// Mock OpenAI
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: '{"narrative": "Test narrative response", "gameState": {"statusTags": [], "inventory": []}}',
              },
            },
          ],
        }),
      },
    },
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    },
  })),
}));

// Mock Mastra AI framework
jest.mock('@mastra/core', () => ({
  Mastra: jest.fn().mockImplementation(() => ({
    agents: {
      create: jest.fn().mockReturnValue({
        generate: jest.fn().mockResolvedValue({
          text: '{"narrative": "Test GM response", "gameState": {"statusTags": [], "inventory": []}}',
        }),
      }),
    },
  })),
  Agent: jest.fn(),
}));

jest.mock('@mastra/memory', () => ({
  Memory: jest.fn().mockImplementation(() => ({
    remember: jest.fn().mockResolvedValue([]),
    forget: jest.fn().mockResolvedValue(true),
  })),
  VectorMemory: jest.fn().mockImplementation(() => ({
    remember: jest.fn().mockResolvedValue([]),
    search: jest.fn().mockResolvedValue([]),
  })),
}));

// Mock vector search service
jest.mock('../src/services/vectorSearchService', () => ({
  vectorSearchService: {
    searchMemories: jest.fn().mockResolvedValue([
      {
        id: 'test-memory-1',
        content: 'Test memory content',
        category: 'GENERAL',
        similarity: 0.9,
        importance: 7,
        tags: ['test'],
        isActive: true,
        userId: 'test-user',
        sessionId: 'test-session',
        createdAt: new Date(),
        updatedAt: new Date(),
        embedding: new Array(1536).fill(0.1),
      }
    ]),
    storeMemory: jest.fn().mockResolvedValue({ id: 'test-memory-id' }),
    validateEmbedding: jest.fn().mockImplementation((embedding) => {
      if (!Array.isArray(embedding)) {
        throw new Error('Embedding must be an array');
      }
      if (embedding.length === 0) {
        throw new Error('Embedding cannot be empty');
      }
      for (let i = 0; i < embedding.length; i++) {
        if (typeof embedding[i] !== 'number') {
          throw new Error(`Invalid embedding value at index ${i}`);
        }
      }
      return embedding;
    }),
    cosineSimilarity: jest.fn().mockImplementation((vec1, vec2) => {
      // Simple dot product for test purposes
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;
      for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
      }
      return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }),
  },
}));

// Mock embedding service
jest.mock('../src/utils/embeddings', () => ({
  embeddingService: {
    generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
  },
}));

// Mock memory service
jest.mock('../src/services/memoryService', () => ({
  memoryService: {
    createMemory: jest.fn().mockResolvedValue({
      id: 'test-memory-id',
      content: 'Test memory content',
      category: 'GENERAL',
      importance: 5,
      tags: ['test'],
      isActive: true,
      userId: 'test-user',
      sessionId: 'test-session',
      embedding: new Array(1536).fill(0.1),
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    searchMemories: jest.fn().mockResolvedValue([]),
    updateMemory: jest.fn().mockResolvedValue({
      id: 'test-memory-id',
      content: 'Updated content',
      category: 'GENERAL',
      importance: 5,
      tags: ['test'],
      isActive: true,
      userId: 'test-user',
      sessionId: 'test-session',
      embedding: new Array(1536).fill(0.2),
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    deleteMemory: jest.fn().mockResolvedValue(undefined),
    getMemory: jest.fn().mockResolvedValue({
      id: 'test-memory-id',
      content: 'Test content',
      category: 'GENERAL',
      importance: 5,
      tags: ['test'],
      isActive: false,
      userId: 'test-user',
      sessionId: 'test-session',
      embedding: new Array(1536).fill(0.1),
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    getMemoriesByType: jest.fn().mockResolvedValue([]),
    bulkImportMemories: jest.fn().mockResolvedValue(0),
    getCampaignMemoryStats: jest.fn().mockResolvedValue({
      totalMemories: 0,
      activeMemories: 0,
      memoriesByCategory: {},
      averageImportance: 0,
    }),
  },
}));

// Mock AI configuration
jest.mock('../src/ai/config', () => ({
  mastraInstance: {
    agents: {
      create: jest.fn().mockReturnValue({
        generate: jest.fn().mockResolvedValue({
          text: '{"narrative": "Test GM response", "gameState": {"statusTags": [], "inventory": []}}',
        }),
      }),
    },
  },
}));

// Mock AI services
jest.mock('../src/ai/aiService', () => ({
  aiService: {
    initialize: jest.fn().mockResolvedValue(true),
    createGMSession: jest.fn().mockResolvedValue({
      id: 'test-session',
      send: jest.fn().mockResolvedValue({
        narrative: 'Test GM response',
        gameState: { statusTags: [], inventory: [] },
      }),
    }),
    processPlayerAction: jest.fn().mockResolvedValue({
      narrative: 'Test action response', 
      gameState: { statusTags: [], inventory: [] },
      diceResults: [],
    }),
    getHealthStatus: jest.fn().mockResolvedValue({ status: 'healthy' }),
  },
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

// Use PostgreSQL in CI, SQLite locally
if (process.env.CI) {
  // CI environment already has DATABASE_URL set, don't override
} else {
  // Local environment uses SQLite
  process.env.DATABASE_URL = 'file:./test.db';
}

process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.PINECONE_API_KEY = 'test-pinecone-key';
process.env.PINECONE_ENVIRONMENT = 'test-environment';

// Global test setup
beforeAll(() => {
  // Setup code that runs before all tests
});

afterAll(() => {
  // Cleanup code that runs after all tests
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});