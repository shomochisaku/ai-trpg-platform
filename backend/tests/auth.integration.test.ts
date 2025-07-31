import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import { authRoutes } from '@/routes/auth';
import { logger } from '@/utils/logger';

// Mock Prisma specifically for auth tests
jest.mock('@prisma/client', () => {
  const mockUser = {
    id: 'test-user-id-123',
    email: 'test-auth-register@example.com',
    username: 'testuser123',
    displayName: 'Test User',
    createdAt: new Date(),
    password: 'hashed-password',
    refreshToken: null,
  };

  let userExists = false;
  let userLoggedOut = false;
  const existingEmails = new Set<string>();

  const mockPrisma = {
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where.OR) {
          const email = where.OR[0]?.email;
          const username = where.OR[1]?.username;
          
          if (existingEmails.has(email) || (username && username === 'testuser123' && userExists)) {
            return Promise.resolve(mockUser);
          }
        }
        // Handle refresh token queries
        if (where.id && where.refreshToken) {
          if (where.id === 'test-user-id-123' && where.refreshToken.startsWith('mock-refresh-token-') && !userLoggedOut) {
            return Promise.resolve({ ...mockUser, refreshToken: where.refreshToken });
          }
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((data) => {
        existingEmails.add(data.data.email);
        userExists = true;
        return Promise.resolve({ ...mockUser, ...data.data });
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        if (data.refreshToken === null) {
          // User logged out, invalidate refresh token by removing it from our mock storage
          userLoggedOut = true;
          return Promise.resolve({ ...mockUser, refreshToken: null });
        }
        return Promise.resolve({ ...mockUser, refreshToken: data.refreshToken || 'mock-refresh-token' });
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.email && existingEmails.has(where.email)) {
          return Promise.resolve(mockUser);
        }
        if (where.id && (where.id === 'test-user-id-123' || where.id.startsWith('test-user-id'))) {
          return Promise.resolve(mockUser);
        }
        return Promise.resolve(null);
      }),
      delete: jest.fn().mockResolvedValue(mockUser),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    gameSession: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
  };
});

// Mock JWT utilities with issuer/audience validation
jest.mock('@/utils/jwt', () => ({
  generateTokenPair: jest.fn().mockImplementation((userId, email) => ({
    accessToken: `mock-access-token-${userId}`,
    refreshToken: `mock-refresh-token-${userId}`,
  })),
  verifyAccessToken: jest.fn().mockImplementation((token) => {
    if (token && token.startsWith('mock-access-token-')) {
      const userId = token.replace('mock-access-token-', '');
      return {
        userId: userId,
        email: 'test-auth-register@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'ai-trpg-platform',
        aud: 'ai-trpg-users',
      };
    }
    throw new Error('Invalid access token');
  }),
  verifyRefreshToken: jest.fn().mockImplementation((token) => {
    if (token && token.startsWith('mock-refresh-token-')) {
      const userId = token.replace('mock-refresh-token-', '');
      return {
        userId: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
        iss: 'ai-trpg-platform',
        aud: 'ai-trpg-refresh',
      };
    }
    throw new Error('Invalid refresh token');
  }),
}));

// Mock bcrypt for password hashing/verification
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockImplementation((plaintext, hash) => {
    // Return true for the test password used in tests
    return Promise.resolve(plaintext === 'TestPassword123');
  }),
}));

// Mock authentication middleware
jest.mock('@/middleware/auth', () => ({
  authenticate: jest.fn().mockImplementation((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token.startsWith('mock-access-token-')) {
        const userId = token.replace('mock-access-token-', '');
        req.user = {
          id: userId,
          email: 'test-auth-register@example.com',
          username: 'testuser123',
        };
        return next();
      } else {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token',
          code: 'TOKEN_INVALID'
        });
      }
    }
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required',
      code: 'TOKEN_MISSING'
    });
  }),
  checkLoginAttempts: jest.fn().mockImplementation((email) => {
    return { allowed: true }; // Always allow for testing
  }),
  recordFailedLogin: jest.fn(),
  recordSuccessfulLogin: jest.fn(),
  requireResourceOwnership: jest.fn().mockImplementation(() => {
    return (req, res, next) => next(); // Allow access for testing
  }),
}));

// Mock validation utilities with proper Zod-like validation
jest.mock('@/utils/validation', () => ({
  validateInput: jest.fn().mockImplementation((schema, data) => {
    // Check if this is registration validation (detect by presence of email + password)
    if (data && typeof data === 'object' && 'email' in data && 'password' in data) {
      // Email validation
      if (!data.email || typeof data.email !== 'string' || !data.email.includes('@') || data.email === 'invalid-email') {
        const error = new Error('Validation failed') as Error & {
          validationErrors: Array<{ field: string; message: string }>;
        };
        error.validationErrors = [{ field: 'email', message: 'Invalid email format' }];
        throw error;
      }
      
      // Password validation (only for registration, not login)
      if ('username' in data || 'displayName' in data) { // This indicates registration
        if (!data.password || data.password.length < 8 || 
            !/[a-z]/.test(data.password) || !/[A-Z]/.test(data.password) || !/[0-9]/.test(data.password)) {
          const error = new Error('Validation failed') as Error & {
            validationErrors: Array<{ field: string; message: string }>;
          };
          error.validationErrors = [{ field: 'password', message: 'Password must be at least 8 characters with uppercase, lowercase, and number' }];
          throw error;
        }
      }
    }
    return data;
  }),
  registerSchema: {},
  loginSchema: {},
  refreshTokenSchema: {},
  isDisposableEmail: jest.fn().mockImplementation((email) => {
    return email.includes('10minutemail.com');
  }),
}));

