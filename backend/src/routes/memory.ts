import express from 'express';
import { MemoryType } from '@prisma/client';
import { memoryService } from '@/services/memoryService';
import { ApiResponse } from '@/types';
import { logger } from '@/utils/logger';

const router = express.Router();

/**
 * Create a new memory entry
 * POST /api/memory/entries
 */
router.post('/entries', async (req, res) => {
  try {
    const memory = await memoryService.createMemory(req.body);

    const response: ApiResponse = {
      success: true,
      data: memory,
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Failed to create memory entry', error);

    const response: ApiResponse = {
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create memory entry',
        code: 'MEMORY_CREATE_ERROR',
      },
    };

    res.status(400).json(response);
  }
});

/**
 * Get memory entry by ID
 * GET /api/memory/entries/:id
 */
router.get('/entries/:id', async (req, res) => {
  try {
    const memory = await memoryService.getMemory(req.params.id);

    if (!memory) {
      const response: ApiResponse = {
        success: false,
        error: {
          message: 'Memory entry not found',
          code: 'MEMORY_NOT_FOUND',
        },
      };

      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: memory,
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get memory entry', error);

    const response: ApiResponse = {
      success: false,
      error: {
        message: 'Failed to get memory entry',
        code: 'MEMORY_GET_ERROR',
      },
    };

    res.status(500).json(response);
  }
});

/**
 * Update memory entry
 * PUT /api/memory/entries/:id
 */
router.put('/entries/:id', async (req, res) => {
  try {
    const memory = await memoryService.updateMemory(req.params.id, req.body);

    const response: ApiResponse = {
      success: true,
      data: memory,
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to update memory entry', error);

    const response: ApiResponse = {
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update memory entry',
        code: 'MEMORY_UPDATE_ERROR',
      },
    };

    res.status(400).json(response);
  }
});

/**
 * Delete memory entry (soft delete)
 * DELETE /api/memory/entries/:id
 */
router.delete('/entries/:id', async (req, res) => {
  try {
    await memoryService.deleteMemory(req.params.id);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Memory entry deleted successfully' },
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to delete memory entry', error);

    const response: ApiResponse = {
      success: false,
      error: {
        message: 'Failed to delete memory entry',
        code: 'MEMORY_DELETE_ERROR',
      },
    };

    res.status(500).json(response);
  }
});

/**
 * Search memories using vector similarity
 * POST /api/memory/search
 */
router.post('/search', async (req, res) => {
  try {
    const results = await memoryService.searchMemories(req.body);

    const response: ApiResponse = {
      success: true,
      data: {
        results,
        count: results.length,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Memory search failed', error);

    const response: ApiResponse = {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Memory search failed',
        code: 'MEMORY_SEARCH_ERROR',
      },
    };

    res.status(400).json(response);
  }
});

/**
 * List memories for a campaign
 * GET /api/memory/campaigns/:campaignId/entries
 */
router.get('/campaigns/:campaignId/entries', async (req, res) => {
  try {
    const { category, limit, offset } = req.query;

    const result = await memoryService.listCampaignMemories(
      req.params.campaignId,
      {
        category: category ? (category as string as MemoryType) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      }
    );

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to list campaign memories', error);

    const response: ApiResponse = {
      success: false,
      error: {
        message: 'Failed to list campaign memories',
        code: 'MEMORY_LIST_ERROR',
      },
    };

    res.status(500).json(response);
  }
});

/**
 * Get memory statistics for a campaign
 * GET /api/memory/campaigns/:campaignId/stats
 */
router.get('/campaigns/:campaignId/stats', async (req, res) => {
  try {
    const stats = await memoryService.getCampaignMemoryStats(
      req.params.campaignId
    );

    const response: ApiResponse = {
      success: true,
      data: stats,
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get memory statistics', error);

    const response: ApiResponse = {
      success: false,
      error: {
        message: 'Failed to get memory statistics',
        code: 'MEMORY_STATS_ERROR',
      },
    };

    res.status(500).json(response);
  }
});

/**
 * Initialize vector index (admin endpoint)
 * POST /api/memory/admin/init-index
 */
router.post('/admin/init-index', async (req, res) => {
  try {
    await memoryService.initializeVectorIndex();

    const response: ApiResponse = {
      success: true,
      data: { message: 'Vector index initialized successfully' },
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to initialize vector index', error);

    const response: ApiResponse = {
      success: false,
      error: {
        message: 'Failed to initialize vector index',
        code: 'INDEX_INIT_ERROR',
      },
    };

    res.status(500).json(response);
  }
});

export default router;
