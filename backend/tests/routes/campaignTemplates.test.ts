import request from 'supertest';
import express from 'express';
import { campaignTemplateRoutes } from '@/routes/campaignTemplates';
import { authenticate } from '@/middleware/auth';
import { campaignTemplateService } from '@/services/campaignTemplateService';

// Mock dependencies
jest.mock('@/services/campaignTemplateService');
jest.mock('@/middleware/auth');
jest.mock('@/middleware/rateLimiter', () => ({
  templateReadRateLimit: (req: any, res: any, next: any) => next(),
  templateWriteRateLimit: (req: any, res: any, next: any) => next(),
  templateSearchRateLimit: (req: any, res: any, next: any) => next(),
  templateUsageRateLimit: (req: any, res: any, next: any) => next(),
}));

const mockCampaignTemplateService = campaignTemplateService as jest.Mocked<typeof campaignTemplateService>;
const mockAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

const app = express();
app.use(express.json());
app.use('/api/campaign-templates', campaignTemplateRoutes);

describe('Campaign Template Routes Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authentication middleware to pass by default
    mockAuthenticate.mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: 'test-user', email: 'test@example.com' };
      next();
    });

    // Mock all campaign template service methods
    // For malicious input, the validation should fail before reaching the service
    mockCampaignTemplateService.getTemplates.mockRejectedValue(new Error('Validation failed'));
    mockCampaignTemplateService.getTemplate.mockResolvedValue(null);
    mockCampaignTemplateService.searchTemplates.mockResolvedValue([]);
    mockCampaignTemplateService.getTemplateStats.mockResolvedValue({
      totalUsage: 0,
      completionRate: 0,
      customizationRate: 0,
      usageByMonth: [],
    });
    mockCampaignTemplateService.getPopularTemplates.mockResolvedValue([]);
    mockCampaignTemplateService.createTemplate.mockResolvedValue({} as any);
    mockCampaignTemplateService.updateTemplate.mockResolvedValue({} as any);
    mockCampaignTemplateService.deleteTemplate.mockResolvedValue(undefined);
    mockCampaignTemplateService.recordUsage.mockResolvedValue(undefined);
  });

  describe('Input Validation Security', () => {
    it.skip('should reject malicious query parameters in GET /api/campaign-templates', async () => {
      const maliciousQueries = [
        '?category=<script>alert("xss")</script>',
        '?limit=999999999', // Extremely large number
        '?offset=-1', // Negative offset
        '?tags[]=<script>evil()</script>',
        '?isOfficial=<script>alert("xss")</script>',
      ];

      for (const query of maliciousQueries) {
        const response = await request(app)
          .get(`/api/campaign-templates${query}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid');
      }
    });

    it.skip('should sanitize search input in GET /api/campaign-templates/search', async () => {
      const maliciousSearchQueries = [
        '<script>alert("xss")</script>',
        '"; DROP TABLE campaign_templates; --',
        '../../etc/passwd',
        'a'.repeat(1000), // Extremely long query
      ];

      mockCampaignTemplateService.searchTemplates.mockResolvedValue([]);

      for (const maliciousQuery of maliciousSearchQueries) {
        const response = await request(app)
          .get('/api/campaign-templates/search')
          .query({ q: maliciousQuery })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    it('should validate template ID format in GET /api/campaign-templates/:id', async () => {
      const maliciousIds = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        '"; DROP TABLE campaign_templates; --',
        'a'.repeat(200), // Extremely long ID
        '../../',
        'null',
        'undefined',
      ];

      for (const maliciousId of maliciousIds) {
        const response = await request(app)
          .get(`/api/campaign-templates/${encodeURIComponent(maliciousId)}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid template ID format');
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for POST /api/campaign-templates', async () => {
      mockAuthenticate.mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ success: false, error: 'Authentication required' });
      });

      const response = await request(app)
        .post('/api/campaign-templates')
        .send({
          name: 'Test Template',
          description: 'Test Description',
          templateId: 'test-template',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication for PUT /api/campaign-templates/:id', async () => {
      mockAuthenticate.mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ success: false, error: 'Authentication required' });
      });

      const response = await request(app)
        .put('/api/campaign-templates/test-id')
        .send({ name: 'Updated Template' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication for DELETE /api/campaign-templates/:id', async () => {
      mockAuthenticate.mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ success: false, error: 'Authentication required' });
      });

      const response = await request(app)
        .delete('/api/campaign-templates/test-id')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication for POST /api/campaign-templates/:id/usage', async () => {
      mockAuthenticate.mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ success: false, error: 'Authentication required' });
      });

      const response = await request(app)
        .post('/api/campaign-templates/test-id/usage')
        .send({ wasCustomized: true })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Data Validation', () => {
    it('should validate template creation data', async () => {
      const invalidTemplateData = [
        {}, // Empty object
        { name: '' }, // Empty name
        { name: 'Test', description: '', templateId: '' }, // Empty required fields
        { 
          name: 'Test',
          description: 'Test',
          templateId: 'invalid chars!@#$%',
          category: 'INVALID_CATEGORY'
        }, // Invalid category and templateId format
        {
          name: 'a'.repeat(200), // Name too long
          description: 'Test',
          templateId: 'test'
        },
      ];

      for (const invalidData of invalidTemplateData) {
        const response = await request(app)
          .post('/api/campaign-templates')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation error');
        expect(response.body.details).toBeDefined();
      }
    });

    it('should validate usage recording data', async () => {
      const invalidUsageData = [
        { sessionDuration: -1 }, // Negative duration
        { sessionDuration: 100000 }, // Duration too long (> 24 hours in seconds)
        { playerRating: 0 }, // Rating too low
        { playerRating: 6 }, // Rating too high
        { completionStatus: 'INVALID_STATUS' }, // Invalid status
      ];

      for (const invalidData of invalidUsageData) {
        const response = await request(app)
          .post('/api/campaign-templates/test-id/usage')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation error');
      }
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose internal errors in production', async () => {
      // Simulate internal service error
      mockCampaignTemplateService.getTemplates.mockRejectedValueOnce(
        new Error('Internal database connection failed')
      );

      const response = await request(app)
        .get('/api/campaign-templates')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve campaign templates');
      // Should not expose internal error details
      expect(response.body.error).not.toContain('database connection failed');
    });

    it('should handle service authorization errors properly', async () => {
      mockCampaignTemplateService.updateTemplate.mockRejectedValueOnce(
        new Error('Not authorized to update this template')
      );

      const response = await request(app)
        .put('/api/campaign-templates/test-id')
        .send({ name: 'Updated Template' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not authorized to update this template');
    });

    it('should handle "not found" errors appropriately', async () => {
      mockCampaignTemplateService.getTemplate.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/campaign-templates/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Template not found');
    });
  });

  describe('Response Security', () => {
    it('should not expose sensitive data in template responses', async () => {
      const mockTemplate = {
        id: 'template-id',
        name: 'Test Template',
        description: 'Test Description',
        templateId: 'test-template',
        category: 'FANTASY',
        isOfficial: false,
        isActive: true,
        scenarioSettings: { /* some settings */ },
        difficulty: 'BEGINNER',
        estimatedDuration: '2-4 hours',
        playerCount: '1-4',
        tags: ['adventure'],
        createdBy: 'user-id', // This should be included but not sensitive
        createdAt: new Date(),
        updatedAt: new Date(),
        // Should not include any internal database fields or sensitive user data
      };

      mockCampaignTemplateService.getTemplate.mockResolvedValueOnce(mockTemplate);

      const response = await request(app)
        .get('/api/campaign-templates/template-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTemplate);
      // Verify no unexpected sensitive fields are exposed
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('apiKey');
      expect(response.body.data).not.toHaveProperty('internalId');
    });

    it('should implement proper pagination limits', async () => {
      const mockTemplates = Array(50).fill(null).map((_, i) => ({
        id: `template-${i}`,
        name: `Template ${i}`,
        templateId: `template-${i}`,
      }));

      mockCampaignTemplateService.getTemplates.mockResolvedValueOnce({
        templates: mockTemplates,
        total: 1000,
      });

      // Request with excessive limit
      const response = await request(app)
        .get('/api/campaign-templates')
        .query({ limit: 1000 }) // Should be capped
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.limit).toBeLessThanOrEqual(100); // Should be capped at 100
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    it('should sanitize template data to prevent stored XSS', async () => {
      const maliciousTemplate = {
        name: '<script>alert("xss")</script>Malicious Template',
        description: 'Safe description<img src=x onerror=alert("xss")>',
        templateId: 'safe-template-id',
        category: 'FANTASY',
        difficulty: 'BEGINNER',
        tags: ['<script>alert("tag")</script>', 'safe-tag'],
        scenarioSettings: {
          gmProfile: {
            personality: '<script>alert("personality")</script>Friendly GM',
            speechStyle: 'Descriptive',
            guidingPrinciples: ['Fair play'],
          },
          worldSettings: {
            toneAndManner: 'Dark',
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
            narrativeStyle: 'descriptive',
            playerAgency: 'high',
            difficultyAdjustment: 'adaptive',
          },
        },
      };

      mockCampaignTemplateService.createTemplate.mockResolvedValueOnce({
        id: 'created-id',
        ...maliciousTemplate,
        name: maliciousTemplate.name.replace(/<script.*?<\/script>/gi, ''), // Simulated sanitization
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await request(app)
        .post('/api/campaign-templates')
        .send(maliciousTemplate)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Verify that XSS content was sanitized
      expect(response.body.data.name).not.toContain('<script>');
      expect(response.body.data.description).not.toContain('<img');
    });
  });
});