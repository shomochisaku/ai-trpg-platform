import { PrismaClient, TemplateCategory, TemplateDifficulty, TemplateCompletionStatus } from '@prisma/client';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const prisma = new PrismaClient();

// Types
export interface CampaignTemplateSettings {
  gmProfile: {
    personality: string;
    speechStyle: string;
    guidingPrinciples: string[];
  };
  worldSettings: {
    toneAndManner: string;
    keyConcepts: string[];
    setting: string;
  };
  opening: {
    prologue: string;
    initialStatusTags: string[];
    initialInventory: string[];
  };
  gameStyle: string;
  gmBehavior: {
    narrativeStyle: 'descriptive' | 'concise' | 'theatrical';
    playerAgency: 'high' | 'medium' | 'guided';
    difficultyAdjustment: 'adaptive' | 'static' | 'escalating';
  };
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  templateId: string;
  category: TemplateCategory;
  isOfficial: boolean;
  isActive: boolean;
  scenarioSettings: CampaignTemplateSettings;
  difficulty: TemplateDifficulty;
  estimatedDuration?: string;
  playerCount: string;
  tags: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateUsageStats {
  totalUsage: number;
  averageRating?: number;
  completionRate: number;
  customizationRate: number;
  averageDuration?: number;
  usageByMonth: Array<{
    month: string;
    count: number;
  }>;
}

export interface PopularTemplate {
  template: CampaignTemplate;
  usageCount: number;
  averageRating?: number;
}

// Validation schemas
export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  templateId: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  category: z.nativeEnum(TemplateCategory),
  difficulty: z.nativeEnum(TemplateDifficulty),
  estimatedDuration: z.string().max(50).optional(),
  playerCount: z.string().max(20).default('1'),
  tags: z.array(z.string()).max(10),
  scenarioSettings: z.object({
    gmProfile: z.object({
      personality: z.string().min(10),
      speechStyle: z.string().min(5),
      guidingPrinciples: z.array(z.string()).max(10),
    }),
    worldSettings: z.object({
      toneAndManner: z.string().min(10),
      keyConcepts: z.array(z.string()).max(15),
      setting: z.string().min(20),
    }),
    opening: z.object({
      prologue: z.string().min(50),
      initialStatusTags: z.array(z.string()).max(10),
      initialInventory: z.array(z.string()).max(10),
    }),
    gameStyle: z.string().min(1),
    gmBehavior: z.object({
      narrativeStyle: z.enum(['descriptive', 'concise', 'theatrical']),
      playerAgency: z.enum(['high', 'medium', 'guided']),
      difficultyAdjustment: z.enum(['adaptive', 'static', 'escalating']),
    }),
  }),
});

export const updateTemplateSchema = createTemplateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const recordUsageSchema = z.object({
  wasCustomized: z.boolean().default(false),
  sessionDuration: z.number().min(1).optional(),
  playerRating: z.number().min(1).max(5).optional(),
  completionStatus: z.nativeEnum(TemplateCompletionStatus).default('STARTED'),
  sessionId: z.string().optional(),
});

export class CampaignTemplateService {
  /**
   * Get all active campaign templates
   */
  async getTemplates(options: {
    category?: TemplateCategory;
    difficulty?: TemplateDifficulty;
    tags?: string[];
    isOfficial?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ templates: CampaignTemplate[]; total: number }> {
    const where: any = {
      isActive: true,
    };

    if (options.category) {
      where.category = options.category;
    }

    if (options.difficulty) {
      where.difficulty = options.difficulty;
    }

    if (options.isOfficial !== undefined) {
      where.isOfficial = options.isOfficial;
    }

    if (options.tags && options.tags.length > 0) {
      where.tags = {
        hasSome: options.tags,
      };
    }

    const [templates, total] = await Promise.all([
      prisma.campaignTemplate.findMany({
        where,
        orderBy: [
          { isOfficial: 'desc' },
          { createdAt: 'desc' },
        ],
        take: options.limit || 20,
        skip: options.offset || 0,
      }),
      prisma.campaignTemplate.count({ where }),
    ]);

    return {
      templates: templates.map(t => this.formatTemplate(t)),
      total,
    };
  }

  /**
   * Get template by ID or templateId
   */
  async getTemplate(idOrTemplateId: string): Promise<CampaignTemplate | null> {
    const template = await prisma.campaignTemplate.findFirst({
      where: {
        OR: [
          { id: idOrTemplateId },
          { templateId: idOrTemplateId },
        ],
        isActive: true,
      },
    });

    return template ? this.formatTemplate(template) : null;
  }

  /**
   * Create a new campaign template
   */
  async createTemplate(
    data: z.infer<typeof createTemplateSchema>,
    createdBy?: string
  ): Promise<CampaignTemplate> {
    const validated = createTemplateSchema.parse(data);

    // Check if templateId already exists
    const existing = await prisma.campaignTemplate.findUnique({
      where: { templateId: validated.templateId },
    });

    if (existing) {
      throw new Error(`Template with ID '${validated.templateId}' already exists`);
    }

    const template = await prisma.campaignTemplate.create({
      data: {
        ...validated,
        scenarioSettings: validated.scenarioSettings as any,
        createdBy,
        isOfficial: createdBy ? false : true, // User-created templates are not official by default
      },
    });

    logger.info(`Campaign template '${template.templateId}' created successfully`);
    return this.formatTemplate(template);
  }

  /**
   * Update campaign template
   */
  async updateTemplate(
    id: string,
    data: z.infer<typeof updateTemplateSchema>,
    userId?: string
  ): Promise<CampaignTemplate> {
    const validated = updateTemplateSchema.parse(data);

    // Verify ownership for user-created templates
    const template = await prisma.campaignTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.createdBy && template.createdBy !== userId) {
      throw new Error('Not authorized to update this template');
    }

    const updated = await prisma.campaignTemplate.update({
      where: { id },
      data: {
        ...validated,
        ...(validated.scenarioSettings && {
          scenarioSettings: validated.scenarioSettings as any,
        }),
      },
    });

    return this.formatTemplate(updated);
  }

