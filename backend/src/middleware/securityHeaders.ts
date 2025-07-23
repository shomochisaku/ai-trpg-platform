import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

// Environment-specific security configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// Enhanced helmet configuration
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: [
        "'self'",
        frontendUrl,
        // Allow AI API connections (needed for backend)
        'https://api.openai.com',
        'https://api.anthropic.com',
        // WebSocket connections
        isDevelopment ? 'ws://localhost:*' : "'self'",
      ],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
    reportOnly: isDevelopment, // Only report in development, enforce in production
  },

  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // CSRF protection via same-origin policy
  crossOriginEmbedderPolicy: false, // Allow embedding for development tools
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // DNS prefetch control
  dnsPrefetchControl: { allow: false },

  // Frame options
  frameguard: { action: 'deny' },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // MIME type sniffing prevention
  noSniff: true,

  // Referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // XSS filtering
  xssFilter: true,
});

// Additional security headers middleware
export const additionalSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Permissions Policy (Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Prevent MIME type confusion
  res.setHeader('X-Download-Options', 'noopen');

  // Disable client-side caching for sensitive endpoints
  if (req.path.includes('/api/auth') || req.path.includes('/api/campaigns')) {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Log security header application
  if (isDevelopment) {
    logger.debug('Security headers applied', {
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent')?.substring(0, 100),
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

// CORS security enhancements
export const enhancedCorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ): void => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      frontendUrl,
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173', // Vite preview
    ];

    // In production, be more restrictive
    if (!isDevelopment) {
      const productionOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        frontendUrl,
      ];
      allowedOrigins.length = 0;
      allowedOrigins.push(...productionOrigins);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from unauthorized origin', {
        origin,
        allowedOrigins,
        timestamp: new Date().toISOString(),
      });
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  maxAge: 86400, // Cache preflight response for 24 hours
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
};

// Security audit middleware
export const securityAudit = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log potentially suspicious requests
  const suspiciousPatterns = [
    // Common attack patterns
    /\.\./, // Directory traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript protocol
    /vbscript:/i, // VBScript protocol
  ];

  const requestString = JSON.stringify({
    url: req.url,
    query: req.query,
    body: req.body,
    headers: req.headers,
  });

  const isSuspicious = suspiciousPatterns.some(pattern =>
    pattern.test(requestString)
  );

  if (isSuspicious) {
    logger.error('Suspicious request detected', {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      body: req.body,
      query: req.query,
      timestamp: new Date().toISOString(),
    });

    // You might want to implement additional actions here like:
    // - Blocking the IP temporarily
    // - Increasing rate limits for this IP
    // - Sending alerts to administrators
  }

  next();
};

export const securityMiddleware = {
  headers: securityHeaders,
  additional: additionalSecurityHeaders,
  corsOptions: enhancedCorsOptions,
  audit: securityAudit,
};

export default securityMiddleware;
