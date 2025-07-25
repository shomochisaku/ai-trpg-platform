import rateLimit from 'express-rate-limit';
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

  // Template read operations rate limit
  templateRead: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 template read requests per windowMs
    message: 'Too many template requests from this IP, please try again later.',
  },

  // Template write operations rate limit (more restrictive)
  templateWrite: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 template write operations per windowMs
    message:
      'Too many template write requests from this IP, please try again later.',
  },

  // Template search rate limit
  templateSearch: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // limit search requests to 30 per 5 minutes
    message:
      'Too many template search requests from this IP, please try again later.',
  },

  // Template usage recording rate limit
  templateUsage: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // limit usage recording to 50 per hour per IP
    message: 'Too many usage reports from this IP, please try again later.',
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
export const generalRateLimit =
  process.env.NODE_ENV === 'test'
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
export const aiProcessingRateLimit =
  process.env.NODE_ENV === 'test'
    ? createNoOpMiddleware()
    : rateLimit({
        ...SECURITY_CONFIG.aiProcessing,
        standardHeaders: true,
        legacyHeaders: false,
        handler: rateLimitHandler,
        keyGenerator: req => {
          // Use user ID if authenticated, otherwise fall back to IP
          return (
            (req as AuthenticatedRequest).user?.id || req.ip || 'anonymous'
          );
        },
      });

// Authentication rate limiter
export const authRateLimit =
  process.env.NODE_ENV === 'test'
    ? createNoOpMiddleware()
    : rateLimit({
        ...SECURITY_CONFIG.auth,
        standardHeaders: true,
        legacyHeaders: false,
        handler: rateLimitHandler,
        skipSuccessfulRequests: true, // Don't count successful auth requests
      });

// Campaign creation rate limiter
export const campaignCreationRateLimit =
  process.env.NODE_ENV === 'test'
    ? createNoOpMiddleware()
    : rateLimit({
        ...SECURITY_CONFIG.campaignCreation,
        standardHeaders: true,
        legacyHeaders: false,
        handler: rateLimitHandler,
        keyGenerator: req => {
          // Use user ID if authenticated, otherwise fall back to IP
          return (
            (req as AuthenticatedRequest).user?.id || req.ip || 'anonymous'
          );
        },
      });

// Template read operations rate limiter
export const templateReadRateLimit =
  process.env.NODE_ENV === 'test'
    ? createNoOpMiddleware()
    : rateLimit({
        ...SECURITY_CONFIG.templateRead,
        standardHeaders: true,
        legacyHeaders: false,
        handler: rateLimitHandler,
        skip: req => {
          // Skip rate limiting for health checks
          return req.path === '/api/health';
        },
      });

// Template write operations rate limiter
export const templateWriteRateLimit =
  process.env.NODE_ENV === 'test'
    ? createNoOpMiddleware()
    : rateLimit({
        ...SECURITY_CONFIG.templateWrite,
        standardHeaders: true,
        legacyHeaders: false,
        handler: rateLimitHandler,
        keyGenerator: req => {
          // Use user ID if authenticated, otherwise fall back to IP
          return (
            (req as AuthenticatedRequest).user?.id || req.ip || 'anonymous'
          );
        },
      });

// Template search rate limiter
export const templateSearchRateLimit =
  process.env.NODE_ENV === 'test'
    ? createNoOpMiddleware()
    : rateLimit({
        ...SECURITY_CONFIG.templateSearch,
        standardHeaders: true,
        legacyHeaders: false,
        handler: rateLimitHandler,
      });

// Template usage recording rate limiter
export const templateUsageRateLimit =
  process.env.NODE_ENV === 'test'
    ? createNoOpMiddleware()
    : rateLimit({
        ...SECURITY_CONFIG.templateUsage,
        standardHeaders: true,
        legacyHeaders: false,
        handler: rateLimitHandler,
        keyGenerator: req => {
          // Use user ID if authenticated, otherwise fall back to IP
          return (
            (req as AuthenticatedRequest).user?.id || req.ip || 'anonymous'
          );
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
  templateRead: RequestHandler;
  templateWrite: RequestHandler;
  templateSearch: RequestHandler;
  templateUsage: RequestHandler;
  slowDown: RequestHandler;
} = {
  general: generalRateLimit as RequestHandler,
  aiProcessing: aiProcessingRateLimit as RequestHandler,
  auth: authRateLimit as RequestHandler,
  campaignCreation: campaignCreationRateLimit as RequestHandler,
  templateRead: templateReadRateLimit as RequestHandler,
  templateWrite: templateWriteRateLimit as RequestHandler,
  templateSearch: templateSearchRateLimit as RequestHandler,
  templateUsage: templateUsageRateLimit as RequestHandler,
  slowDown: slowDownMiddleware,
};

export default securityMiddleware;
