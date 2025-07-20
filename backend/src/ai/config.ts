import { z } from 'zod';
import dotenv from 'dotenv';
import { Mastra } from '@mastra/core';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

// Environment configuration schema
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  ANTHROPIC_API_KEY: z.string().optional(),
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_ENVIRONMENT: z.string().optional(),
});

// Fallback to dummy values for development
const getEnvWithFallback = (key: string, fallback: string): string => {
  return process.env[key] || fallback;
};

// Parse and validate environment variables
export const env = envSchema.parse({
  OPENAI_API_KEY: getEnvWithFallback('OPENAI_API_KEY', 'dummy-openai-key'),
  OPENAI_MODEL: getEnvWithFallback('OPENAI_MODEL', 'gpt-4o-mini'),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT,
});

// Mastra AI configuration
export const mastraConfig = {
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
  },
  anthropic: {
    apiKey: env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
  },
  pinecone: {
    apiKey: env.PINECONE_API_KEY,
    environment: env.PINECONE_ENVIRONMENT,
  },
};

// Mastra framework configuration
export const createMastraInstance = (): Mastra | null => {
  try {
    return new Mastra({});
  } catch (error) {
    logger.warn('Failed to create Mastra instance:', error);
    return null;
  }
};

export const mastraInstance = createMastraInstance();
