import jwt from 'jsonwebtoken';
import { logger } from './logger';

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion?: number;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Type-safe secret values
const VERIFIED_JWT_SECRET: string = JWT_SECRET;
const VERIFIED_JWT_REFRESH_SECRET: string = JWT_REFRESH_SECRET || JWT_SECRET;

// Token expiration times
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

/**
 * Generate access token
 */
export function generateAccessToken(userId: string, email: string): string {
  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    userId,
    email,
  };

  return jwt.sign(payload, VERIFIED_JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: 'ai-trpg-platform',
    audience: 'ai-trpg-users',
  });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(
  userId: string,
  tokenVersion?: number
): string {
  const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    userId,
    tokenVersion,
  };

  return jwt.sign(payload, VERIFIED_JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'ai-trpg-platform',
    audience: 'ai-trpg-refresh',
  });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(
  userId: string,
  email: string,
  tokenVersion?: number
): TokenPair {
  return {
    accessToken: generateAccessToken(userId, email),
    refreshToken: generateRefreshToken(userId, tokenVersion),
  };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, VERIFIED_JWT_SECRET, {
      issuer: 'ai-trpg-platform',
      audience: 'ai-trpg-users',
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    logger.debug('Access token verification failed:', error);

    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, VERIFIED_JWT_REFRESH_SECRET, {
      issuer: 'ai-trpg-platform',
      audience: 'ai-trpg-refresh',
    }) as RefreshTokenPayload;

    return decoded;
  } catch (error) {
    logger.debug('Refresh token verification failed:', error);

    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error('Refresh token verification failed');
    }
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
}

/**
 * Get token expiration timestamp
 */
export function getTokenExpiration(token: string): number | null {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    return decoded?.exp || null;
  } catch (error) {
    logger.debug('Failed to decode token for expiration:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const exp = getTokenExpiration(token);
  if (!exp) return true;

  return Date.now() >= exp * 1000;
}
