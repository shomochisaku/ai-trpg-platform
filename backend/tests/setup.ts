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
    $queryRawUnsafe: jest.fn(),
    $executeRaw: jest.fn(),
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
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { importance: 0 } }),
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
    workflows: {
      create: jest.fn().mockReturnValue({
        execute: jest.fn().mockResolvedValue({
          result: {
            narrative: 'Test workflow response',
            gameState: { statusTags: [], inventory: [] },
            success: true,
          },
        }),
      }),
    },
  })),
  Agent: jest.fn(),
}));

// Mock AI config
jest.mock('../src/ai/config', () => ({
  env: {
    OPENAI_API_KEY: 'test-openai-key',
    OPENAI_MODEL: 'gpt-4o-mini',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    PINECONE_API_KEY: 'test-pinecone-key',
    PINECONE_ENVIRONMENT: 'test-environment',
  },
  mastraConfig: {
    openai: {
      apiKey: 'test-openai-key',
      model: 'gpt-4o-mini',
    },
    anthropic: {
      apiKey: 'test-anthropic-key',
      model: 'claude-3-5-sonnet-20241022',
    },
    pinecone: {
      apiKey: 'test-pinecone-key',
      environment: 'test-environment',
    },
  },
  createMastraInstance: jest.fn().mockReturnValue({
    agents: {
      create: jest.fn().mockReturnValue({
        generate: jest.fn().mockResolvedValue({
          text: '{"narrative": "Test GM response", "gameState": {"statusTags": [], "inventory": []}}',
        }),
      }),
    },
    workflows: {
      create: jest.fn().mockReturnValue({
        execute: jest.fn().mockResolvedValue({
          result: {
            narrative: 'Test workflow response',
            gameState: { statusTags: [], inventory: [] },
            success: true,
          },
        }),
      }),
    },
  }),
  mastraInstance: {
    agents: {
      create: jest.fn().mockReturnValue({
        generate: jest.fn().mockResolvedValue({
          text: '{"narrative": "Test GM response", "gameState": {"statusTags": [], "inventory": []}}',
        }),
      }),
    },
    workflows: {
      create: jest.fn().mockReturnValue({
        execute: jest.fn().mockResolvedValue({
          result: {
            narrative: 'Test workflow response',
            gameState: { statusTags: [], inventory: [] },
            success: true,
          },
        }),
      }),
    },
  },
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
    searchSimilar: jest.fn().mockImplementation((embedding, options) => {
      const mockResults = [
        {
          id: 'test-memory-1',
          content: options?.category === 'CHARACTER' ? '[TEST] Character result' : '[TEST] Mock knight castle result',
          category: options?.category || 'EVENT',
          importance: 8,
          similarity: 0.9,
          tags: ['test', 'mock', 'knight'],
          createdAt: new Date(),
        },
      ];
      return Promise.resolve(mockResults);
    }),
    validateEmbedding: jest.fn().mockImplementation((embedding) => {
      if (!Array.isArray(embedding) || embedding.length !== 1536) {
        throw new Error('Invalid embedding dimensions');
      }
      return embedding;
    }),
    cosineSimilarity: jest.fn().mockImplementation((vec1, vec2) => {
      // Simple mock similarity calculation
      if (JSON.stringify(vec1) === JSON.stringify(vec2)) return 1;
      if (vec1.every(v => v === 0) && vec2.every(v => v === 0)) return 0;
      return 0.5; // Default mock similarity
    }),
  },
  VectorSearchService: jest.fn().mockImplementation(() => ({
    searchSimilar: jest.fn().mockResolvedValue([
      {
        id: 'test-memory-1',
        content: 'Mock vector search result',
        category: 'EVENT',
        importance: 8,
        similarity: 0.9,
        tags: ['test', 'mock'],
        createdAt: new Date(),
      },
    ]),
  })),
}));

// Mock embedding service
jest.mock('../src/utils/embeddings', () => ({
  embeddingService: {
    generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
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