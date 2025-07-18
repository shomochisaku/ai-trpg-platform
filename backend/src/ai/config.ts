import { z } from 'zod';

// Environment configuration schema
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_ENVIRONMENT: z.string().optional(),
});

// Parse and validate environment variables
export const env = envSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT,
});

// Mastra AI configuration
export const mastraConfig = {
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: 'gpt-4',
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