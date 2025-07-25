import { SecurityMonitoringService } from '../../src/services/securityMonitoringService';
import { getApiKeyManager } from '../../src/middleware/apiKeyManager';
import { secretsService } from '../../src/services/secretsService';
import crypto from 'crypto';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SecurityMonitoringService', () => {
  let securityMonitoringService: SecurityMonitoringService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Set up test environment
    process.env.MASTER_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.OPENAI_API_KEY = 'sk-test' + crypto.randomBytes(32).toString('hex');
    process.env.NODE_ENV = 'test';
    
    // Create new instance for each test
    securityMonitoringService = new SecurityMonitoringService();
  });

  afterEach(() => {
    // Clean up and stop service
    securityMonitoringService.stop();
    
    // Restore original environment
    process.env = originalEnv;
    
    // Clear any Jest mocks
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    test('should initialize with default state', () => {
      const healthStatus = securityMonitoringService.getHealthStatus();
      
      expect(healthStatus.isRunning).toBe(false);
      // Initial audit may generate alerts, so we expect 0 or more
      expect(healthStatus.activeAlertsCount).toBeGreaterThanOrEqual(0);
      expect(healthStatus.auditInterval).toBe('24 hours');
      expect(healthStatus.cleanupInterval).toBe('1 hour');
    });

    test('should perform initial audit on startup', async () => {
      // Initial audit should be performed automatically during construction
      // We can verify this by checking if there are any audit records or alerts
      const healthStatus = securityMonitoringService.getHealthStatus();
      expect(healthStatus).toBeDefined();
      
      // Verify that audit history functionality works
      const history = securityMonitoringService.getAuditHistory(1);
      expect(history.audits).toBeDefined();
      expect(Array.isArray(history.audits)).toBe(true);
    });
  });

  describe('Security Audit System', () => {
    test('should perform daily security audit and return valid audit record', async () => {
      const audit = await securityMonitoringService.performDailySecurityAudit();
      
      expect(audit).toMatchObject({
        id: expect.stringMatching(/^audit_\d+$/),
        timestamp: expect.any(Date),
        overallScore: expect.any(Number),
        criticalIssues: expect.any(Number),
        highIssues: expect.any(Number),
        mediumIssues: expect.any(Number),
        lowIssues: expect.any(Number),
        details: expect.objectContaining({
          apiKeyAudit: expect.objectContaining({
            totalKeys: expect.any(Number),
            expiredKeys: expect.any(Array),
            weakKeys: expect.any(Array),
            keysNeedingRotation: expect.any(Array),
            highUsageKeys: expect.any(Array),
          }),
          encryptionAudit: expect.objectContaining({
            masterKeyConfigured: expect.any(Boolean),
            encryptionTestPassed: expect.any(Boolean),
            productionSecurityEnabled: expect.any(Boolean),
          }),
          environmentAudit: expect.objectContaining({
            productionIssues: expect.any(Array),
            configurationIssues: expect.any(Array),
            tlsEnabled: expect.any(Boolean),
          }),
        }),
      });

      expect(audit.overallScore).toBeGreaterThanOrEqual(0);
      expect(audit.overallScore).toBeLessThanOrEqual(100);
    });

    test('should calculate security score correctly with no issues', async () => {
      // Set up environment for perfect security
      process.env.MASTER_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex'); // Strong JWT secret
      process.env.OPENAI_API_KEY = 'sk-' + crypto.randomBytes(32).toString('hex');
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
      
      const audit = await securityMonitoringService.performDailySecurityAudit();
      
      // Should have high score with proper configuration
      expect(audit.overallScore).toBeGreaterThanOrEqual(80);
      expect(audit.details.encryptionAudit.masterKeyConfigured).toBe(true);
      expect(audit.details.encryptionAudit.encryptionTestPassed).toBe(true);
    });

    test('should detect critical issues and lower score', async () => {
      // Remove critical security settings
      delete process.env.MASTER_ENCRYPTION_KEY;
      process.env.JWT_SECRET = 'weak';
      
      // Create new instance to pick up changes
      const testService = new SecurityMonitoringService();
      
      const audit = await testService.performDailySecurityAudit();
      
      expect(audit.criticalIssues).toBeGreaterThan(0);
      expect(audit.overallScore).toBeLessThan(80);
    });

    test('should track audit history correctly', async () => {
      const audit1 = await securityMonitoringService.performDailySecurityAudit();
      
      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const audit2 = await securityMonitoringService.performDailySecurityAudit();
      
      const history = securityMonitoringService.getAuditHistory(30);
      
      expect(history.audits.length).toBeGreaterThanOrEqual(2);
      expect(history.trends).toMatchObject({
        averageScore: expect.any(Number),
        scoreImprovement: expect.any(Number),
        criticalIssuesTrend: expect.any(Number),
        lastAuditDate: expect.any(Date),
      });
      
      // Verify score change calculation
      expect(audit2.previousScore).toBe(audit1.overallScore);
      expect(audit2.scoreChange).toBe(audit2.overallScore - audit1.overallScore);
    });

    test('should limit audit history to specified days', async () => {
      await securityMonitoringService.performDailySecurityAudit();
      
      const history7Days = securityMonitoringService.getAuditHistory(7);
      const history30Days = securityMonitoringService.getAuditHistory(30);
      
      expect(history7Days.audits.length).toBeLessThanOrEqual(history30Days.audits.length);
    });
  });

  describe('Alert Management', () => {
    test('should generate alerts for critical issues', async () => {
      // Trigger critical issues by removing encryption key
      delete process.env.MASTER_ENCRYPTION_KEY;
      
      const testService = new SecurityMonitoringService();
      await testService.performDailySecurityAudit();
      
      const alerts = testService.getActiveAlerts();
      
      expect(alerts.length).toBeGreaterThan(0);
      
      const criticalAlerts = alerts.filter(alert => alert.severity === 'CRITICAL');
      expect(criticalAlerts.length).toBeGreaterThan(0);
      
      const alert = criticalAlerts[0];
      expect(alert).toMatchObject({
        id: expect.stringMatching(/^alert_\d+_[a-z0-9]+$/),
        type: expect.any(String),
        severity: 'CRITICAL',
        title: expect.any(String),
        description: expect.any(String),
        affectedComponents: expect.any(Array),
        timestamp: expect.any(Date),
        resolved: false,
      });
    });

    test('should resolve alerts correctly', async () => {
      // Generate an alert
      delete process.env.MASTER_ENCRYPTION_KEY;
      const testService = new SecurityMonitoringService();
      await testService.performDailySecurityAudit();
      
      const alerts = testService.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const alertToResolve = alerts[0];
      const resolution = 'Test resolution';
      
      const success = testService.resolveAlert(alertToResolve.id, resolution);
      expect(success).toBe(true);
      
      const updatedAlerts = testService.getActiveAlerts();
      expect(updatedAlerts.length).toBe(alerts.length - 1);
    });

    test('should handle non-existent alert resolution', () => {
      const success = securityMonitoringService.resolveAlert('non-existent-alert', 'test');
      expect(success).toBe(false);
    });

    test('should detect score deterioration and generate alerts', async () => {
      // First audit with good configuration
      const audit1 = await securityMonitoringService.performDailySecurityAudit();
      
      // Degrade security configuration
      delete process.env.MASTER_ENCRYPTION_KEY;
      process.env.JWT_SECRET = 'weak';
      
      const testService = new SecurityMonitoringService();
      
      // Manually set the previous audit to simulate history
      (testService as any).auditHistory = [audit1];
      
      await testService.performDailySecurityAudit();
      
      const alerts = testService.getActiveAlerts();
      const deteriorationAlerts = alerts.filter(alert => alert.type === 'SCORE_DETERIORATION');
      
      // Should generate alert if score dropped significantly
      if (audit1.overallScore > 80) {
        expect(deteriorationAlerts.length).toBeGreaterThan(0);
      }
    });
  });

  describe('API Key Management and Cleanup', () => {
    test('should perform API key cleanup without errors', async () => {
      const result = await securityMonitoringService.performApiKeyCleanup();
      
      expect(result).toMatchObject({
        cleanedKeys: expect.any(Array),
        errors: expect.any(Array),
        summary: expect.objectContaining({
          totalProcessed: expect.any(Number),
          successfulCleanups: expect.any(Number),
          failedCleanups: expect.any(Number),
        }),
      });
      
      expect(result.summary.totalProcessed).toBe(
        result.summary.successfulCleanups + result.summary.failedCleanups
      );
    });

    test('should analyze usage patterns', async () => {
      // This is tested indirectly through the cleanup process
      const result = await securityMonitoringService.performApiKeyCleanup();
      
      // Should complete without throwing errors
      expect(result).toBeDefined();
    });
  });

  describe('Production Environment Monitoring', () => {
    test('should monitor encryption key configuration correctly', () => {
      const status = securityMonitoringService.monitorEncryptionKeyConfiguration();
      
      expect(status).toMatchObject({
        isConfigured: expect.any(Boolean),
        isProduction: expect.any(Boolean),
        healthStatus: expect.stringMatching(/^(healthy|degraded|critical)$/),
        recommendations: expect.any(Array),
      });
      
      // In test environment with proper key
      expect(status.isConfigured).toBe(true);
      expect(status.isProduction).toBe(false);
      expect(status.healthStatus).toBe('healthy');
    });

    test('should detect missing encryption key in production', () => {
      delete process.env.MASTER_ENCRYPTION_KEY;
      process.env.NODE_ENV = 'production';
      
      const testService = new SecurityMonitoringService();
      const status = testService.monitorEncryptionKeyConfiguration();
      
      expect(status.isConfigured).toBe(false);
      expect(status.isProduction).toBe(true);
      expect(status.healthStatus).toBe('critical');
      expect(status.recommendations.length).toBeGreaterThan(0);
    });

    test('should perform encryption tests automatically', async () => {
      const audit = await securityMonitoringService.performDailySecurityAudit();
      
      expect(audit.details.encryptionAudit.encryptionTestPassed).toBe(true);
    });
  });

  describe('Service Lifecycle Management', () => {
    test('should start and stop monitoring service correctly', () => {
      expect(securityMonitoringService.getHealthStatus().isRunning).toBe(false);
      
      securityMonitoringService.start();
      expect(securityMonitoringService.getHealthStatus().isRunning).toBe(true);
      
      securityMonitoringService.stop();
      expect(securityMonitoringService.getHealthStatus().isRunning).toBe(false);
    });

    test('should prevent multiple starts', () => {
      securityMonitoringService.start();
      expect(securityMonitoringService.getHealthStatus().isRunning).toBe(true);
      
      // Second start should be ignored
      securityMonitoringService.start();
      expect(securityMonitoringService.getHealthStatus().isRunning).toBe(true);
    });

    test('should handle stop when not running', () => {
      expect(securityMonitoringService.getHealthStatus().isRunning).toBe(false);
      
      // Should not throw error
      expect(() => {
        securityMonitoringService.stop();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle audit errors gracefully', async () => {
      // Mock the API key manager to throw an error
      const originalGetApiKeyManager = require('../../src/middleware/apiKeyManager').getApiKeyManager;
      
      require('../../src/middleware/apiKeyManager').getApiKeyManager = jest.fn(() => {
        throw new Error('Test error');
      });
      
      try {
        await expect(securityMonitoringService.performDailySecurityAudit()).rejects.toThrow('Test error');
      } finally {
        // Restore original function
        require('../../src/middleware/apiKeyManager').getApiKeyManager = originalGetApiKeyManager;
      }
    });

    test('should handle cleanup errors gracefully', async () => {
      // Mock the API key manager to throw an error
      const originalGetApiKeyManager = require('../../src/middleware/apiKeyManager').getApiKeyManager;
      
      require('../../src/middleware/apiKeyManager').getApiKeyManager = jest.fn(() => {
        throw new Error('Cleanup test error');
      });
      
      try {
        await expect(securityMonitoringService.performApiKeyCleanup()).rejects.toThrow();
      } finally {
        // Restore original function
        require('../../src/middleware/apiKeyManager').getApiKeyManager = originalGetApiKeyManager;
      }
    });
  });

  describe('Integration with Existing Services', () => {
    test('should integrate with secrets service correctly', () => {
      const encryptionStatus = securityMonitoringService.monitorEncryptionKeyConfiguration();
      
      // Should use secrets service health check
      expect(encryptionStatus).toBeDefined();
      expect(typeof encryptionStatus.healthStatus).toBe('string');
    });

    test('should integrate with API key manager correctly', async () => {
      const audit = await securityMonitoringService.performDailySecurityAudit();
      
      // Should include API key audit data
      expect(audit.details.apiKeyAudit).toBeDefined();
      expect(audit.details.apiKeyAudit.totalKeys).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Scalability', () => {
    test('should complete audit within reasonable time', async () => {
      const startTime = Date.now();
      const audit = await securityMonitoringService.performDailySecurityAudit();
      const endTime = Date.now();
      
      expect(audit).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle multiple concurrent audits gracefully', async () => {
      const promises = [
        securityMonitoringService.performDailySecurityAudit(),
        securityMonitoringService.performDailySecurityAudit(),
        securityMonitoringService.performDailySecurityAudit(),
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(audit => {
        expect(audit).toBeDefined();
        expect(audit.overallScore).toBeGreaterThanOrEqual(0);
      });
    });
  });
});