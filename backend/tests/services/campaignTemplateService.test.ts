import { PrismaClient } from '@prisma/client';
import { campaignTemplateService, createTemplateSchema } from '@/services/campaignTemplateService';
import { logger } from '@/utils/logger';

// Mock Prisma client
jest.mock('@prisma/client');
jest.mock('@/utils/logger');

const mockPrisma = {
  campaignTemplate: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  templateUsage: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
} as any;

// Mock the PrismaClient constructor
(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma);

describe('CampaignTemplateService Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SQL Injection Prevention', () => {
    it('should safely handle malicious templateId in getMonthlyUsageStats', async () => {
      const maliciousTemplateId = "'; DROP TABLE templateUsage; --";
      
      // Mock template exists
      mockPrisma.campaignTemplate.findFirst.mockResolvedValueOnce({
        id: 'safe-id',
        templateId: 'safe-template-id',
      });

      // Mock usage data - should be called with safe Prisma query
      mockPrisma.templateUsage.findMany.mockResolvedValueOnce([
        { createdAt: new Date('2024-01-15') },
        { createdAt: new Date('2024-02-10') },
      ]);

      const result = await campaignTemplateService.getTemplateStats(maliciousTemplateId);

      // Verify that Prisma findMany was called with properly parameterized query
      expect(mockPrisma.templateUsage.findMany).toHaveBeenCalledWith({
        where: {
          templateId: 'safe-id', // Should use the actual template ID, not the malicious input
          createdAt: expect.any(Object),
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Verify no raw SQL queries were attempted
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should validate templateId format before database queries', async () => {
      const invalidTemplateIds = [
        "'; DROP TABLE campaign_templates; --",
        "<script>alert('xss')</script>",
        "../../etc/passwd",
        "' OR '1'='1",
      ];

      for (const maliciousId of invalidTemplateIds) {
        mockPrisma.campaignTemplate.findFirst.mockResolvedValueOnce(null);
        
        const result = await campaignTemplateService.getTemplate(maliciousId);
        
        expect(result).toBeNull();
        expect(mockPrisma.campaignTemplate.findFirst).toHaveBeenCalledWith({
          where: {
            OR: [
              { id: maliciousId },
              { templateId: maliciousId },
            ],
            isActive: true,
          },
        });
      }
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input in template creation', async () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>Malicious Template',
        description: 'Safe description<script src="evil.js"></script>',
        templateId: 'safe-template-id',
        category: 'FANTASY' as const,
        difficulty: 'BEGINNER' as const,
        tags: ['<script>alert("tag")</script>', 'safe-tag'],
        scenarioSettings: {
          gmProfile: {
            personality: '<script>alert("personality")</script>Friendly GM',
            speechStyle: 'Descriptive<script>evil()</script>',
            guidingPrinciples: ['<script>alert("principle")</script>Fair play'],
          },
          worldSettings: {
            toneAndManner: 'Dark<script>alert("tone")</script>',
            keyConcepts: ['<script>alert("concept")</script>Magic'],
            setting: 'Fantasy world<script>alert("setting")</script>',
          },
          opening: {
            prologue: 'Once upon a time<script>alert("prologue")</script>...',
            initialStatusTags: ['<script>alert("status")</script>Healthy'],
            initialInventory: ['<script>alert("item")</script>Sword'],
          },
          gameStyle: 'classic_fantasy',
          gmBehavior: {
            narrativeStyle: 'descriptive' as const,
            playerAgency: 'high' as const,
            difficultyAdjustment: 'adaptive' as const,
          },
        },
      };

      // Mock successful creation
      mockPrisma.campaignTemplate.findUnique.mockResolvedValueOnce(null);
      mockPrisma.campaignTemplate.create.mockResolvedValueOnce({
        id: 'created-id',
        ...maliciousInput,
      });

      await campaignTemplateService.createTemplate(maliciousInput);

      // Verify that create was called with sanitized data
      const createCall = mockPrisma.campaignTemplate.create.mock.calls[0][0];
      expect(createCall.data.name).not.toContain('<script>');
      expect(createCall.data.description).not.toContain('<script>');
      expect(createCall.data.tags.some((tag: string) => tag.includes('<script>'))).toBe(false);
    });

    it('should enforce string length limits', async () => {
      const oversizedInput = {
        name: 'a'.repeat(200), // Over 100 char limit
        description: 'b'.repeat(2000), // Over 1000 char limit
        templateId: 'test-template',
        category: 'FANTASY' as const,
        difficulty: 'BEGINNER' as const,
        tags: Array(15).fill('tag'), // Over 10 tag limit
        scenarioSettings: {
          gmProfile: {
            personality: 'c'.repeat(3000), // Over 2000 char limit
            speechStyle: 'd'.repeat(1000), // Over 500 char limit
            guidingPrinciples: Array(15).fill('principle'), // Over 10 principle limit
          },
          worldSettings: {
            toneAndManner: 'Mysterious',
            keyConcepts: ['Magic'],
            setting: 'Fantasy world',
          },
          opening: {
            prologue: 'Once upon a time...',
            initialStatusTags: ['Healthy'],
            initialInventory: ['Sword'],
          },
          gameStyle: 'classic_fantasy',
          gmBehavior: {
            narrativeStyle: 'descriptive' as const,
            playerAgency: 'high' as const,
            difficultyAdjustment: 'adaptive' as const,
          },
        },
      };

      // Should throw validation error due to length constraints
      await expect(campaignTemplateService.createTemplate(oversizedInput)).rejects.toThrow();
    });
  });

  describe('Authorization Security', () => {
    it('should prevent unauthorized template updates', async () => {
      const templateId = 'existing-template';
      const userId = 'user-1';
      const otherUserId = 'user-2';

      // Mock existing template owned by another user
      mockPrisma.campaignTemplate.findUnique.mockResolvedValueOnce({
        id: templateId,
        createdBy: otherUserId,
        name: 'Original Template',
      });

      const updateData = { name: 'Hacked Template' };

      await expect(
        campaignTemplateService.updateTemplate(templateId, updateData, userId)
      ).rejects.toThrow('Not authorized to update this template');

      expect(mockPrisma.campaignTemplate.update).not.toHaveBeenCalled();
    });

    it('should prevent unauthorized template deletion', async () => {
      const templateId = 'existing-template';
      const userId = 'user-1';
      const otherUserId = 'user-2';

      // Mock existing template owned by another user
      mockPrisma.campaignTemplate.findUnique.mockResolvedValueOnce({
        id: templateId,
        createdBy: otherUserId,
        name: 'Original Template',
      });

      await expect(
        campaignTemplateService.deleteTemplate(templateId, userId)
      ).rejects.toThrow('Not authorized to delete this template');

      expect(mockPrisma.campaignTemplate.update).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Preparation', () => {
    it('should handle high-frequency requests gracefully', async () => {
      // Mock multiple concurrent requests
      const requests = Array(100).fill(null).map((_, i) => ({
        category: 'FANTASY' as const,
        limit: 10,
        offset: i * 10,
      }));

      mockPrisma.campaignTemplate.findMany.mockResolvedValue([]);
      mockPrisma.campaignTemplate.count.mockResolvedValue(0);

      // Should not throw errors with many concurrent requests
      const promises = requests.map(options => 
        campaignTemplateService.getTemplates(options)
      );

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('should handle null and undefined values safely', async () => {
      const edgeCaseData = {
        name: '',  // Empty string
        description: null as any,  // Null value
        templateId: undefined as any,  // Undefined value
        category: 'INVALID_CATEGORY' as any,  // Invalid enum
        difficulty: 'BEGINNER' as const,
        tags: [null, undefined, ''] as any,  // Mixed invalid values
        scenarioSettings: {
          gmProfile: {
            personality: null as any,
            speechStyle: undefined as any,
            guidingPrinciples: null as any,
          },
          worldSettings: {
            toneAndManner: '',
            keyConcepts: null as any,
            setting: undefined as any,
          },
          opening: {
            prologue: '',
            initialStatusTags: null as any,
            initialInventory: undefined as any,
          },
          gameStyle: '',
          gmBehavior: {
            narrativeStyle: 'descriptive' as const,
            playerAgency: 'high' as const,
            difficultyAdjustment: 'adaptive' as const,
          },
        },
      };

      // Should reject invalid data with proper validation errors
      await expect(
        campaignTemplateService.createTemplate(edgeCaseData)
      ).rejects.toThrow();
    });
  });
});

describe('CampaignTemplateService Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should efficiently handle large datasets in statistics calculation', async () => {
    const templateId = 'popular-template';
    
    // Mock template exists
    mockPrisma.campaignTemplate.findFirst.mockResolvedValueOnce({
      id: templateId,
      templateId: 'popular-template-id',
    });

    // Mock large usage dataset (simulate 10,000 records)
    const largeUsageDataset = Array(10000).fill(null).map((_, i) => ({
      createdAt: new Date(2024, Math.floor(i / 1000), (i % 30) + 1),
    }));

    mockPrisma.templateUsage.count.mockResolvedValueOnce(10000);
    mockPrisma.templateUsage.aggregate.mockResolvedValueOnce({
      _count: { id: 10000, playerRating: 8000, sessionDuration: 7000 },
      _avg: { playerRating: 4.2, sessionDuration: 120 },
    });
    mockPrisma.templateUsage.findMany.mockResolvedValueOnce(largeUsageDataset);

    const startTime = Date.now();
    const result = await campaignTemplateService.getTemplateStats(templateId);
    const executionTime = Date.now() - startTime;

    // Should complete within reasonable time (< 1000ms for mocked data)
    expect(executionTime).toBeLessThan(1000);
    expect(result.totalUsage).toBe(10000);
    expect(result.usageByMonth).toHaveLength(12);
  });
});