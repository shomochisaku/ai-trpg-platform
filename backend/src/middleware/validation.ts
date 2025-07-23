import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

// Sanitization and validation utilities
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: any[],
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Generic validation result handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array();
    
    logger.warn('Input validation failed', {
      path: req.path,
      method: req.method,
      errors: errorDetails,
      body: req.body,
      query: req.query,
      params: req.params,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorDetails.map(error => ({
        field: error.type === 'field' ? (error as any).path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? (error as any).value : undefined
      })),
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next();
};

// Common validation patterns
const patterns = {
  // UUID validation
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // Alphanumeric with spaces (for titles, names)
  alphanumericWithSpaces: /^[a-zA-Z0-9\s\-_.,'!?()[\]]+$/,
  
  // Safe HTML (basic markdown-like formatting)
  safeHtml: /^[a-zA-Z0-9\s\-_.,'!?()[\]*\n\r#@]+$/,
  
  // Username (alphanumeric, underscore, hyphen)
  username: /^[a-zA-Z0-9_-]+$/,
  
  // Email validation (basic)
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

// Campaign validation schemas
export const campaignValidation = {
  create: [
    body('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .matches(patterns.uuid)
      .withMessage('User ID must be a valid UUID'),
    
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be between 1 and 100 characters')
      .matches(patterns.alphanumericWithSpaces)
      .withMessage('Title contains invalid characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    
    body('settings')
      .isObject()
      .withMessage('Settings must be an object'),
    
    body('settings.gmProfile')
      .isObject()
      .withMessage('GM Profile must be an object'),
    
    body('settings.gmProfile.personality')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Personality must be between 1 and 200 characters')
      .matches(patterns.safeHtml)
      .withMessage('Personality contains invalid characters'),
    
    body('settings.worldSettings')
      .isObject()
      .withMessage('World Settings must be an object'),
    
    body('settings.opening')
      .isObject()
      .withMessage('Opening must be object'),
      
    handleValidationErrors
  ],

  get: [
    param('campaignId')
      .matches(patterns.uuid)
      .withMessage('Campaign ID must be a valid UUID'),
    handleValidationErrors
  ],

  update: [
    param('campaignId')
      .matches(patterns.uuid)
      .withMessage('Campaign ID must be a valid UUID'),
    
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be between 1 and 100 characters')
      .matches(patterns.alphanumericWithSpaces)
      .withMessage('Title contains invalid characters'),
    
    handleValidationErrors
  ],

  delete: [
    param('campaignId')
      .matches(patterns.uuid)
      .withMessage('Campaign ID must be a valid UUID'),
    handleValidationErrors
  ]
};

// Player action validation
export const actionValidation = {
  process: [
    param('campaignId')
      .matches(patterns.uuid)
      .withMessage('Campaign ID must be a valid UUID'),
    
    body('action')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Action must be between 1 and 1000 characters')
      .matches(patterns.safeHtml)
      .withMessage('Action contains invalid characters'),
    
    body('playerId')
      .matches(patterns.uuid)
      .withMessage('Player ID must be a valid UUID'),
    
    handleValidationErrors
  ]
};

// Authentication validation
export const authValidation = {
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(patterns.username)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    
    body('email')
      .trim()
      .normalizeEmail()
      .matches(patterns.email)
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    
    handleValidationErrors
  ],

  login: [
    body('email')
      .trim()
      .normalizeEmail()
      .matches(patterns.email)
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    
    handleValidationErrors
  ]
};

// Query parameter validation
export const queryValidation = {
  pagination: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
      
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
      
    handleValidationErrors
  ]
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Recursively sanitize strings in request body
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove potential script injections
      return obj
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/onload/gi, '')
        .replace(/onerror/gi, '')
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Content-Length validation (prevent large payloads)
export const validateContentLength = (maxSize: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      logger.warn('Request payload too large', {
        contentLength,
        maxSize,
        path: req.path,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      res.status(413).json({
        success: false,
        error: 'Request payload too large',
        maxSize: `${Math.floor(maxSize / 1024)} KB`,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    next();
  };
};

export const validation = {
  campaign: campaignValidation,
  action: actionValidation,
  auth: authValidation,
  query: queryValidation,
  sanitize: sanitizeInput,
  contentLength: validateContentLength,
  handleErrors: handleValidationErrors,
};

export default validation;