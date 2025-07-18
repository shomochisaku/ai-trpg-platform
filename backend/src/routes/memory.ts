import express from 'express';
import { z } from 'zod';
import { memoryService, conversationHistoryManager } from '../services/memory';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

const router = express.Router();

// Request validation schemas
const StoreMemorySchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  content: z.string().min(1),
  category: z.enum([
    'GENERAL',
    'CHARACTER',
    'LOCATION',
    'EVENT',
    'RULE',
    'PREFERENCE',
    'STORY_BEAT',
  ]),
  importance: z.number().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
});

const SearchMemoriesSchema = z.object({
  query: z.string().min(1),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  category: z
    .enum([
      'GENERAL',
      'CHARACTER',
      'LOCATION',
      'EVENT',
      'RULE',
      'PREFERENCE',
      'STORY_BEAT',
    ])
    .optional(),
  limit: z.number().min(1).max(50).optional(),
  minImportance: z.number().min(1).max(10).optional(),
});

const GetMemoryContextSchema = z.object({
  sessionId: z.string(),
  query: z.string().optional(),
  categories: z.array(z.string()).optional(),
  limit: z.number().min(1).max(20).optional(),
});

const ProcessMessagesSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1),
      timestamp: z.string().datetime(),
    })
  ),
});

// Schema for conversation history requests (for future use)
// const ConversationHistorySchema = z.object({
//   sessionId: z.string(),
//   limit: z.number().min(1).max(100).optional(),
//   offset: z.number().min(0).optional(),
//   startDate: z.string().datetime().optional(),
//   endDate: z.string().datetime().optional(),
// });

const AddMessagesSchema = z.object({
  sessionId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1),
      timestamp: z.string().datetime(),
      userId: z.string().optional(),
    })
  ),
});

const SearchConversationSchema = z.object({
  sessionId: z.string(),
  query: z.string().min(1),
  limit: z.number().min(1).max(20).optional(),
  contextSize: z.number().min(1).max(10).optional(),
});

const UpdateImportanceSchema = z.object({
  importance: z.number().min(1).max(10),
});

// Schema for cleanup memories requests (for future use)
// const CleanupMemoriesSchema = z.object({
//   sessionId: z.string(),
//   keepCount: z.number().min(10).max(1000).optional(),
//   minImportance: z.number().min(1).max(10).optional(),
// });

// Helper function to handle API responses
const handleResponse = <T>(res: express.Response, data: T): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  res.json(response);
};

const handleError = (
  res: express.Response,
  error: any,
  message = 'Internal server error'
): void => {
  logger.error(message, error);
  const response: ApiResponse = {
    success: false,
    error: {
      message: error instanceof Error ? error.message : message,
      code: 'INTERNAL_ERROR',
    },
  };
  res.status(500).json(response);
};

// Memory Management Endpoints

/**
 * Store a new memory entry
 */
router.post('/memories', async (req, res) => {
  try {
    const validatedData = StoreMemorySchema.parse(req.body);
    const result = await memoryService.storeMemory(validatedData);
    handleResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
        },
      });
    } else {
      handleError(res, error, 'Error storing memory');
    }
  }
});

/**
 * Search memories using semantic search
 */
router.post('/memories/search', async (req, res) => {
  try {
    const validatedData = SearchMemoriesSchema.parse(req.body);
    const results = await memoryService.searchMemories(validatedData);
    handleResponse(res, results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
        },
      });
    } else {
      handleError(res, error, 'Error searching memories');
    }
  }
});

/**
 * Get memories by session and category
 */
router.get('/memories/:sessionId/type/:category', async (req, res) => {
  try {
    const { sessionId, category } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const results = await memoryService.getMemoriesByCategory({
      sessionId,
      category,
      limit,
    });

    handleResponse(res, results);
  } catch (error) {
    handleError(res, error, 'Error retrieving memories by category');
  }
});

/**
 * Get comprehensive memory context for AI
 */
router.post('/memory-context', async (req, res) => {
  try {
    const validatedData = GetMemoryContextSchema.parse(req.body);
    const context = await memoryService.getMemoryContext(validatedData);
    handleResponse(res, context);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
        },
      });
    } else {
      handleError(res, error, 'Error getting memory context');
    }
  }
});

/**
 * Process conversation messages into memories
 */
