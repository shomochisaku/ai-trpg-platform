import { PrismaClient, SessionStatus } from '@prisma/client';
import { logger } from '@/utils/logger';
// import { ragService, SearchResult } from './ragService'; // MVP: Disabled for minimal schema

// MVP: Temporary SearchResult type
interface SearchResult {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}
import { aiService } from '../ai/aiService';
import { campaignTemplateService } from './campaignTemplateService';
import {
  GameActionContext,
  ProcessGameActionResult,
} from '../ai/workflows/types';
import { z } from 'zod';

const prisma = new PrismaClient();

// Types
export interface CampaignSettings {
  gmProfile: {
    personality: string;
    speechStyle: string;
    guidingPrinciples: string[];
  };
  worldSettings: {
    toneAndManner: string;
    keyConcepts: string[];
  };
  opening: {
    prologue: string;
    initialStatusTags: string[];
    initialInventory: string[];
  };
}

export interface CampaignMetadata {
  [key: string]: string | number | boolean | undefined;
}

export interface CampaignStats {
  campaign: {
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  statistics: {
    characters: number;
    conversations: number;
    knowledge: {
      total: number;
      byCategory: Record<string, number>;
      lastUpdated: Date;
    };
  };
}

export interface Campaign {
  id: string;
  userId: string;
  title: string;
  description: string;
  settings: CampaignSettings;
  status: string;
  metadata: CampaignMetadata;
  createdAt: Date;
  updatedAt: Date;
}

// Validation schemas
export const createCampaignSchema = z.object({
  userId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  templateId: z.string().optional(), // Template-based creation
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
  }).optional(), // Optional when using template
});

