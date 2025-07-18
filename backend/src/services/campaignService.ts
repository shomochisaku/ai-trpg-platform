import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { ragService } from './ragService';
import { z } from 'zod';

const prisma = new PrismaClient();

// Types
export interface Campaign {
  id: string;
  userId: string;
  title: string;
  description: string;
  settings: any;
  status: string;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

// Validation schemas
export const createCampaignSchema = z.object({
  userId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  settings: z.object({
    gmProfile: z.object({
      personality: z.string(),
      speechStyle: z.string(),
      guidingPrinciples: z.array(z.string()),
    }),
    worldSettings: z.object({
      toneAndManner: z.string(),
      keyConcepts: z.array(z.string()),
    }),
    opening: z.object({
      prologue: z.string(),
      initialStatusTags: z.array(z.string()),
      initialInventory: z.array(z.string()),
    }),
  }),
});

export const updateCampaignSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  settings: z.any().optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
  metadata: z.record(z.any()).optional(),
});

export class CampaignService {
  /**
   * Create a new campaign
   */
  async createCampaign(data: z.infer<typeof createCampaignSchema>): Promise<Campaign> {
    const validated = createCampaignSchema.parse(data);

    // Create campaign in database
    const campaign = await prisma.gameSession.create({
      data: {
        userId: validated.userId,
        title: validated.title,
        description: validated.description || '',
        status: 'active',
        aiSettings: validated.settings as any,
        metadata: {
          knowledgeInitialized: false,
        },
      },
    });

    // Initialize campaign knowledge base
    await this.initializeCampaignKnowledge(campaign.id, validated.settings);

    // Update metadata to mark knowledge as initialized
    await prisma.gameSession.update({
      where: { id: campaign.id },
      data: {
        metadata: {
          ...campaign.metadata,
          knowledgeInitialized: true,
        },
      },
    });

    return this.formatCampaign(campaign);
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(id: string): Promise<Campaign | null> {
    const campaign = await prisma.gameSession.findUnique({
      where: { id },
    });

    return campaign ? this.formatCampaign(campaign) : null;
  }

  /**
   * List campaigns for a user
   */
  async listCampaigns(
    userId: string,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ campaigns: Campaign[]; total: number }> {
    const where = {
      userId,
      ...(options.status && { status: options.status }),
    };

    const [campaigns, total] = await Promise.all([
      prisma.gameSession.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0,
      }),
      prisma.gameSession.count({ where }),
    ]);

    return {
      campaigns: campaigns.map(c => this.formatCampaign(c)),
      total,
    };
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    id: string,
    data: z.infer<typeof updateCampaignSchema>
  ): Promise<Campaign> {
    const validated = updateCampaignSchema.parse(data);

    const updated = await prisma.gameSession.update({
      where: { id },
      data: {
        ...(validated.title && { title: validated.title }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.settings && { aiSettings: validated.settings }),
        ...(validated.status && { status: validated.status }),
        ...(validated.metadata && {
          metadata: {
            ...(await prisma.gameSession.findUnique({ where: { id } }))?.metadata,
            ...validated.metadata,
          },
        }),
      },
    });

    return this.formatCampaign(updated);
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string): Promise<void> {
    // Delete associated knowledge entries
    await prisma.memoryEntry.deleteMany({
      where: { agentId: id },
    });

    // Delete campaign
    await prisma.gameSession.delete({
      where: { id },
    });

    logger.info(`Campaign ${id} deleted successfully`);
  }

  /**
   * Initialize campaign knowledge base
   */
  private async initializeCampaignKnowledge(
    campaignId: string,
    settings: any
  ): Promise<void> {
    logger.info(`Initializing knowledge base for campaign ${campaignId}`);

    // Store GM profile as knowledge
    await ragService.storeKnowledge({
      campaignId,
      category: 'rules',
      title: 'Game Master Profile',
      content: `The Game Master has the following characteristics: Personality - ${settings.gmProfile.personality}. Speech Style - ${settings.gmProfile.speechStyle}. Guiding Principles: ${settings.gmProfile.guidingPrinciples.join(', ')}.`,
      importance: 1.0,
      tags: ['gm', 'system', 'rules'],
    });

    // Store world settings
    await ragService.storeKnowledge({
      campaignId,
      category: 'lore',
      title: 'World Setting',
      content: `The world has the following tone and manner: ${settings.worldSettings.toneAndManner}. Key concepts include: ${settings.worldSettings.keyConcepts.join(', ')}.`,
      importance: 0.9,
      tags: ['world', 'setting', 'atmosphere'],
    });

    // Store opening/prologue
    await ragService.storeKnowledge({
      campaignId,
      category: 'events',
      title: 'Campaign Opening',
      content: settings.opening.prologue,
      importance: 0.8,
      tags: ['opening', 'prologue', 'start'],
    });

    // Store initial status and inventory
    if (settings.opening.initialStatusTags.length > 0) {
      await ragService.storeKnowledge({
        campaignId,
        category: 'characters',
        title: 'Initial Character Status',
        content: `The character begins with the following status tags: ${settings.opening.initialStatusTags.join(', ')}.`,
        importance: 0.7,
        tags: ['character', 'status', 'initial'],
      });
    }

    if (settings.opening.initialInventory.length > 0) {
      await ragService.storeKnowledge({
        campaignId,
        category: 'characters',
        title: 'Initial Inventory',
        content: `The character starts with the following items: ${settings.opening.initialInventory.join(', ')}.`,
        importance: 0.7,
        tags: ['character', 'inventory', 'initial'],
      });
    }

    logger.info(`Knowledge base initialized for campaign ${campaignId}`);
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string): Promise<any> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const knowledgeStats = await ragService.getKnowledgeStats(campaignId);

    // Get character count
    const characters = await prisma.character.count({
      where: { sessionId: campaignId },
    });

    // Get total actions/messages
    const conversations = await prisma.conversationHistory.count({
      where: { sessionId: campaignId },
    });

    return {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
      statistics: {
        characters,
        conversations,
        knowledge: knowledgeStats,
      },
    };
  }

  private formatCampaign(session: any): Campaign {
    return {
      id: session.id,
      userId: session.userId,
      title: session.title,
      description: session.description,
      settings: session.aiSettings,
      status: session.status,
      metadata: session.metadata || {},
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}

// Export singleton instance
export const campaignService = new CampaignService();