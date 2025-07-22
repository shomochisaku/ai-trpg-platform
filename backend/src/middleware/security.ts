import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '@/utils/logger';

// Rate limiting configuration
export const createRateLimit = (windowMs?: number, max?: number) => {
  const windowMsValue = windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes default
  const maxValue = max || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'); // 100 requests default
  
  return rateLimit({
    windowMs: windowMsValue,
    max: maxValue,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMsValue / 1000 / 60) // minutes
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(windowMsValue / 1000 / 60)
      });
    }
  });
};

// Stricter rate limiting for auth endpoints
export const authRateLimit = createRateLimit(900000, 10); // 10 requests per 15 minutes

// General API rate limiting
export const apiRateLimit = createRateLimit();

// CORS configuration
export const getCorsOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    process.env.FRONTEND_URL || 'http://localhost:5173'
  ];

  return {
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      if (!isProduction) {
        // In development, allow localhost origins
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
      }
      
      logger.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: process.env.CORS_CREDENTIALS === 'true',
    optionsSuccessStatus: 200
  };
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// Trust proxy configuration
export const configureTrustProxy = (app: any) => {
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', parseInt(process.env.TRUST_PROXY));
  }
};