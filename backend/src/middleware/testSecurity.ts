/**
 * Test Security Configuration
 *
 * This module provides test-safe security settings for development and testing.
 * It should NOT be used in production environments.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

// Extend Express Request interface
interface TestRequest extends Request {
  testContext?: {
    securityBypassed: boolean;
    environment: string | undefined;
    timestamp: string;
  };
}

// Test environment detection
export const isTestEnvironment = (): boolean => {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'development' ||
    process.env.CI === 'true'
  );
};

// Test API key provider
export const provideTestApiKeys = (): void => {
  if (!isTestEnvironment()) {
    logger.warn('Test API keys should not be used in production');
    return;
  }

  // Set test API keys if not already set (read from .env.test if available)
  const testKeys = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'sk-test-openai-key-for-development-only',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'sk-ant-api03-test-anthropic-key-for-development',
    JWT_SECRET: process.env.JWT_SECRET || 'development-jwt-secret-key-minimum-32-characters-required',
    PINECONE_API_KEY: process.env.PINECONE_API_KEY || 'test-pinecone-key-for-development',
  };

  Object.entries(testKeys).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
      logger.info(`Set test ${key} for development`, {
        environment: process.env.NODE_ENV,
        keyPreview: value.substring(0, 12) + '...',
      });
    }
  });
};

// Security bypass middleware for testing
export const bypassSecurityForTesting = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isTestEnvironment()) {
    logger.error('Security bypass attempted in non-test environment', {
      environment: process.env.NODE_ENV,
      ip: req.ip,
      path: req.path,
    });
    res.status(403).json({
      success: false,
      error: 'Security bypass not allowed in production',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Add test context to request
  (req as TestRequest).testContext = {
    securityBypassed: true,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  next();
};

// Initialize test security settings
export const initializeTestSecurity = (): void => {
  if (isTestEnvironment()) {
    logger.info('Initializing test security settings', {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });

    provideTestApiKeys();

    // Warn about test mode
    logger.warn(
      '⚠️  DEVELOPMENT/TEST MODE: Using test API keys and reduced security',
      {
        environment: process.env.NODE_ENV,
        warning: 'Do not use in production',
      }
    );
  }
};

export const testSecurity = {
  isTestEnvironment,
  provideTestApiKeys,
  bypassSecurityForTesting,
  initializeTestSecurity,
};

export default testSecurity;
