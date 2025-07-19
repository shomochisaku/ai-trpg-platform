import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { aiService } from '../ai/aiService';
import { logger } from '../utils/logger';

const router = Router();

// Request schemas for validation
const createSessionSchema = z.object({
  playerId: z.string().min(1),
  playerName: z.string().min(1),
});

const chatMessageSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
});

const rollDiceSchema = z.object({
  dice: z.string().min(1),
  difficulty: z.number().optional(),
  advantage: z.boolean().optional(),
  disadvantage: z.boolean().optional(),
});

const updateStatusTagsSchema = z.object({
  entityId: z.string().min(1),
  tags: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      value: z.number().optional(),
      duration: z.number().optional(),
      type: z.enum(['buff', 'debuff', 'condition', 'injury', 'attribute']),
      action: z.enum(['add', 'update', 'remove']),
    })
  ),
});

const storeKnowledgeSchema = z.object({
  category: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()),
  relevance: z.number().min(0).max(1).optional(),
});

const getKnowledgeSchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional(),
});

// Middleware to check if AI service is initialized
const checkInitialized = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!aiService.isInitialized()) {
    return res.status(503).json({
      error: 'AI service not initialized',
      message:
        'The AI service is still starting up. Please try again in a moment.',
    });
  }
  next();
};

/**
 * AI service health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await aiService.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('AI health check error:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get AI service statistics
 */
router.get('/stats', checkInitialized, (req: Request, res: Response) => {
  try {
    const stats = aiService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting AI stats:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Create a new game session
 */
router.post(
  '/sessions',
  checkInitialized,
  async (req: Request, res: Response) => {
    try {
      const { playerId, playerName } = createSessionSchema.parse(req.body);

      const sessionId = await aiService.createGameSession(playerId, playerName);

      res.status(201).json({
        sessionId,
        playerId,
        playerName,
        message: 'Game session created successfully',
      });
    } catch (error) {
      logger.error('Error creating game session:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Failed to create game session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Send a message to the GM
 */
router.post('/chat', checkInitialized, async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = chatMessageSchema.parse(req.body);

    const response = await aiService.chatWithGM(sessionId, message);

    res.json({
      sessionId,
      playerMessage: message,
      gmResponse: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in GM chat:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Failed to process chat message',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get session information
 */
router.get(
  '/sessions/:sessionId',
  checkInitialized,
  (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          error: 'Session ID is required',
          message: 'Session ID parameter is missing',
        });
      }

      const session = aiService.getSession(sessionId);

      if (!session) {
        return res.status(404).json({
          error: 'Session not found',
          message: `Session ${sessionId} does not exist`,
        });
      }

      res.json(session);
    } catch (error) {
      logger.error('Error getting session:', error);
      res.status(500).json({
        error: 'Failed to get session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Get all sessions for a player
 */
router.get(
  '/players/:playerId/sessions',
  checkInitialized,
  (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;

      if (!playerId) {
        return res.status(400).json({
          error: 'Player ID is required',
          message: 'Player ID parameter is missing',
        });
      }

      const sessions = aiService.getPlayerSessions(playerId);

      res.json({
        playerId,
        sessions,
        count: sessions.length,
      });
    } catch (error) {
      logger.error('Error getting player sessions:', error);
      res.status(500).json({
        error: 'Failed to get player sessions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Delete a session
 */
router.delete(
  '/sessions/:sessionId',
  checkInitialized,
  (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          error: 'Session ID is required',
          message: 'Session ID parameter is missing',
        });
      }

      const deleted = aiService.deleteSession(sessionId);

      if (!deleted) {
        return res.status(404).json({
          error: 'Session not found',
          message: `Session ${sessionId} does not exist`,
        });
      }

      res.json({
        message: 'Session deleted successfully',
        sessionId,
      });
    } catch (error) {
      logger.error('Error deleting session:', error);
      res.status(500).json({
        error: 'Failed to delete session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Roll dice
 */
router.post(
  '/dice/roll',
  checkInitialized,
  async (req: Request, res: Response) => {
    try {
      const params = rollDiceSchema.parse(req.body);

      const result = await aiService.rollDice(params);

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error rolling dice:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid dice parameters',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Failed to roll dice',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Update status tags
 */
router.put(
  '/status-tags',
  checkInitialized,
  async (req: Request, res: Response) => {
    try {
      const params = updateStatusTagsSchema.parse(req.body);

      const tags = await aiService.updateStatusTags(params);

      res.json({
        entityId: params.entityId,
        tags,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating status tags:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid status tag parameters',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Failed to update status tags',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Get status tags for an entity
 */
router.get(
  '/status-tags/:entityId',
  checkInitialized,
  async (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;

      if (!entityId) {
        return res.status(400).json({
          error: 'Entity ID is required',
          message: 'Entity ID parameter is missing',
        });
      }

      const tags = await aiService.getStatusTags(entityId);

      res.json({
        entityId,
        tags,
        count: tags.length,
      });
    } catch (error) {
      logger.error('Error getting status tags:', error);
      res.status(500).json({
        error: 'Failed to get status tags',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Store knowledge entry
 */
router.post(
  '/knowledge',
  checkInitialized,
  async (req: Request, res: Response) => {
    try {
      const params = storeKnowledgeSchema.parse(req.body);

      const entry = await aiService.storeKnowledge(params);

      res.status(201).json(entry);
    } catch (error) {
      logger.error('Error storing knowledge:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid knowledge parameters',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Failed to store knowledge',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Get knowledge entries
 */
router.get(
  '/knowledge',
  checkInitialized,
  async (req: Request, res: Response) => {
    try {
      const params = getKnowledgeSchema.parse(req.query);

      const entries = await aiService.getKnowledge(params);

      res.json({
        entries,
        count: entries.length,
        query: params,
      });
    } catch (error) {
      logger.error('Error getting knowledge:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Failed to get knowledge',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export { router as aiRoutes };