export const updateCampaignSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  settings: z
    .object({
      gmProfile: z
        .object({
          personality: z.string(),
          speechStyle: z.string(),
          guidingPrinciples: z.array(z.string()),
        })
        .optional(),
      worldSettings: z
        .object({
          toneAndManner: z.string(),
          keyConcepts: z.array(z.string()),
        })
        .optional(),
      opening: z
        .object({
          prologue: z.string(),
          initialStatusTags: z.array(z.string()),
          initialInventory: z.array(z.string()),
        })
        .optional(),
    })
    .optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export class CampaignService {
  /**
   * Create a new campaign
   */
  async createCampaign(
    data: z.infer<typeof createCampaignSchema>
  ): Promise<Campaign> {
    const validated = createCampaignSchema.parse(data);

    let campaignSettings = validated.settings;
    let baseTemplateId: string | undefined;
    let templateCustomized = false;

    // Handle template-based creation
    if (validated.templateId) {
      const template = await campaignTemplateService.getTemplate(validated.templateId);
      if (!template) {
        throw new Error(`Template with ID '${validated.templateId}' not found`);
      }

      baseTemplateId = template.id;
      
      // Use template settings as base
      campaignSettings = template.scenarioSettings;
      
      // Check if user provided custom settings (customization)
      if (validated.settings) {
        templateCustomized = true;
        // Merge user settings with template settings
        campaignSettings = {
          ...template.scenarioSettings,
          ...validated.settings,
          gmProfile: {
            ...template.scenarioSettings.gmProfile,
            ...validated.settings.gmProfile,
          },
          worldSettings: {
            ...template.scenarioSettings.worldSettings,
            ...validated.settings.worldSettings,
          },
          opening: {
            ...template.scenarioSettings.opening,
            ...validated.settings.opening,
          },
        };
      }

      // Record template usage
      try {
        await campaignTemplateService.recordUsage(validated.templateId, validated.userId, {
          wasCustomized: templateCustomized,
          completionStatus: 'STARTED',
        });
      } catch (error) {
        logger.warn('Failed to record template usage:', error);
        // Continue with campaign creation even if usage recording fails
      }
    }

    if (!campaignSettings) {
      throw new Error('Campaign settings are required when not using a template');
    }

    // Create campaign in database
    const campaign = await prisma.gameSession.create({
      data: {
        createdBy: validated.userId,
        name: validated.title,
        description: validated.description || '',
        status: 'ACTIVE' as const,
        // Map aiSettings to new schema fields
        aiGMEnabled: true,
        aiModel: 'gpt-4',
        aiPersonality: campaignSettings.gmProfile?.personality || 'balanced',
        systemType: 'AI_TRPG',
        maxPlayers: 1,
        // Template tracking
        baseTemplateId,
        templateCustomized,
      },
    });

    // Initialize campaign knowledge base
    await this.initializeCampaignKnowledge(campaign.id, campaignSettings);

    logger.info(`Campaign created successfully: ${campaign.id}${baseTemplateId ? ` (from template: ${validated.templateId})` : ''}`);

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
      createdBy: userId,
      ...(options.status && { status: options.status as SessionStatus }),
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
        ...(validated.title && { name: validated.title }),
        ...(validated.description !== undefined && {
          description: validated.description,
        }),
        ...(validated.settings && {
          // Map aiSettings to new schema fields
          aiGMEnabled: true,
          aiModel: 'gpt-4',
          aiPersonality:
            validated.settings?.gmProfile?.personality || 'balanced',
        }),
        ...(validated.status && { status: validated.status as SessionStatus }),
      },
    });

    return this.formatCampaign(updated);
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string): Promise<void> {
    // MVP: Skip knowledge entries deletion (memoryEntry table doesn't exist)
    // await prisma.memoryEntry.deleteMany({
    //   where: { sessionId: id },
    // });

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _settings: CampaignSettings
  ): Promise<void> {
    // MVP: Knowledge base initialization disabled for minimal schema
    logger.info(
      `MVP: Skipping knowledge base initialization for campaign ${campaignId}`
    );
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    // MVP: Simplified stats without ragService and complex tables
    return {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
      statistics: {
        characters: 1, // MVP: Default values
        conversations: 0,
        knowledge: {
          total: 0,
          byCategory: {},
          lastUpdated: new Date(),
        },
      },
    };
  }

  /**
   * Process player action using workflow system
   */
  async processPlayerAction(
    campaignId: string,
    playerId: string,
    playerAction: string
  ): Promise<ProcessGameActionResult> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Build game action context
    const context = await this.buildGameActionContext(
      campaignId,
      playerId,
      playerAction
    );

    // Process action through AI service workflow
    const result = await aiService.processGameAction(context);

    // Store action result in database
    await this.storeActionResult(campaignId, playerId, playerAction, result);

    // Update campaign status if needed
    if (result.success && campaign.status !== result.gameState.currentScene) {
      await this.updateCampaign(campaignId, { status: 'ACTIVE' });
    }

    return result;
  }

  /**
   * Build game action context from current campaign state
   */
  private async buildGameActionContext(
    campaignId: string,
    playerId: string,
    playerAction: string
  ): Promise<GameActionContext> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // MVP: Simplified context without ragService and complex tables
    const context: GameActionContext = {
      campaignId,
      playerId,
      playerAction,
      gameState: {
        currentScene:
          campaign.settings.opening.prologue.split('\n')[0] ||
          'The adventure begins',
        playerStatus: campaign.settings.opening.initialStatusTags,
        npcs: [],
        environment: {
          location: 'Starting location',
          timeOfDay: 'day',
          weather: undefined,
        },
      },
      previousActions: [],
      memories: [],
    };

    return context;
  }

  /**
   * Store action result in database
   */
  private async storeActionResult(
    campaignId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _playerId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _playerAction: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _result: ProcessGameActionResult
  ): Promise<void> {
    // MVP: Action result storage disabled for minimal schema
    logger.info(
      `MVP: Skipping action result storage for campaign ${campaignId}`
    );
  }

  // Helper methods for extracting information from knowledge content
  private extractStatusTags(content: string): string[] {
    if (!content) return [];
    const statusMatch = content.match(/status.*?:.*?([^\n.]+)/i);
    return statusMatch && statusMatch[1]
      ? statusMatch[1]
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0)
      : [];
  }

  private extractNPCName(content: string): string {
    if (!content) return 'Unknown';
    const nameMatch = content.match(
      /(?:npc|character|ally|enemy).*?(?:named?|called?)\s+([A-Z][a-z]+)/i
    );
    return nameMatch && nameMatch[1] ? nameMatch[1] : 'Unknown';
  }

  private extractNPCRole(content: string): string {
    if (!content) return 'Unknown';
    const roleMatch = content.match(
      /(?:role|job|profession|class).*?:.*?([^\n.]+)/i
    );
    return roleMatch && roleMatch[1] ? roleMatch[1].trim() : 'Unknown';
  }

  private extractLocation(results: SearchResult[]): string {
    if (!results || results.length === 0) return 'Unknown location';
    const content = results[0]?.content;
    if (!content) return 'Unknown location';
    const locationMatch = content.match(
      /(?:location|place|area).*?:.*?([^\n.]+)/i
    );
    return locationMatch && locationMatch[1]
      ? locationMatch[1].trim()
      : 'Unknown location';
  }

  private extractTimeOfDay(results: SearchResult[]): string | undefined {
    if (!results || results.length === 0) return undefined;
    const content = results[0]?.content;
    if (!content) return undefined;
    const timeMatch = content.match(
      /(?:time|hour).*?:.*?(morning|afternoon|evening|night|dawn|dusk)/i
    );
    return timeMatch && timeMatch[1] ? timeMatch[1] : undefined;
  }

  private extractWeather(results: SearchResult[]): string | undefined {
    if (!results || results.length === 0) return undefined;
    const content = results[0]?.content;
    if (!content) return undefined;
    const weatherMatch = content.match(
      /(?:weather|sky|climate).*?:.*?([^\n.]+)/i
    );
    return weatherMatch && weatherMatch[1] ? weatherMatch[1].trim() : undefined;
  }

  private formatCampaign(session: {
    id: string;
    createdBy: string;
    name: string;
    description: string | null;
    // New PostgreSQL schema fields
    aiGMEnabled?: boolean;
    aiModel?: string;
    aiPersonality?: string;
    status: SessionStatus | string;
    createdAt: Date;
    updatedAt: Date;
  }): Campaign {
    // Create settings from new PostgreSQL schema fields
    const settings: CampaignSettings = {
      gmProfile: {
        personality: session.aiPersonality || 'balanced',
        speechStyle: 'narrative',
        guidingPrinciples: [],
      },
      worldSettings: { toneAndManner: 'fantasy', keyConcepts: [] },
      opening: {
        prologue: '',
        initialStatusTags: [],
        initialInventory: [],
      },
    };

    return {
      id: session.id,
      userId: session.createdBy,
      title: session.name,
      description: session.description || '',
      settings,
      status: session.status,
      metadata: {} as CampaignMetadata,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}

// Export singleton instance
export const campaignService = new CampaignService();
