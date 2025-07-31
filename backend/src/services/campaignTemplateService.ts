import {
  PrismaClient,
  TemplateCategoryType,
  TemplateDifficulty,
  TemplateCompletionStatus,
} from '@prisma/client';
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
  category: TemplateCategoryType;
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

// Enhanced security validation schemas
const sanitizeString = (str: string): string => {
  // Remove potential XSS characters and normalize whitespace
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s\-.,!?()[\]{}:;"']/g, '')
    .trim()
    .substring(0, 10000); // Hard limit for safety
};

const sanitizedString = (min: number = 1, max: number = 1000) =>
  z
    .string()
    .min(min, `Minimum length is ${min} characters`)
    .max(max, `Maximum length is ${max} characters`)
    .transform(sanitizeString)
    .refine(val => val.length >= min, `Content too short after sanitization`);

const sanitizedArray = (maxItems: number = 10, maxItemLength: number = 100) =>
  z
    .array(
      z
        .string()
        .max(maxItemLength, `Item too long (max ${maxItemLength} characters)`)
        .transform(sanitizeString)
        .refine(val => val.length > 0, 'Empty items not allowed')
    )
    .max(maxItems, `Maximum ${maxItems} items allowed`)
    .refine(
      arr => new Set(arr).size === arr.length,
      'Duplicate items not allowed'
    );

