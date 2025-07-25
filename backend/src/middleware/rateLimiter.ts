import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, RequestHandler } from 'express';
import { logger } from '@/utils/logger';
import { User } from '@/types';

// Extend Express Request interface
interface AuthenticatedRequest extends Request {
  user?: User;
}

// Security rate limits configuration
const SECURITY_CONFIG = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  },

  // AI processing rate limit (more restrictive)
  aiProcessing: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 AI requests per minute
    message:
      'Too many AI processing requests, please wait before trying again.',
  },

  // Authentication rate limit (very restrictive)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth attempts per windowMs
    message: 'Too many authentication attempts, please try again later.',
  },

  // Campaign creation rate limit
  campaignCreation: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // limit each IP to 3 campaign creations per 5 minutes
    message:
      'Too many campaign creation requests, please wait before creating another.',
  },
};

// Rate limit handler with logging
const rateLimitHandler = (req: Request): void => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  logger.warn('Rate limit exceeded', {
    ip: clientIp,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

// Create no-op middleware for testing
const createNoOpMiddleware = (): RequestHandler => {
  return (req, res, next) => next();
};

// General API rate limiter
export const generalRateLimit = process.env.NODE_ENV === 'test' 
  ? createNoOpMiddleware()
  : rateLimit({
    ...SECURITY_CONFIG.general,
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    handler: rateLimitHandler,
    skip: req => {
      // Skip rate limiting for health checks
      return req.path === '/api/health';
    },
  });

// AI processing rate limiter
export const aiProcessingRateLimit = process.env.NODE_ENV === 'test'
  ? createNoOpMiddleware()
  : rateLimit({
    ...SECURITY_CONFIG.aiProcessing,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    keyGenerator: req => {
      // Use user ID if authenticated, otherwise fall back to IP
      return (req as AuthenticatedRequest).user?.id || req.ip || 'anonymous';
    },
  });

// Authentication rate limiter
export const authRateLimit = process.env.NODE_ENV === 'test'
  ? createNoOpMiddleware()
  : rateLimit({
      ...SECURITY_CONFIG.auth,
      standardHeaders: true,
      legacyHeaders: false,
      handler: rateLimitHandler,
      skipSuccessfulRequests: true, // Don't count successful auth requests
    });

// Campaign creation rate limiter
export const campaignCreationRateLimit = process.env.NODE_ENV === 'test'
  ? createNoOpMiddleware()
  : rateLimit({
      ...SECURITY_CONFIG.campaignCreation,
      standardHeaders: true,
      legacyHeaders: false,
      handler: rateLimitHandler,
      keyGenerator: req => {
        // Use user ID if authenticated, otherwise fall back to IP
        return (req as AuthenticatedRequest).user?.id || req.ip || 'anonymous';
      },
    });

// Slow down middleware for gradual response delay
export const slowDownMiddleware: RequestHandler = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per windowMs without delay
  delayMs: () => 500, // add 500ms delay per request after delayAfter (updated for v2)
  maxDelayMs: 20000, // maximum delay of 20 seconds
  validate: { delayMs: false }, // disable warning message
});

// Combined security middleware
export const securityMiddleware: {
  general: RequestHandler;
  aiProcessing: RequestHandler;
  auth: RequestHandler;
  campaignCreation: RequestHandler;
  slowDown: RequestHandler;
} = {
  general: generalRateLimit as RequestHandler,
  aiProcessing: aiProcessingRateLimit as RequestHandler,
  auth: authRateLimit as RequestHandler,
  campaignCreation: campaignCreationRateLimit as RequestHandler,
  slowDown: slowDownMiddleware,
};

export default securityMiddleware;
