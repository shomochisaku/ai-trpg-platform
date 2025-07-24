import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyAccessToken, extractTokenFromHeader, TokenPayload } from '@/utils/jwt';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        displayName?: string;
      };
    }
  }
}

/**
 * Authentication middleware - verifies JWT token and attaches user to request
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'TOKEN_MISSING',
      });
      return;
    }

    // Verify the token
    let decoded: TokenPayload;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid token';
      res.status(401).json({
        success: false,
        error: message,
        code: 'TOKEN_INVALID',
      });
      return;
    }

    // Fetch user from database to ensure they still exist
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token is provided
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      next();
      return;
    }

    // Try to verify token, but don't fail if invalid
    try {
      const decoded = verifyAccessToken(token);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
        },
      });

      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Token is invalid, but we continue without user
      logger.debug('Optional auth failed:', error);
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next(); // Continue even if there's an error
  }
}

/**
 * Resource ownership middleware - ensures user owns the requested resource
 */
export function requireResourceOwnership(resourceIdParam: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        res.status(400).json({
          success: false,
          error: `${resourceIdParam} parameter is required`,
          code: 'PARAM_MISSING',
        });
        return;
      }

      // Check if user owns the campaign (the main resource in our app)
      const campaign = await prisma.gameSession.findFirst({
        where: {
          id: resourceId,
          createdBy: req.user.id,
        },
      });

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Resource not found or access denied',
          code: 'RESOURCE_NOT_FOUND',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Resource ownership middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization check failed',
        code: 'AUTH_CHECK_ERROR',
      });
    }
  };
}

/**
 * Admin role middleware - ensures user has admin privileges
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Check if user has admin role (would need to add role field to User schema)
    // For now, we'll use a simple email check or env variable
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    
    if (!adminEmails.includes(req.user.email)) {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed',
      code: 'AUTH_CHECK_ERROR',
    });
  }
}

/**
 * Rate limiting for failed login attempts
 */
interface LoginAttempt {
  count: number;
  lastAttempt: Date;
  lockedUntil?: Date;
}

const loginAttempts = new Map<string, LoginAttempt>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export function checkLoginAttempts(identifier: string): { allowed: boolean; lockoutTimeRemaining?: number } {
  const attempt = loginAttempts.get(identifier);
  
  if (!attempt) {
    return { allowed: true };
  }

  // Check if account is locked
  if (attempt.lockedUntil && attempt.lockedUntil > new Date()) {
    const timeRemaining = Math.ceil((attempt.lockedUntil.getTime() - Date.now()) / 1000);
    return { allowed: false, lockoutTimeRemaining: timeRemaining };
  }

  // If lockout has expired, reset
  if (attempt.lockedUntil && attempt.lockedUntil <= new Date()) {
    loginAttempts.delete(identifier);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(identifier: string): void {
  const now = new Date();
  const attempt = loginAttempts.get(identifier) || { count: 0, lastAttempt: now };
  
  // Reset count if last attempt was more than 15 minutes ago
  if (now.getTime() - attempt.lastAttempt.getTime() > LOCKOUT_DURATION) {
    attempt.count = 1;
  } else {
    attempt.count++;
  }
  
  attempt.lastAttempt = now;
  
  // Lock account if max attempts reached
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION);
  }
  
  loginAttempts.set(identifier, attempt);
  logger.warn(`Failed login attempt for ${identifier}. Count: ${attempt.count}`);
}

export function recordSuccessfulLogin(identifier: string): void {
  loginAttempts.delete(identifier);
}