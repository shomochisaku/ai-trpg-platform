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

// Mock PrismaClient to use test database
// In CI environment, use regular PrismaClient with PostgreSQL
// In local environment, may use SQLite fallback
jest.mock('@prisma/client', () => {
  if (process.env.CI) {
    // Use regular PrismaClient in CI
    const actualPrisma = jest.requireActual('@prisma/client');
    return actualPrisma;
  } else {
    // Try SQLite client locally, fallback to regular if not available
    try {
      const { PrismaClient } = require('../node_modules/.prisma/client-test');
      return { PrismaClient };
    } catch (error) {
      const actualPrisma = jest.requireActual('@prisma/client');
      return actualPrisma;
    }
  }
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'file:./test.db';
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