import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { circuitBreakerManager } from '@/utils/circuitBreaker';
import { monitoringService } from '@/services/monitoringService';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
  context?: Record<string, unknown>;
  service?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    userMessage: string;
    code?: string;
    context?: Record<string, unknown>;
    stack?: string;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Error types for better categorization
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  AI_SERVICE = 'AI_SERVICE_ERROR',
  DATABASE = 'DATABASE_ERROR',
  NETWORK = 'NETWORK_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
}

/**
 * Create a standardized error with proper classification
 */
export function createError(
  message: string,
  statusCode: number = 500,
  type: ErrorType = ErrorType.INTERNAL,
  context?: Record<string, unknown>,
  service?: string
): CustomError {
  const error = new Error(message) as CustomError;
  error.statusCode = statusCode;
  error.code = type;
  error.isOperational = true;
  error.context = context;
  error.service = service;
  return error;
}

/**
 * Classify error based on its properties
 */
export function classifyError(error: CustomError): {
  type: ErrorType;
  statusCode: number;
  userMessage: string;
} {
  // AI Service errors
  if (
    error.service &&
    ['openai', 'anthropic', 'mastra'].includes(error.service)
  ) {
    if (error.message?.toLowerCase().includes('rate limit')) {
      return {
        type: ErrorType.RATE_LIMIT,
        statusCode: 429,
        userMessage:
          'AI service is temporarily busy. Please try again in a moment.',
      };
    }
    if (error.message?.toLowerCase().includes('timeout')) {
      return {
        type: ErrorType.TIMEOUT,
        statusCode: 504,
        userMessage:
          'AI service is taking longer than expected. Please try again.',
      };
    }
    return {
      type: ErrorType.AI_SERVICE,
      statusCode: 503,
      userMessage:
        'AI service is temporarily unavailable. Please try again later.',
    };
  }

  // Network errors
  if (
    error.code &&
    ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'].includes(
      error.code
    )
  ) {
    return {
      type: ErrorType.NETWORK,
      statusCode: 503,
      userMessage:
        'Network connection issue. Please check your connection and try again.',
    };
  }

  // Circuit breaker errors
  if (
    error.message?.includes('circuit breaker') ||
    error.code === 'EOPENBREAKER'
  ) {
    return {
      type: ErrorType.CIRCUIT_BREAKER,
      statusCode: 503,
      userMessage:
        'Service is temporarily unavailable due to high error rates. Please try again later.',
    };
  }

  // Database errors
  if (
    error.message?.includes('prisma') ||
    error.message?.includes('database')
  ) {
    return {
      type: ErrorType.DATABASE,
      statusCode: 503,
      userMessage:
        'Database service is temporarily unavailable. Please try again later.',
    };
  }

  // Authentication/Authorization
  if (error.statusCode === 401) {
    return {
      type: ErrorType.AUTHENTICATION,
      statusCode: 401,
      userMessage: 'Authentication required. Please log in to continue.',
    };
  }
  if (error.statusCode === 403) {
    return {
      type: ErrorType.AUTHORIZATION,
      statusCode: 403,
      userMessage: 'You do not have permission to perform this action.',
    };
  }

  // Validation errors
  if (error.statusCode === 400 || error.message?.includes('validation')) {
    return {
      type: ErrorType.VALIDATION,
      statusCode: 400,
      userMessage:
        'Invalid input provided. Please check your data and try again.',
    };
  }

  // Not found
  if (error.statusCode === 404) {
    return {
      type: ErrorType.NOT_FOUND,
      statusCode: 404,
      userMessage: 'The requested resource was not found.',
    };
  }

  // Rate limiting
  if (error.statusCode === 429) {
    return {
      type: ErrorType.RATE_LIMIT,
      statusCode: 429,
      userMessage:
        'Too many requests. Please wait a moment before trying again.',
    };
  }

  // Default internal error
  return {
    type: ErrorType.INTERNAL,
    statusCode: 500,
    userMessage: 'An unexpected error occurred. Please try again later.',
  };
}

/**
 * Enhanced global error handler
 */
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Generate request ID for tracking
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Classify the error
  const { type, statusCode, userMessage } = classifyError(err);

  // Log error with enhanced context
  const logContext = {
    requestId,
    error: err.message,
    type,
    statusCode,
    code: err.code,
    service: err.service,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    context: err.context,
    isOperational: err.isOperational,
  };

  // Record error in monitoring service
  monitoringService.recordError(
    type,
    err.message,
    err.service,
    requestId,
    statusCode
  );

  // Log at appropriate level based on error type
  if (statusCode >= 500) {
    logger.error('Server error occurred:', logContext);
  } else if (statusCode >= 400) {
    logger.warn('Client error occurred:', logContext);
  } else {
    logger.info('Error handled:', logContext);
  }

  // Update circuit breaker monitoring if applicable
  if (err.service) {
    const breaker = circuitBreakerManager.getCircuitBreaker(err.service);
    if (breaker.isOpen()) {
      logger.warn(`Circuit breaker is open for service: ${err.service}`, {
        requestId,
        stats: breaker.getStats(),
      });
    }
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      type,
      message: err.message,
      userMessage,
      code: err.code,
      context: process.env.NODE_ENV === 'development' ? err.context : undefined,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  // Set response headers
  res.setHeader('X-Request-ID', requestId);

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create AI service specific errors
 */
export const createAIServiceError = (
  message: string,
  service: 'openai' | 'anthropic' | 'mastra',
  originalError?: Error
): CustomError => {
  const error = createError(
    message,
    503,
    ErrorType.AI_SERVICE,
    { originalError: originalError?.message },
    service
  );
  return error;
};
