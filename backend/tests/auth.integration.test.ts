import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import { authRoutes } from '@/routes/auth';
import { campaignRoutes } from '@/routes/campaigns';
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
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((data) => {
        existingEmails.add(data.data.email);
        userExists = true;
        return Promise.resolve({ ...mockUser, ...data.data });
      }),
      update: jest.fn().mockResolvedValue({ ...mockUser, refreshToken: 'mock-refresh-token' }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.email && existingEmails.has(where.email)) {
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

// Set required environment variables for auth
process.env.JWT_SECRET = 'test-jwt-secret-key-for-auth-integration-tests';
process.env.BCRYPT_ROUNDS = '10';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);

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
    it('should successfully logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should invalidate refresh token after logout', async () => {
      const refreshData = {
        refreshToken: testUser.refreshToken
      };

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Campaign Authentication Integration', () => {
    let newAccessToken: string;

    beforeAll(async () => {
      // Login again to get fresh tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123'
        });
      
      newAccessToken = loginResponse.body.data.accessToken;
    });

    it('should require authentication for campaign creation', async () => {
      const campaignData = {
        name: 'Test Campaign',
        description: 'A test campaign'
      };

      const response = await request(app)
        .post('/api/campaigns')
        .send(campaignData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should allow authenticated user to create campaign', async () => {
      const campaignData = {
        name: 'Test Authenticated Campaign',
        description: 'A test campaign with auth'
      };

      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send(campaignData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(campaignData.name);
    });

    it('should require authentication for campaign listing', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should allow authenticated user to list their campaigns', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});