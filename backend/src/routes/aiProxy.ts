import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { aiProxyService, OpenAIRequest, AnthropicRequest } from '@/services/aiProxyService';
import { logger } from '@/utils/logger';
import { requireApiKey } from '@/middleware/apiKeyManager';

const router = Router();

// Request validation schemas
const openaiRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1).max(50000) // 50KB limit per message
  })).min(1).max(50), // Max 50 messages
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(4000).optional(),
  stream: z.boolean().optional()
});

const anthropicRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(50000) // 50KB limit per message
  })).min(1).max(50), // Max 50 messages
  max_tokens: z.number().min(1).max(4000),
  temperature: z.number().min(0).max(1).optional(),
  system: z.string().max(10000).optional() // 10KB limit for system prompt
});

// Security middleware to ensure only backend can access these routes
const validateInternalAccess = (req: Request, res: Response, next: Function): void => {
  // Check for internal service header (set by our own backend)
  const internalHeader = req.headers['x-internal-service'];
  if (internalHeader !== 'ai-trpg-backend') {
    logger.warn('Unauthorized AI proxy access attempt', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path
    });
    
    res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'This endpoint is for internal service use only'
    });
    return;
  }
  
  next();
};

/**
 * AI Proxy health check
 */
router.get('/health', (req: Request, res: Response) => {
  try {
    const health = aiProxyService.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('AI proxy health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get AI proxy statistics (admin only)
 */
router.get('/stats', validateInternalAccess, (req: Request, res: Response) => {
  try {
    const stats = aiProxyService.getStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting AI proxy stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Proxy OpenAI API requests
 */
router.post('/openai', 
  validateInternalAccess,
  requireApiKey('OPENAI_API_KEY'),
  async (req: Request, res: Response) => {
    try {
      const requestData = openaiRequestSchema.parse(req.body);
      
      logger.info('Processing OpenAI proxy request', {
        model: requestData.model,
        messageCount: requestData.messages.length,
        ip: req.ip
      });

      const response = await aiProxyService.proxyOpenAI(requestData as OpenAIRequest);
      
      if (response.success) {
        res.json(response);
      } else {
        res.status(500).json(response);
      }
    } catch (error) {
      logger.error('OpenAI proxy error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
          provider: 'openai',
          metadata: {
            requestId: `error_${Date.now()}`,
            timestamp: new Date().toISOString(),
            duration: 0,
            model: 'unknown'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        provider: 'openai',
        metadata: {
          requestId: `error_${Date.now()}`,
          timestamp: new Date().toISOString(),
          duration: 0,
          model: 'unknown'
        }
      });
    }
  }
);

/**
 * Proxy Anthropic API requests
 */
router.post('/anthropic',
  validateInternalAccess, 
  requireApiKey('ANTHROPIC_API_KEY'),
  async (req: Request, res: Response) => {
    try {
      const requestData = anthropicRequestSchema.parse(req.body);
      
      logger.info('Processing Anthropic proxy request', {
        model: requestData.model,
        messageCount: requestData.messages.length,
        ip: req.ip
      });

      const response = await aiProxyService.proxyAnthropic(requestData as AnthropicRequest);
      
      if (response.success) {
        res.json(response);
      } else {
        res.status(500).json(response);
      }
    } catch (error) {
      logger.error('Anthropic proxy error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
          provider: 'anthropic',
          metadata: {
            requestId: `error_${Date.now()}`,
            timestamp: new Date().toISOString(),
            duration: 0,
            model: 'unknown'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        provider: 'anthropic',
        metadata: {
          requestId: `error_${Date.now()}`,
          timestamp: new Date().toISOString(),
          duration: 0,
          model: 'unknown'
        }
      });
    }
  }
);

/**
 * Refresh AI clients (for key rotation)
 */
router.post('/refresh',
  validateInternalAccess,
  (req: Request, res: Response) => {
    try {
      aiProxyService.refreshClients();
      
      logger.info('AI proxy clients refreshed', {
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'AI proxy clients refreshed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error refreshing AI proxy clients:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh clients',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export { router as aiProxyRoutes };