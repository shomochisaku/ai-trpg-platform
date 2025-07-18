import { Router, Request, Response } from 'express';
import {
  campaignService,
  createCampaignSchema,
  updateCampaignSchema,
} from '@/services/campaignService';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const router = Router();

/**
 * @route POST /api/campaigns
 * @desc Create new campaign
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createCampaignSchema.parse(req.body);
    const campaign = await campaignService.createCampaign(data);

    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Failed to create campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
    });
  }
});

/**
 * @route GET /api/campaigns
 * @desc List campaigns for user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, status, limit, offset } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    const result = await campaignService.listCampaigns(userId as string, {
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result.campaigns,
      total: result.total,
    });
  } catch (error) {
    logger.error('Failed to list campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list campaigns',
    });
  }
});

/**
 * @route GET /api/campaigns/:id
 * @desc Get campaign by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required',
      });
    }

    const campaign = await campaignService.getCampaign(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    logger.error('Failed to get campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve campaign',
    });
  }
});

/**
 * @route PUT /api/campaigns/:id
 * @desc Update campaign
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required',
      });
    }

    const data = updateCampaignSchema.parse(req.body);
    const campaign = await campaignService.updateCampaign(id, data);

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Failed to update campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign',
    });
  }
});

/**
 * @route DELETE /api/campaigns/:id
 * @desc Delete campaign
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required',
      });
    }

    await campaignService.deleteCampaign(id);

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign',
    });
  }
});

/**
 * @route GET /api/campaigns/:id/stats
 * @desc Get campaign statistics
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required',
      });
    }

    const stats = await campaignService.getCampaignStats(id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get campaign stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve campaign statistics',
    });
  }
});

/**
 * @route POST /api/campaigns/:id/action
 * @desc Process player action (integration point for game flow)
 */
router.post('/:id/action', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required',
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'action is required',
      });
    }

    // Get campaign to verify it exists
    const campaign = await campaignService.getCampaign(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    // TODO: Integrate with Mastra AI agent to process the action
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Action processing will be integrated with Mastra AI',
      data: {
        campaignId: id,
        action,
        // This will be replaced with actual AI response
        response:
          'This feature will process player actions through the Mastra AI framework',
      },
    });
  } catch (error) {
    logger.error('Failed to process action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process action',
    });
  }
});

export const campaignRoutes = router;
