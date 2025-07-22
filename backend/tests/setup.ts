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