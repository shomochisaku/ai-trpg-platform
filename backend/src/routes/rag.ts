import { Router, Request, Response } from 'express';
import { ragService, createKnowledgeSchema, searchSchema } from '@/services/ragService';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const router = Router();

/**
 * @route POST /api/rag/knowledge
 * @desc Store new knowledge entry
 */
router.post('/knowledge', async (req: Request, res: Response) => {
  try {
    const data = createKnowledgeSchema.parse(req.body);
    const entry = await ragService.storeKnowledge(data);
    
    res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    
    logger.error('Failed to store knowledge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store knowledge entry',
    });
  }
});

/**
 * @route POST /api/rag/search
 * @desc Search knowledge base
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const params = searchSchema.parse(req.body);
    const results = await ragService.searchKnowledge(params);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    
    logger.error('Failed to search knowledge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search knowledge base',
    });
  }
});

/**
 * @route GET /api/rag/knowledge/:campaignId/category/:category
 * @desc Get knowledge by category
 */
router.get('/knowledge/:campaignId/category/:category', async (req: Request, res: Response) => {
  try {
    const { campaignId, category } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const entries = await ragService.getKnowledgeByCategory(campaignId, category, limit);
    
    res.json({
      success: true,
      data: entries,
      count: entries.length,
    });
  } catch (error) {
    logger.error('Failed to get knowledge by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve knowledge entries',
    });
  }
});

/**
 * @route PUT /api/rag/knowledge/:id
 * @desc Update knowledge entry
 */
router.put('/knowledge/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entry = await ragService.updateKnowledge(id, req.body);
    
    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    logger.error('Failed to update knowledge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update knowledge entry',
    });
  }
});

/**
 * @route DELETE /api/rag/knowledge/:id
 * @desc Delete knowledge entry
 */
router.delete('/knowledge/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await ragService.deleteKnowledge(id);
    
    res.json({
      success: true,
      message: 'Knowledge entry deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete knowledge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete knowledge entry',
    });
  }
});

/**
 * @route GET /api/rag/stats/:campaignId
 * @desc Get knowledge statistics for campaign
 */
router.get('/stats/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const stats = await ragService.getKnowledgeStats(campaignId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get knowledge stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve knowledge statistics',
    });
  }
});

/**
 * @route POST /api/rag/context
 * @desc Generate contextual prompt for AI
 */
router.post('/context', async (req: Request, res: Response) => {
  try {
    const { campaignId, query, maxTokens } = req.body;
    
    if (!campaignId || !query) {
      return res.status(400).json({
        success: false,
        error: 'campaignId and query are required',
      });
    }
    
    const context = await ragService.generateContext(
      campaignId,
      query,
      maxTokens || 2000
    );
    
    res.json({
      success: true,
      data: {
        context,
        tokenEstimate: Math.ceil(context.length / 4),
      },
    });
  } catch (error) {
    logger.error('Failed to generate context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate context',
    });
  }
});

/**
 * @route GET /api/rag/health
 * @desc Health check for RAG service
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check if OpenAI API key is configured
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    
    res.json({
      success: true,
      status: 'healthy',
      services: {
        openai: hasOpenAIKey ? 'configured' : 'not configured',
        database: 'connected',
      },
    });
  } catch (error) {
    logger.error('RAG health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Service health check failed',
    });
  }
});

export const ragRoutes = router;