  /**
   * Delete template (soft delete by setting isActive to false)
   */
  async deleteTemplate(id: string, userId?: string): Promise<void> {
    const template = await prisma.campaignTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.createdBy && template.createdBy !== userId) {
      throw new Error('Not authorized to delete this template');
    }

    await prisma.campaignTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`Template ${id} soft deleted`);
  }

  /**
   * Record template usage
   */
  async recordUsage(
    templateId: string,
    userId: string,
    data: z.infer<typeof recordUsageSchema>
  ): Promise<void> {
    const validated = recordUsageSchema.parse(data);

    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    await prisma.templateUsage.create({
      data: {
        templateId: template.id,
        userId,
        ...validated,
      },
    });

    logger.info(`Usage recorded for template ${templateId} by user ${userId}`);
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId: string): Promise<TemplateUsageStats> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const usageData = await prisma.templateUsage.findMany({
      where: { templateId: template.id },
      select: {
        wasCustomized: true,
        sessionDuration: true,
        playerRating: true,
        completionStatus: true,
        createdAt: true,
      },
    });

    const totalUsage = usageData.length;
    const completedUsage = usageData.filter(u => u.completionStatus === 'COMPLETED').length;
    const customizedUsage = usageData.filter(u => u.wasCustomized).length;
    const ratingsData = usageData.filter(u => u.playerRating !== null);
    const durationsData = usageData.filter(u => u.sessionDuration !== null);

    // Calculate usage by month for the last 12 months
    const now = new Date();
    const monthsData = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toISOString().substring(0, 7); // YYYY-MM format
      const count = usageData.filter(u => 
        u.createdAt.toISOString().substring(0, 7) === monthStr
      ).length;
      return { month: monthStr, count };
    }).reverse();

    return {
      totalUsage,
      averageRating: ratingsData.length > 0 
        ? ratingsData.reduce((sum, u) => sum + (u.playerRating || 0), 0) / ratingsData.length
        : undefined,
      completionRate: totalUsage > 0 ? completedUsage / totalUsage : 0,
      customizationRate: totalUsage > 0 ? customizedUsage / totalUsage : 0,
      averageDuration: durationsData.length > 0
        ? durationsData.reduce((sum, u) => sum + (u.sessionDuration || 0), 0) / durationsData.length
        : undefined,
      usageByMonth: monthsData,
    };
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit: number = 10): Promise<PopularTemplate[]> {
    const templates = await prisma.campaignTemplate.findMany({
      where: { isActive: true },
      include: {
        usageStats: {
          select: {
            playerRating: true,
          },
        },
        _count: {
          select: {
            usageStats: true,
          },
        },
      },
      orderBy: {
        usageStats: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return templates.map(t => {
      const ratings = t.usageStats
        .map(u => u.playerRating)
        .filter((r): r is number => r !== null);
      
      return {
        template: this.formatTemplate(t),
        usageCount: t._count.usageStats,
        averageRating: ratings.length > 0 
          ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
          : undefined,
      };
    });
  }

  /**
   * Search templates by text
   */
  async searchTemplates(
    query: string,
    options: {
      category?: TemplateCategory;
      difficulty?: TemplateDifficulty;
      limit?: number;
    } = {}
  ): Promise<CampaignTemplate[]> {
    const templates = await prisma.campaignTemplate.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
        ...(options.category && { category: options.category }),
        ...(options.difficulty && { difficulty: options.difficulty }),
      },
      orderBy: [
        { isOfficial: 'desc' },
        { name: 'asc' },
      ],
      take: options.limit || 20,
    });

    return templates.map(t => this.formatTemplate(t));
  }

  /**
   * Format template for API response
   */
  private formatTemplate(template: any): CampaignTemplate {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      templateId: template.templateId,
      category: template.category,
      isOfficial: template.isOfficial,
      isActive: template.isActive,
      scenarioSettings: template.scenarioSettings as CampaignTemplateSettings,
      difficulty: template.difficulty,
      estimatedDuration: template.estimatedDuration,
      playerCount: template.playerCount,
      tags: template.tags,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}

// Export singleton instance
export const campaignTemplateService = new CampaignTemplateService();