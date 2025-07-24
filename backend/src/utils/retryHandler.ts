import pRetry from 'p-retry';
import { logger } from './logger';

export interface RetryOptions {
  retries?: number;
  factor?: number;
  minTimeout?: number;
  maxTimeout?: number;
  randomize?: boolean;
  onFailedAttempt?: (error: pRetry.FailedAttemptError) => void;
}

export interface RetryableError extends Error {
  code?: string;
  status?: number;
  isRetryable?: boolean;
}

/**
 * Default retry configuration for AI API calls
 */
export const DEFAULT_AI_RETRY_OPTIONS: RetryOptions = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 10000,
  randomize: true,
  onFailedAttempt: (error) => {
    logger.warn(`Retry attempt ${error.attemptNumber} failed:`, {
      error: error.message,
      retriesLeft: error.retriesLeft,
      nextRetryIn: error.nextRetryIn,
    });
  },
};

/**
 * Determines if an error should be retried based on its type and status
 */
export function isRetryableError(error: RetryableError): boolean {
  // Network errors (typically ECONNRESET, ENOTFOUND, etc.)
  if (error.code && ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'].includes(error.code)) {
    return true;
  }

  // HTTP status codes that should be retried
  if (error.status) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }

  // OpenAI/Anthropic specific errors
  if (error.message) {
    const retryableMessages = [
      'rate limit',
      'timeout',
      'temporary',
      'overloaded',
      'server error',
      'service unavailable',
    ];
    
    const lowerMessage = error.message.toLowerCase();
    return retryableMessages.some(msg => lowerMessage.includes(msg));
  }

  // Explicit retry flag
  if (error.isRetryable !== undefined) {
    return error.isRetryable;
  }

  return false;
}

/**
 * Retry wrapper for AI API calls with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = DEFAULT_AI_RETRY_OPTIONS
): Promise<T> {
  return pRetry(
    async () => {
      try {
        return await operation();
      } catch (error) {
        const retryableError = error as RetryableError;
        
        // Only retry if the error is retryable
        if (!isRetryableError(retryableError)) {
          logger.error('Non-retryable error encountered:', {
            error: retryableError.message,
            code: retryableError.code,
            status: retryableError.status,
          });
          throw new pRetry.AbortError(retryableError);
        }

        logger.warn('Retryable error encountered:', {
          error: retryableError.message,
          code: retryableError.code,
          status: retryableError.status,
        });
        
        throw retryableError;
      }
    },
    {
      retries: options.retries || DEFAULT_AI_RETRY_OPTIONS.retries!,
      factor: options.factor || DEFAULT_AI_RETRY_OPTIONS.factor!,
      minTimeout: options.minTimeout || DEFAULT_AI_RETRY_OPTIONS.minTimeout!,
      maxTimeout: options.maxTimeout || DEFAULT_AI_RETRY_OPTIONS.maxTimeout!,
      randomize: options.randomize !== undefined ? options.randomize : DEFAULT_AI_RETRY_OPTIONS.randomize!,
      onFailedAttempt: options.onFailedAttempt || DEFAULT_AI_RETRY_OPTIONS.onFailedAttempt!,
    }
  );
}

/**
 * Create a retry wrapper with custom options
 */
export function createRetryWrapper(options: RetryOptions) {
  return <T>(operation: () => Promise<T>) => withRetry(operation, options);
}