// Simplified schema for practical solo development
// Complex nested structures are now optional to allow gradual development
export const createTemplateSchema = z.object({
  // Core required fields only
  name: sanitizedString(3, 100),
  description: sanitizedString(10, 1000),
  templateId: z
    .string()
    .min(3, 'Template ID too short')
    .max(50, 'Template ID too long')
    .regex(
      /^[a-z0-9-]+$/,
      'Template ID can only contain lowercase letters, numbers, and hyphens'
    )
    .transform(str => str.toLowerCase().trim()),
  
  // Optional fields for MVP - can be added incrementally
  category: z.nativeEnum(TemplateCategoryType).optional(),
  difficulty: z.nativeEnum(TemplateDifficulty).optional(),
  estimatedDuration: sanitizedString(1, 50).optional(),
  playerCount: sanitizedString(1, 20).default('1-4'),
  tags: sanitizedArray(10, 30).optional(),
  
  // Scenario settings completely optional for now
  // TODO: Re-enable strict validation when frontend is ready
  scenarioSettings: z.object({
    gmProfile: z.object({
      personality: sanitizedString(1, 2000).optional(),
      speechStyle: sanitizedString(1, 500).optional(),
      guidingPrinciples: sanitizedArray(10, 200).optional(),
    }).optional(),
    worldSettings: z.object({
      toneAndManner: sanitizedString(1, 500).optional(),
      keyConcepts: sanitizedArray(15, 100).optional(),
      setting: sanitizedString(1, 3000).optional(),
    }).optional(),
    opening: z.object({
      prologue: sanitizedString(1, 3000).optional(),
      initialStatusTags: sanitizedArray(10, 50).optional(),
      initialInventory: sanitizedArray(10, 100).optional(),
    }).optional(),
    gameStyle: sanitizedString(1, 50).optional(),
    gmBehavior: z.object({
      narrativeStyle: z.enum(['descriptive', 'concise', 'theatrical']).optional(),
      playerAgency: z.enum(['high', 'medium', 'guided']).optional(),
      difficultyAdjustment: z.enum(['adaptive', 'static', 'escalating']).optional(),
    }).optional(),
  }).optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const recordUsageSchema = z.object({
  wasCustomized: z.boolean().default(false),
  sessionDuration: z
    .number()
    .min(1, 'Session duration must be positive')
    .max(86400, 'Session duration cannot exceed 24 hours')
    .optional(),
  playerRating: z
    .number()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional(),
  completionStatus: z.nativeEnum(TemplateCompletionStatus).default('STARTED'),
  sessionId: sanitizedString(1, 100).optional(),
});

// Query parameter validation schemas
export const paginationSchema = z.object({
  limit: z.coerce
    .number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  offset: z.coerce
    .number()
    .min(0, 'Offset must be non-negative')
    .max(10000, 'Offset cannot exceed 10000')
    .default(0),
});

export const templateFiltersSchema = z
  .object({
    category: z.nativeEnum(TemplateCategoryType).optional(),
    difficulty: z.nativeEnum(TemplateDifficulty).optional(),
    tags: z
      .union([z.string().transform(str => [str]), z.array(z.string())])
      .optional()
      .transform(tags =>
        tags
          ? tags.slice(0, 10).map(tag => sanitizeString(tag).substring(0, 50))
          : undefined
      ),
    isOfficial: z.coerce.boolean().optional(),
  })
  .merge(paginationSchema);

export const searchQuerySchema = z.object({
  q: sanitizedString(1, 200),
  category: z.nativeEnum(TemplateCategoryType).optional(),
  difficulty: z.nativeEnum(TemplateDifficulty).optional(),
  limit: z.coerce
    .number()
    .min(1, 'Limit must be at least 1')
    .max(50, 'Search limit cannot exceed 50')
    .default(20),
});

export class CampaignTemplateService {
  /**
   * Get all active campaign templates
   */
  async getTemplates(
    options: {
      category?: TemplateCategoryType;
      difficulty?: TemplateDifficulty;
      tags?: string[];
      isOfficial?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ templates: CampaignTemplate[]; total: number }> {
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

    // Optimize pagination with efficient queries
    const safeLimit = Math.min(options.limit || 20, 100); // Cap at 100 for performance
    const safeOffset = Math.max(options.offset || 0, 0);

    const [templates, total] = await Promise.all([
      prisma.campaignTemplate.findMany({
        where,
        orderBy: [{ isOfficial: 'desc' }, { createdAt: 'desc' }],
        take: safeLimit,
        skip: safeOffset,
        // Only select fields needed for the list view to reduce data transfer
        select: {
          id: true,
          name: true,
          description: true,
          templateId: true,
          category: true,
          isOfficial: true,
          isActive: true,
          scenarioSettings: true,
          difficulty: true,
          estimatedDuration: true,
          playerCount: true,
          tags: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
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
        OR: [{ id: idOrTemplateId }, { templateId: idOrTemplateId }],
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
      throw new Error(
        `Template with ID '${validated.templateId}' already exists`
      );
    }

    const template = await prisma.campaignTemplate.create({
      data: {
        ...validated,
        scenarioSettings: validated.scenarioSettings as any,
        createdBy,
        isOfficial: createdBy ? false : true, // User-created templates are not official by default
      },
    });

    logger.info(
      `Campaign template '${template.templateId}' created successfully`
    );
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
   * Get template usage statistics (optimized for performance)
   */
  async getTemplateStats(templateId: string): Promise<TemplateUsageStats> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Use efficient aggregation queries instead of loading all data into memory
    const [totalUsageResult, aggregateStats, monthlyUsageStats] =
      await Promise.all([
        // Get total usage count
        prisma.templateUsage.count({
          where: { templateId: template.id },
        }),

        // Get aggregate statistics in a single query
        prisma.templateUsage.aggregate({
          where: { templateId: template.id },
          _count: {
            id: true,
            playerRating: true,
            sessionDuration: true,
          },
          _avg: {
            playerRating: true,
            sessionDuration: true,
          },
        }),

        // Get monthly usage data with database aggregation
        this.getMonthlyUsageStats(template.id),
      ]);

    // Get completion and customization rates with efficient queries
    const [completedCount, customizedCount] = await Promise.all([
      prisma.templateUsage.count({
        where: {
          templateId: template.id,
          completionStatus: 'COMPLETED',
        },
      }),
      prisma.templateUsage.count({
        where: {
          templateId: template.id,
          wasCustomized: true,
        },
      }),
    ]);

    return {
      totalUsage: totalUsageResult,
      averageRating: aggregateStats._avg.playerRating || undefined,
      completionRate:
        totalUsageResult > 0 ? completedCount / totalUsageResult : 0,
      customizationRate:
        totalUsageResult > 0 ? customizedCount / totalUsageResult : 0,
      averageDuration: aggregateStats._avg.sessionDuration || undefined,
      usageByMonth: monthlyUsageStats,
    };
  }

  /**
   * Get monthly usage statistics with secure database-agnostic aggregation
   */
  private async getMonthlyUsageStats(
    templateId: string
  ): Promise<Array<{ month: string; count: number }>> {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Use secure Prisma API instead of raw SQL to prevent injection attacks
    const usageData = await prisma.templateUsage.findMany({
      where: {
        templateId: templateId,
        createdAt: {
          gte: twelveMonthsAgo,
          lte: now,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Process data in application layer for database-agnostic approach
    const monthlyStats: { [key: string]: number } = {};

    usageData.forEach(record => {
      const monthKey = record.createdAt.toISOString().substring(0, 7); // YYYY-MM format
      monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + 1;
    });

    // Create a complete 12-month array with zero-filled missing months
    const monthsData = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const monthStr = date.toISOString().substring(0, 7);
      return {
        month: monthStr,
        count: monthlyStats[monthStr] || 0,
      };
    });

    return monthsData;
  }

  /**
   * Get popular templates (optimized for performance)
   */
  async getPopularTemplates(limit: number = 10): Promise<PopularTemplate[]> {
    // First, get templates with their usage counts efficiently
    const templatesWithCounts = await prisma.campaignTemplate.findMany({
      where: { isActive: true },
      include: {
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

    // Get average ratings for these templates in parallel
    const templateIds = templatesWithCounts.map(t => t.id);

    if (templateIds.length === 0) {
      return [];
    }

    const ratingAggregates = await Promise.all(
      templateIds.map(templateId =>
        prisma.templateUsage.aggregate({
          where: {
            templateId,
            playerRating: { not: null },
          },
          _avg: {
            playerRating: true,
          },
        })
      )
    );

    return templatesWithCounts.map((template, index) => ({
      template: this.formatTemplate(template),
      usageCount: template._count.usageStats,
      averageRating: ratingAggregates[index]?._avg.playerRating || undefined,
    }));
  }

  /**
   * Search templates by text
   */
  async searchTemplates(
    query: string,
    options: {
      category?: TemplateCategoryType;
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
      orderBy: [{ isOfficial: 'desc' }, { name: 'asc' }],
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
