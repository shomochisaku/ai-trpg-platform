import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '@/utils/logger';
import { generateTokenPair, verifyRefreshToken } from '@/utils/jwt';
import { 
  validateInput, 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema,
  isDisposableEmail 
} from '@/utils/validation';
import { 
  authenticate, 
  checkLoginAttempts, 
  recordFailedLogin, 
  recordSuccessfulLogin 
} from '@/middleware/auth';
import { authRateLimit } from '@/middleware/rateLimiter';

const router = Router();
const prisma = new PrismaClient();

/**
 * @route POST /api/auth/register
 * @desc Register new user
 */
router.post('/register', authRateLimit, async (req: Request, res: Response) => {
  try {
    // Validate input
    const { email, password, username, displayName } = validateInput(registerSchema, req.body);

    // Check for disposable email
    if (isDisposableEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Disposable email addresses are not allowed',
        code: 'DISPOSABLE_EMAIL',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(username ? [{ username }] : []),
        ],
      },
    });

    if (existingUser) {
      const conflictField = existingUser.email === email ? 'email' : 'username';
      return res.status(409).json({
        success: false,
        error: `User with this ${conflictField} already exists`,
        code: 'USER_EXISTS',
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate username if not provided
    const finalUsername = username || `user_${Date.now()}`;

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username: finalUsername,
        displayName,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = generateTokenPair(newUser.id, newUser.email);

    // Store refresh token in database
    await prisma.user.update({
      where: { id: newUser.id },
      data: { refreshToken: tokens.refreshToken },
    });

    logger.info(`New user registered: ${newUser.email}`);

    res.status(201).json({
      success: true,
      data: {
        user: newUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    if ((error as any).validationErrors) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: (error as any).validationErrors,
        code: 'VALIDATION_ERROR',
      });
    }

    logger.error('Registration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR',
    });
  }
});

/**
 * @route POST /api/auth/login
 * @desc User login
 */
router.post('/login', authRateLimit, async (req: Request, res: Response) => {
  try {
    // Validate input
    const { email, password } = validateInput(loginSchema, req.body);

    // Check login attempts
    const loginCheck = checkLoginAttempts(email);
    if (!loginCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Account temporarily locked due to too many failed login attempts',
        lockoutTimeRemaining: loginCheck.lockoutTimeRemaining,
        code: 'ACCOUNT_LOCKED',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        password: true,
        createdAt: true,
      },
    });

    if (!user) {
      recordFailedLogin(email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      recordFailedLogin(email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Generate tokens
    const tokens = generateTokenPair(user.id, user.email);

    // Store refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    // Record successful login
    recordSuccessfulLogin(email);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    if ((error as any).validationErrors) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: (error as any).validationErrors,
        code: 'VALIDATION_ERROR',
      });
    }

    logger.error('Login failed:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'LOGIN_ERROR',
    });
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 */
router.post('/refresh', authRateLimit, async (req: Request, res: Response) => {
  try {
    // Validate input
    const { refreshToken } = validateInput(refreshTokenSchema, req.body);

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and verify refresh token
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        refreshToken,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    // Generate new tokens
    const tokens = generateTokenPair(user.id, user.email);

    // Update refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    res.json({
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    if ((error as any).validationErrors) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: (error as any).validationErrors,
        code: 'VALIDATION_ERROR',
      });
    }

    logger.error('Token refresh failed:', error);
    res.status(401).json({
      success: false,
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR',
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user info
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Fetch fresh user data
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Failed to get user info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
      code: 'GET_USER_ERROR',
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc User logout
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Remove refresh token from database
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });

    logger.info(`User logged out: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout failed:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_ERROR',
    });
  }
});

export { router as authRoutes };
