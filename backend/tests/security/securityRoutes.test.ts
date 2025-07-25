import request from 'supertest';
import express from 'express';
import { securityRoutes } from '../../src/routes/security';
import crypto from 'crypto';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the AI proxy service since it might not be available in tests
jest.mock('../../src/services/aiProxyService', () => ({
  aiProxyService: {
    healthCheck: () => ({ status: 'healthy' }),
    refreshClients: jest.fn(),
    getStats: () => ({
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      averageResponseTime: 250,
    }),
  },
}));

describe('Security Routes Integration Tests', () => {
  let app: express.Application;
  let adminToken: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Set up test environment
    adminToken = crypto.randomBytes(32).toString('hex');
    process.env.ADMIN_TOKEN = adminToken;
    process.env.MASTER_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.OPENAI_API_KEY = 'sk-test' + crypto.randomBytes(32).toString('hex');
    process.env.NODE_ENV = 'test';

    // Create Express app with security routes
    app = express();
    app.use(express.json());
    app.use('/security', securityRoutes);
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Middleware', () => {
    test('should reject requests without admin token', async () => {
      const response = await request(app)
        .get('/security/audit')
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Access denied',
        message: 'Admin access required',
      });
    });

    test('should reject requests with invalid admin token', async () => {
      const response = await request(app)
        .get('/security/audit')
        .set('x-admin-token', 'invalid-token')
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Access denied',
      });
    });

    test('should accept requests with valid admin token', async () => {
      const response = await request(app)
        .get('/security/audit')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Security Audit Endpoints', () => {
    test('GET /security/audit should return security audit data', async () => {
      const response = await request(app)
        .get('/security/audit')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          status: expect.any(String),
          timestamp: expect.any(String),
          components: expect.objectContaining({
            apiKeys: expect.objectContaining({
              status: expect.any(String),
              score: expect.any(Number),
              issues: expect.any(Array),
            }),
            secrets: expect.objectContaining({
              status: expect.any(String),
            }),
            aiProxy: expect.objectContaining({
              status: expect.any(String),
            }),
          }),
        }),
        timestamp: expect.any(String),
      });
    });

    test('GET /security/api-keys/health should return API key health status', async () => {
      const response = await request(app)
        .get('/security/api-keys/health')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          totalKeys: expect.any(Number),
          validKeys: expect.any(Number),
          keysNeedingRotation: expect.any(Number),
          lastCheck: expect.any(String),
          securityAudit: expect.objectContaining({
            weakKeys: expect.any(Array),
            expiredKeys: expect.any(Array),
            highUsageKeys: expect.any(Array),
            overallSecurityScore: expect.any(Number),
          }),
        }),
        timestamp: expect.any(String),
      });
    });
  });

  describe('Security Monitoring Endpoints', () => {
    test('GET /security/monitoring/audit should perform and return security audit', async () => {
      const response = await request(app)
        .get('/security/monitoring/audit')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.stringMatching(/^audit_\d+$/),
          timestamp: expect.any(String),
          overallScore: expect.any(Number),
          criticalIssues: expect.any(Number),
          highIssues: expect.any(Number),
          mediumIssues: expect.any(Number),
          lowIssues: expect.any(Number),
          details: expect.objectContaining({
            apiKeyAudit: expect.any(Object),
            encryptionAudit: expect.any(Object),
            environmentAudit: expect.any(Object),
          }),
        }),
        timestamp: expect.any(String),
      });

      expect(response.body.data.overallScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.overallScore).toBeLessThanOrEqual(100);
    });

    test('GET /security/monitoring/history should return audit history', async () => {
      // First perform an audit to ensure there's history
      await request(app)
        .get('/security/monitoring/audit')
        .set('x-admin-token', adminToken);

      const response = await request(app)
        .get('/security/monitoring/history')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          audits: expect.any(Array),
          trends: expect.objectContaining({
            averageScore: expect.any(Number),
            scoreImprovement: expect.any(Number),
            criticalIssuesTrend: expect.any(Number),
            lastAuditDate: expect.any(String),
          }),
        }),
        timestamp: expect.any(String),
      });
    });

    test('GET /security/monitoring/history with days parameter should limit results', async () => {
      const response = await request(app)
        .get('/security/monitoring/history?days=7')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.audits).toBeDefined();
    });

    test('GET /security/monitoring/alerts should return active alerts', async () => {
      const response = await request(app)
        .get('/security/monitoring/alerts')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          alerts: expect.any(Array),
          count: expect.any(Number),
          critical: expect.any(Number),
          high: expect.any(Number),
          medium: expect.any(Number),
          low: expect.any(Number),
        }),
        timestamp: expect.any(String),
      });
    });

    test('POST /security/monitoring/cleanup should perform API key cleanup', async () => {
      const response = await request(app)
        .post('/security/monitoring/cleanup')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          cleanedKeys: expect.any(Array),
          errors: expect.any(Array),
          summary: expect.objectContaining({
            totalProcessed: expect.any(Number),
            successfulCleanups: expect.any(Number),
            failedCleanups: expect.any(Number),
          }),
        }),
        message: 'API key cleanup completed',
        timestamp: expect.any(String),
      });
    });

    test('GET /security/monitoring/encryption should return encryption status', async () => {
      const response = await request(app)
        .get('/security/monitoring/encryption')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          environmentType: expect.stringMatching(/^(production|non-production)$/),
          encryptionEnabled: expect.any(Boolean),
          healthStatus: expect.stringMatching(/^(healthy|degraded|critical)$/),
          recommendations: expect.any(Array),
          securityLevel: expect.stringMatching(/^(high|medium|low)$/),
        }),
        timestamp: expect.any(String),
        note: expect.any(String),
      });
    });

    test('GET /security/monitoring/health should return service health status', async () => {
      const response = await request(app)
        .get('/security/monitoring/health')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          isRunning: expect.any(Boolean),
          activeAlertsCount: expect.any(Number),
          auditInterval: expect.any(String),
          cleanupInterval: expect.any(String),
        }),
        timestamp: expect.any(String),
      });
    });

    test('POST /security/monitoring/start should start monitoring service', async () => {
      const response = await request(app)
        .post('/security/monitoring/start')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Security monitoring service started',
        timestamp: expect.any(String),
      });
    });

    test('POST /security/monitoring/stop should stop monitoring service', async () => {
      const response = await request(app)
        .post('/security/monitoring/stop')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Security monitoring service stopped',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Alert Management Endpoints', () => {
    test('POST /security/monitoring/alerts/:alertId/resolve should resolve alert', async () => {
      // First create an alert by triggering a critical issue
      const originalKey = process.env.MASTER_ENCRYPTION_KEY;
      delete process.env.MASTER_ENCRYPTION_KEY;

      // Perform audit to generate alerts
      await request(app)
        .get('/security/monitoring/audit')
        .set('x-admin-token', adminToken);

      // Get alerts to find one to resolve
      const alertsResponse = await request(app)
        .get('/security/monitoring/alerts')
        .set('x-admin-token', adminToken);

      // Restore environment
      process.env.MASTER_ENCRYPTION_KEY = originalKey;

      if (alertsResponse.body.data.alerts.length > 0) {
        const alertId = alertsResponse.body.data.alerts[0].id;
        const resolution = 'Test resolution';

        const response = await request(app)
          .post(`/security/monitoring/alerts/${alertId}/resolve`)
          .set('x-admin-token', adminToken)
          .send({ resolution })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Alert resolved successfully',
          timestamp: expect.any(String),
        });
      }
    });

    test('POST /security/monitoring/alerts/:alertId/resolve should return 404 for non-existent alert', async () => {
      const response = await request(app)
        .post('/security/monitoring/alerts/non-existent-alert/resolve')
        .set('x-admin-token', adminToken)
        .send({ resolution: 'test' })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Alert not found',
      });
    });
  });

  describe('API Key Management Endpoints', () => {
    test('POST /security/api-keys/generate should generate new API key', async () => {
      const response = await request(app)
        .post('/security/api-keys/generate')
        .set('x-admin-token', adminToken)
        .send({ keyName: 'test-key' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          keyName: 'test-key',
          keyPreview: expect.any(String),
          generated: expect.any(String),
          warning: expect.any(String),
        }),
        message: 'API key generated successfully. Only preview shown for security.',
        timestamp: expect.any(String),
      });
      
      // Ensure full key is NOT returned for security
      expect(response.body.data.key).toBeUndefined();

      // Verify key preview is properly formatted
      expect(response.body.data.keyPreview).toMatch(/^.{8}\.\.\.$/);
    });

    test('POST /security/api-keys/rotate should validate rotation token', async () => {
      const response = await request(app)
        .post('/security/api-keys/rotate')
        .set('x-admin-token', adminToken)
        .send({
          rotationToken: 'invalid-token',
          newKey: crypto.randomBytes(32).toString('hex'),
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
      });
    });

    test('POST /security/api-keys/rotate should validate request data', async () => {
      const response = await request(app)
        .post('/security/api-keys/rotate')
        .set('x-admin-token', adminToken)
        .send({
          rotationToken: '', // Invalid - too short
          newKey: 'short', // Invalid - too short
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid request data',
        details: expect.any(Array),
      });
    });
  });

  describe('AI Proxy Endpoints', () => {
    test('GET /security/ai-proxy/stats should return AI proxy statistics', async () => {
      const response = await request(app)
        .get('/security/ai-proxy/stats')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          stats: expect.objectContaining({
            totalRequests: expect.any(Number),
            successfulRequests: expect.any(Number),
            failedRequests: expect.any(Number),
            averageResponseTime: expect.any(Number),
          }),
          health: expect.objectContaining({
            status: expect.any(String),
          }),
        }),
        timestamp: expect.any(String),
      });
    });

    test('POST /security/ai-proxy/refresh should refresh AI proxy clients', async () => {
      const response = await request(app)
        .post('/security/ai-proxy/refresh')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'AI proxy clients refreshed successfully',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Secrets Service Endpoints', () => {
    test('POST /security/secrets/test should test secrets service functionality', async () => {
      const response = await request(app)
        .post('/security/secrets/test')
        .set('x-admin-token', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          encryptionTest: expect.any(Boolean),
          testCompleted: expect.any(String),
        }),
        message: expect.stringMatching(/(passed|failed)/),
        timestamp: expect.any(String),
      });

      expect(response.body.data.encryptionTest).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle internal server errors gracefully', async () => {
      // Mock a service to throw an error
      const originalSecurityMonitoringService = require('../../src/services/securityMonitoringService').securityMonitoringService;
      
      require('../../src/services/securityMonitoringService').securityMonitoringService = {
        performDailySecurityAudit: jest.fn().mockRejectedValue(new Error('Test error')),
      };

      const response = await request(app)
        .get('/security/monitoring/audit')
        .set('x-admin-token', adminToken)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Security monitoring audit failed',
        message: 'Test error',
      });

      // Restore original service
      require('../../src/services/securityMonitoringService').securityMonitoringService = originalSecurityMonitoringService;
    });

    test('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/security/monitoring/alerts/test-alert/resolve')
        .set('x-admin-token', adminToken)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Express should handle this automatically and return 400
      expect(response.status).toBe(400);
    });
  });

  describe('Response Format Validation', () => {
    test('all endpoints should return consistent response format', async () => {
      const endpoints = [
        'GET /security/audit',
        'GET /security/api-keys/health',
        'GET /security/monitoring/audit',
        'GET /security/monitoring/history',
        'GET /security/monitoring/alerts',
        'GET /security/monitoring/encryption',
        'GET /security/monitoring/health',
        'GET /security/ai-proxy/stats',
      ];

      for (const endpoint of endpoints) {
        const [method, path] = endpoint.split(' ');
        const response = await request(app)
          [method.toLowerCase() as 'get'](path)
          .set('x-admin-token', adminToken);

        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('timestamp');
        expect(typeof response.body.success).toBe('boolean');
        expect(typeof response.body.timestamp).toBe('string');

        if (response.body.success) {
          expect(response.body).toHaveProperty('data');
        } else {
          expect(response.body).toHaveProperty('error');
        }
      }
    });

    test('POST endpoints should return consistent response format', async () => {
      const postEndpoints = [
        {
          path: '/security/monitoring/start',
          body: {},
        },
        {
          path: '/security/monitoring/stop',
          body: {},
        },
        {
          path: '/security/monitoring/cleanup',
          body: {},
        },
        {
          path: '/security/api-keys/generate',
          body: { keyName: 'test' },
        },
        {
          path: '/security/ai-proxy/refresh',
          body: {},
        },
        {
          path: '/security/secrets/test',
          body: {},
        },
      ];

      for (const endpoint of postEndpoints) {
        const response = await request(app)
          .post(endpoint.path)
          .set('x-admin-token', adminToken)
          .send(endpoint.body);

        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('timestamp');
        expect(typeof response.body.success).toBe('boolean');
        expect(typeof response.body.timestamp).toBe('string');
      }
    });
  });
});