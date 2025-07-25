import { Router, Request, Response } from 'express';
import {
  campaignTemplateService,
  createTemplateSchema,
  updateTemplateSchema,
  recordUsageSchema,
} from '@/services/campaignTemplateService';
import { logger } from '@/utils/logger';
import { authenticate } from '@/middleware/auth';
import { TemplateCategory, TemplateDifficulty } from '@prisma/client';
import { z } from 'zod';

const router = Router();

/**
 * @route GET /api/campaign-templates
 * @desc Get all campaign templates with filtering options
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      category,
      difficulty,
      tags,
      isOfficial,
      limit,
      offset,
    } = req.query;

    const options: any = {};

    if (category && Object.values(TemplateCategory).includes(category as TemplateCategory)) {
      options.category = category as TemplateCategory;
    }

    if (difficulty && Object.values(TemplateDifficulty).includes(difficulty as TemplateDifficulty)) {
      options.difficulty = difficulty as TemplateDifficulty;
    }

    if (tags) {
      options.tags = Array.isArray(tags) ? tags : [tags];
    }

    if (isOfficial !== undefined) {
      options.isOfficial = isOfficial === 'true';
    }

    if (limit) {
      options.limit = parseInt(limit as string);
    }

    if (offset) {
      options.offset = parseInt(offset as string);
    }

    const result = await campaignTemplateService.getTemplates(options);

    res.json({
      success: true,
      data: result.templates,
      total: result.total,
      pagination: {
        limit: options.limit || 20,
        offset: options.offset || 0,
        hasMore: (options.offset || 0) + result.templates.length < result.total,
      },
    });
  } catch (error) {
    logger.error('Failed to get campaign templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve campaign templates',
    });
  }
});

/**
 * @route GET /api/campaign-templates/popular
 * @desc Get popular campaign templates
 */
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const popularLimit = limit ? parseInt(limit as string) : 10;

    const popularTemplates = await campaignTemplateService.getPopularTemplates(popularLimit);

    res.json({
      success: true,
      data: popularTemplates,
    });
  } catch (error) {
    logger.error('Failed to get popular templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve popular templates',
    });
  }
});

/**
 * @route GET /api/campaign-templates/search
 * @desc Search campaign templates
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, category, difficulty, limit } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const options: any = {};

    if (category && Object.values(TemplateCategory).includes(category as TemplateCategory)) {
      options.category = category as TemplateCategory;
    }

    if (difficulty && Object.values(TemplateDifficulty).includes(difficulty as TemplateDifficulty)) {
      options.difficulty = difficulty as TemplateDifficulty;
    }

    if (limit) {
      options.limit = parseInt(limit as string);
    }

    const templates = await campaignTemplateService.searchTemplates(q, options);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('Failed to search templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search templates',
    });
  }
});

/**
 * @route GET /api/campaign-templates/:id
 * @desc Get specific campaign template
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Template ID is required',
      });
    }

    const template = await campaignTemplateService.getTemplate(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Failed to get template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve template',
    });
  }
});

/**
 * @route GET /api/campaign-templates/:id/stats
 * @desc Get template usage statistics
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Template ID is required',
      });
    }

    const stats = await campaignTemplateService.getTemplateStats(id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get template stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve template statistics',
    });
  }
});

/**
 * @route POST /api/campaign-templates
 * @desc Create new campaign template (authenticated users only)
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const data = createTemplateSchema.parse(req.body);
    const template = await campaignTemplateService.createTemplate(data, req.user.id);

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    logger.error('Failed to create template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template',
    });
  }
});

/**
 * @route PUT /api/campaign-templates/:id
 * @desc Update campaign template (authenticated users only, must own template)
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Template ID is required',
      });
    }

    const data = updateTemplateSchema.parse(req.body);
    const template = await campaignTemplateService.updateTemplate(id, data, req.user.id);

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error instanceof Error) {
      if (error.message === 'Template not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      if (error.message === 'Not authorized to update this template') {
        return res.status(403).json({
          success: false,
          error: error.message,
        });
      }
    }

    logger.error('Failed to update template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template',
    });
  }
});

/**
 * @route DELETE /api/campaign-templates/:id
 * @desc Delete campaign template (authenticated users only, must own template)
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Template ID is required',
      });
    }

    await campaignTemplateService.deleteTemplate(id, req.user.id);

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Template not found') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      if (error.message === 'Not authorized to delete this template') {
        return res.status(403).json({
          success: false,
          error: error.message,
        });
      }
    }

    logger.error('Failed to delete template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template',
    });
  }
});

/**
 * @route POST /api/campaign-templates/:id/usage
 * @desc Record template usage (authenticated users only)
 */
router.post('/:id/usage', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Template ID is required',
      });
    }

    const data = recordUsageSchema.parse(req.body);
    await campaignTemplateService.recordUsage(id, req.user.id, data);

    res.json({
      success: true,
      message: 'Usage recorded successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error instanceof Error && error.message === 'Template not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    logger.error('Failed to record usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record usage',
    });
  }
});

export const campaignTemplateRoutes = router;