router.post('/process-messages', async (req, res) => {
  try {
    const validatedData = ProcessMessagesSchema.parse(req.body);
    const messages = validatedData.messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));

    const memoriesCreated = await memoryService.processConversationIntoMemories(
      {
        sessionId: validatedData.sessionId,
        userId: validatedData.userId,
        messages,
      }
    );

    handleResponse(res, { memoriesCreated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
        },
      });
    } else {
      handleError(res, error, 'Error processing messages into memories');
    }
  }
});

/**
 * Update memory importance
 */
router.patch('/memories/:memoryId/importance', async (req, res) => {
  try {
    const { memoryId } = req.params;
    const validatedData = UpdateImportanceSchema.parse(req.body);

    await memoryService.updateMemoryImportance(
      memoryId,
      validatedData.importance
    );
    handleResponse(res, { success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
        },
      });
    } else {
      handleError(res, error, 'Error updating memory importance');
    }
  }
});

/**
 * Get memory statistics
 */
router.get('/stats/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const stats = await memoryService.getMemoryStats(sessionId);
    handleResponse(res, stats);
  } catch (error) {
    handleError(res, error, 'Error getting memory statistics');
  }
});

/**
 * Clean up old memories
 */
router.delete('/cleanup/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const keepCount = req.query.keepCount
      ? parseInt(req.query.keepCount as string)
      : 100;
    const minImportance = req.query.minImportance
      ? parseInt(req.query.minImportance as string)
      : 5;

    const cleanedCount = await memoryService.cleanupMemories({
      sessionId,
      keepCount,
      minImportance,
    });

    handleResponse(res, { cleanedCount });
  } catch (error) {
    handleError(res, error, 'Error cleaning up memories');
  }
});

// Conversation History Management Endpoints

/**
 * Add messages to conversation history
 */
router.post('/conversation-history', async (req, res) => {
  try {
    const validatedData = AddMessagesSchema.parse(req.body);
    const messages = validatedData.messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));

    await conversationHistoryManager.addMessages(
      validatedData.sessionId,
      messages
    );
    handleResponse(res, { success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
        },
      });
    } else {
      handleError(res, error, 'Error adding messages to conversation history');
    }
  }
});

/**
 * Get conversation history
 */
router.get('/conversation-history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const history = await conversationHistoryManager.getConversationHistory({
      sessionId,
      limit,
      offset,
      startDate,
      endDate,
    });

    handleResponse(res, history);
  } catch (error) {
    handleError(res, error, 'Error retrieving conversation history');
  }
});

/**
 * Get conversation summary
 */
router.get('/conversation-summary/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;
    const maxMessages = req.query.maxMessages
      ? parseInt(req.query.maxMessages as string)
      : 100;

    const summary = await conversationHistoryManager.getConversationSummary({
      sessionId,
      startDate,
      endDate,
      maxMessages,
    });

    handleResponse(res, summary);
  } catch (error) {
    handleError(res, error, 'Error getting conversation summary');
  }
});

/**
 * Search conversation history
 */
router.post('/conversation-search', async (req, res) => {
  try {
    const validatedData = SearchConversationSchema.parse(req.body);
    const results =
      await conversationHistoryManager.searchConversationHistory(validatedData);
    handleResponse(res, results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
        },
      });
    } else {
      handleError(res, error, 'Error searching conversation history');
    }
  }
});

/**
 * Get conversation statistics
 */
router.get('/conversation-stats/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const stats =
      await conversationHistoryManager.getConversationStats(sessionId);
    handleResponse(res, stats);
  } catch (error) {
    handleError(res, error, 'Error getting conversation statistics');
  }
});

/**
 * Clean up old conversation data
 */
router.delete('/conversation-cleanup/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const keepDays = req.query.keepDays
      ? parseInt(req.query.keepDays as string)
      : 30;
    const keepCount = req.query.keepCount
      ? parseInt(req.query.keepCount as string)
      : 500;

    const cleanedCount =
      await conversationHistoryManager.cleanupOldConversations({
        sessionId,
        keepDays,
        keepCount,
      });

    handleResponse(res, { cleanedCount });
  } catch (error) {
    handleError(res, error, 'Error cleaning up conversation history');
  }
});

/**
 * Health check for memory services
 */
router.get('/health', async (req, res) => {
  try {
    const memoryHealth = await memoryService.healthCheck();

    const overallHealth = {
      status: memoryHealth.status,
      services: {
        memory: memoryHealth,
        conversationHistory: { status: 'healthy' }, // ConversationHistoryManager doesn't have health check
      },
      timestamp: new Date().toISOString(),
    };

    handleResponse(res, overallHealth);
  } catch (error) {
    handleError(res, error, 'Error checking memory services health');
  }
});

export default router;