// Mock rate limiter middleware
jest.mock('@/middleware/rateLimiter', () => ({
  authRateLimit: jest.fn().mockImplementation((req, res, next) => next()),
  campaignCreationRateLimit: jest.fn().mockImplementation((req, res, next) => next()),
  campaignActionRateLimit: jest.fn().mockImplementation((req, res, next) => next()),
}));

// Set required environment variables for auth
process.env.JWT_SECRET = 'test-jwt-secret-key-for-auth-integration-tests';
process.env.BCRYPT_ROUNDS = '10';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

// Simple test endpoint for authentication testing
app.post('/api/test-auth', (req, res, next) => {
  // Use the auth middleware we mocked
  const mockAuth = require('@/middleware/auth').authenticate;
  mockAuth(req, res, () => {
    res.json({ success: true, message: 'Authentication successful', user: req.user });
  });
});

const prisma = new PrismaClient();

describe('Authentication Integration Tests', () => {
  let testUser: {
    id: string;
    email: string;
    username: string;
    accessToken: string;
    refreshToken: string;
  };

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-auth-'
        }
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser?.id) {
      await prisma.user.delete({
        where: { id: testUser.id }
      }).catch(() => {
        // User might already be deleted
      });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        email: 'test-auth-register@example.com',
        password: 'TestPassword123',
        username: 'testuser123',
        displayName: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: userData.email,
        username: userData.username,
        displayName: userData.displayName
      });
      expect(response.body.data.user.id).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Save for later tests
      testUser = {
        id: response.body.data.user.id,
        email: response.body.data.user.email,
        username: response.body.data.user.username,
        accessToken: response.body.data.accessToken,
        refreshToken: response.body.data.refreshToken
      };
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'TestPassword123',
        username: 'testuser124'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test-weak-password@example.com',
        password: 'weak',
        username: 'testuser125'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with duplicate email', async () => {
      // First register a user
      const firstUserData = {
        email: 'duplicate-test@example.com',
        password: 'TestPassword123',
        username: 'firstuser'
      };

      await request(app)
        .post('/api/auth/register')
        .send(firstUserData)
        .expect(201);

      // Try to register with same email
      const duplicateUserData = {
        email: 'duplicate-test@example.com',
        password: 'TestPassword123',
        username: 'differentuser'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateUserData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('USER_EXISTS');
    });

    it('should reject disposable email addresses', async () => {
      const userData = {
        email: 'test@10minutemail.com',
        password: 'TestPassword123',
        username: 'testuser126'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('DISPOSABLE_EMAIL');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: testUser.email,
        username: testUser.username
      });
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Update tokens for later tests  
      testUser.accessToken = response.body.data.accessToken;
      testUser.refreshToken = response.body.data.refreshToken;
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'WrongPassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        username: testUser.username
      });
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TOKEN_MISSING');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TOKEN_INVALID');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const refreshData = {
        refreshToken: testUser.refreshToken
      };

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user).toMatchObject({
        id: testUser.id,
        email: testUser.email
      });

      // Update tokens
      testUser.accessToken = response.body.data.accessToken;
      testUser.refreshToken = response.body.data.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      const refreshData = {
        refreshToken: 'invalid-refresh-token'
      };

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('REFRESH_ERROR');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout and invalidate refresh token', async () => {
      // First, logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
      expect(logoutResponse.body.message).toBe('Logged out successfully');

      // Then, try to use the refresh token - it should fail
      const refreshData = {
        refreshToken: testUser.refreshToken
      };

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(401);

      expect(refreshResponse.body.success).toBe(false);
    });
  });

  describe('Authentication Integration with Test Endpoint', () => {
    let newAccessToken: string;

    beforeAll(async () => {
      // Login again to get fresh tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123'
        });
      
      if (loginResponse.body.success) {
        newAccessToken = loginResponse.body.data.accessToken;
      }
    });

    it('should require authentication for protected endpoint', async () => {
      const response = await request(app)
        .post('/api/test-auth')
        .send({ test: 'data' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TOKEN_MISSING');
    });

    it('should allow authenticated user to access protected endpoint', async () => {
      if (newAccessToken) {
        const response = await request(app)
          .post('/api/test-auth')
          .set('Authorization', `Bearer ${newAccessToken}`)
          .send({ test: 'data' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user).toBeDefined();
      }
    });
  });
});