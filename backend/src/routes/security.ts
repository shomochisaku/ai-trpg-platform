import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { apiKeyManager } from '@/middleware/apiKeyManager';
import { secretsService } from '@/services/secretsService';
import { aiProxyService } from '@/services/aiProxyService';
import { securityMonitoringService } from '@/services/securityMonitoringService';
import { logger } from '@/utils/logger';
import { securityConfig } from '@/config/securityMonitoringConfig';

const router = Router();

// Request validation schemas
const rotateKeySchema = z.object({
  rotationToken: z.string().min(1),
  newKey: z.string().min(32), // Minimum key length
});

const generateKeySchema = z.object({
  keyName: z
    .string()
    .min(1, 'Key name is required')
    .max(50, 'Key name must be 50 characters or less')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Key name can only contain letters, numbers, hyphens, and underscores'
    )
    .optional(),
});

const alertResolutionSchema = z.object({
  resolution: z
    .string()
    .min(1, 'Resolution description is required')
    .max(500, 'Resolution description must be 500 characters or less')
    .optional(),
});

const historyQuerySchema = z.object({
  days: z
    .string()
    .regex(/^\d+$/, 'Days must be a positive integer')
    .transform(val => parseInt(val, 10))
    .refine(
      val => val >= securityConfig.MIN_DAYS_PARAM,
      `Days must be at least ${securityConfig.MIN_DAYS_PARAM}`
    )
    .refine(
      val => val <= securityConfig.MAX_DAYS_PARAM,
      `Days must be at most ${securityConfig.MAX_DAYS_PARAM}`
    )
    .optional()
    .default(securityConfig.DEFAULT_DAYS_PARAM.toString()),
});

// Admin authentication middleware (placeholder - in production, use proper admin auth)
const requireAdminAccess = (
  req: Request,
  res: Response,
  next: () => void
): void => {
  // In production, implement proper admin authentication
  const adminToken = req.headers['x-admin-token'];
  const expectedToken = process.env.ADMIN_TOKEN;

  // Use timing-safe comparison to prevent timing attacks
  let isValidToken = false;
  if (adminToken && expectedToken && typeof adminToken === 'string') {
    try {
      // Ensure both tokens are the same length for timing-safe comparison
      if (adminToken.length === expectedToken.length) {
        isValidToken = crypto.timingSafeEqual(
          Buffer.from(adminToken, 'utf8'),
          Buffer.from(expectedToken, 'utf8')
        );
      }
    } catch (error) {
      // If comparison fails, treat as invalid token
      isValidToken = false;
    }
  }

  if (!isValidToken) {
    logger.warn('Unauthorized security endpoint access attempt', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      hasToken: !!adminToken,
      tokenLength: adminToken ? (adminToken as string).length : 0,
    });

    res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Admin access required',
    });
    return;
  }

  next();
};

/**
 * Get comprehensive security audit
 */
router.get('/audit', requireAdminAccess, (req: Request, res: Response) => {
  try {
    const audit = apiKeyManager.performSecurityAudit();
    const secretsHealth = secretsService.healthCheck();
    const aiProxyHealth = aiProxyService.healthCheck();

    const overallHealth = {
      status:
        audit.passed &&
        secretsHealth.status === 'healthy' &&
        aiProxyHealth.status === 'healthy'
          ? 'healthy'
          : 'degraded',
      timestamp: new Date().toISOString(),
      components: {
        apiKeys: {
          status: audit.passed ? 'healthy' : 'degraded',
          score: audit.score,
          issues: audit.issues,
        },
        secrets: secretsHealth,
        aiProxy: aiProxyHealth,
      },
    };

    logger.info('Security audit requested', {
      ip: req.ip,
      overallStatus: overallHealth.status,
      criticalIssues: audit.issues.filter(i => i.severity === 'critical')
        .length,
    });

    res.json({
      success: true,
      data: overallHealth,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Security audit error:', error);
    res.status(500).json({
      success: false,
      error: 'Security audit failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get API key health status
 */
router.get(
  '/api-keys/health',
  requireAdminAccess,
  (req: Request, res: Response) => {
    try {
      const health = apiKeyManager.getHealthStatus();
      res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('API key health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Rotate API key with secure token
 */
router.post(
  '/api-keys/rotate',
  requireAdminAccess,
  (req: Request, res: Response) => {
    try {
      const { rotationToken, newKey } = rotateKeySchema.parse(req.body);

      const result = apiKeyManager.rotateKeyWithToken(rotationToken, newKey);

      if (result.success) {
        logger.info('API key rotated via admin endpoint', {
          ip: req.ip,
          timestamp: new Date().toISOString(),
        });

        res.json({
          success: true,
          message: 'API key rotated successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Key rotation failed',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('API key rotation error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Key rotation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Generate new API key
 */
router.post(
  '/api-keys/generate',
  requireAdminAccess,
  (req: Request, res: Response) => {
    try {
      const validatedData = generateKeySchema.parse(req.body);
      const keyName = validatedData.keyName || 'generated-key';
      const newKey = apiKeyManager.generateNewApiKey();
      const keyPreview = newKey.substring(0, 8) + '...';

      // Log only the preview, never the full key
      logger.info('New API key generated via admin endpoint', {
        keyName,
        keyPreview,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      // Store the full key securely (in production, this would be encrypted)
      // Log warning about secure storage without exposing sensitive data
      logger.warn(
        'SECURITY: API key generated. Secure transmission required.',
        {
          keyName,
          generated: new Date().toISOString(),
          ip: req.ip,
        }
      );

      // Minimized response to prevent information disclosure
      res.json({
        success: true,
        data: {
          keyName,
          keyPreview,
        },
        message:
          'API key generated. Contact administrator for secure retrieval.',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('API key generation error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message:
          'Operation could not be completed. Please try again or contact support.',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * Get AI proxy statistics
 */
router.get(
  '/ai-proxy/stats',
  requireAdminAccess,
  (req: Request, res: Response) => {
    try {
      const stats = aiProxyService.getStats();
      const health = aiProxyService.healthCheck();

      res.json({
        success: true,
        data: {
          stats,
          health,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('AI proxy stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get AI proxy stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Refresh AI proxy clients (for key rotation)
 */
router.post(
  '/ai-proxy/refresh',
  requireAdminAccess,
  (req: Request, res: Response) => {
    try {
      aiProxyService.refreshClients();

      logger.info('AI proxy clients refreshed via admin endpoint', {
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: 'AI proxy clients refreshed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('AI proxy refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh AI proxy clients',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Test secrets service functionality
 */
router.post(
  '/secrets/test',
  requireAdminAccess,
  (req: Request, res: Response) => {
    try {
      const testValue = 'test-encryption-value-' + Date.now();
      const encrypted = secretsService.encryptSecret(testValue);
      const decrypted = secretsService.decryptSecret(encrypted);

      const success = decrypted === testValue;

      logger.info('Secrets service test performed', {
        success,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        data: {
          encryptionTest: success,
          testCompleted: new Date().toISOString(),
        },
        message: success
          ? 'Secrets service test passed'
          : 'Secrets service test failed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Secrets service test error:', error);
      res.status(500).json({
        success: false,
        error: 'Secrets service test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ============================================================================
// SECURITY MONITORING ENDPOINTS
// ============================================================================

/**
 * Get comprehensive security audit from monitoring service
 */
router.get(
  '/monitoring/audit',
  requireAdminAccess,
  async (req: Request, res: Response) => {
    try {
      const audit = await securityMonitoringService.performDailySecurityAudit();

      logger.info('Security monitoring audit requested', {
        ip: req.ip,
        auditId: audit.id,
        score: audit.overallScore,
        criticalIssues: audit.criticalIssues,
      });

      res.json({
        success: true,
        data: audit,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Security monitoring audit error:', error);
      res.status(500).json({
        success: false,
        error: 'Security monitoring audit failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Get security audit history and trends
 */
router.get(
  '/monitoring/history',
  requireAdminAccess,
  (req: Request, res: Response) => {
    try {
      const validatedQuery = historyQuerySchema.parse(req.query);
      const days =
        typeof validatedQuery.days === 'string'
          ? parseInt(validatedQuery.days, 10)
          : validatedQuery.days;
      const history = securityMonitoringService.getAuditHistory(days);

      logger.info('Security audit history requested', {
        ip: req.ip,
        requestedDays: req.query.days,
        validatedDays: days,
        auditCount: history.audits.length,
      });

      res.json({
        success: true,
        data: history,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Security monitoring history error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message:
          'Operation could not be completed. Please try again or contact support.',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * Get active security alerts
 */
router.get(
  '/monitoring/alerts',
  requireAdminAccess,
  (req: Request, res: Response) => {
    try {
      const alerts = securityMonitoringService.getActiveAlerts();

      res.json({
        success: true,
        data: {
          alerts,
          count: alerts.length,
          critical: alerts.filter(a => a.severity === 'CRITICAL').length,
          high: alerts.filter(a => a.severity === 'HIGH').length,
          medium: alerts.filter(a => a.severity === 'MEDIUM').length,
          low: alerts.filter(a => a.severity === 'LOW').length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Security monitoring alerts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get security alerts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Resolve a security alert
 */
router.post(
  '/monitoring/alerts/:alertId/resolve',
  requireAdminAccess,
  (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;

      // Validate required parameters
      if (!alertId || typeof alertId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Invalid alert ID',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate resolution body using zod schema
      const validatedData = alertResolutionSchema.parse(req.body);

      const success = validatedData.resolution
        ? securityMonitoringService.resolveAlert(
            alertId,
            validatedData.resolution
          )
        : securityMonitoringService.resolveAlert(alertId);

      if (success) {
        logger.info('Security alert resolved via admin endpoint', {
          alertId,
          resolution: validatedData.resolution,
          ip: req.ip,
          timestamp: new Date().toISOString(),
        });

        res.json({
          success: true,
          message: 'Alert resolved successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Alert not found',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Alert resolution error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message:
          'Operation could not be completed. Please try again or contact support.',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * Perform API key cleanup
 */
router.post(
  '/monitoring/cleanup',
  requireAdminAccess,
  async (req: Request, res: Response) => {
    try {
      const result = await securityMonitoringService.performApiKeyCleanup();

      logger.info('API key cleanup performed via admin endpoint', {
        ...result.summary,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        data: result,
        message: 'API key cleanup completed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('API key cleanup error:', error);
      res.status(500).json({
        success: false,
        error: 'API key cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Monitor encryption key configuration
 */
router.get(
  '/monitoring/encryption',
  requireAdminAccess,
  (req: Request, res: Response) => {
    try {
      const status =
        securityMonitoringService.monitorEncryptionKeyConfiguration();

      // Mask sensitive environment information
      const maskedStatus = {
        healthStatus: status.healthStatus,
        recommendations: status.recommendations,
        // Environment details are masked for security
        environmentType: status.isProduction ? 'production' : 'non-production',
        encryptionEnabled: status.isConfigured,
        // Additional security info without exposing specifics
        securityLevel:
          status.isProduction && status.isConfigured
            ? 'high'
            : status.isConfigured
              ? 'medium'
              : 'low',
      };

      res.json({
        success: true,
        data: maskedStatus,
        timestamp: new Date().toISOString(),
        note: 'Sensitive configuration details are masked for security',
      });
    } catch (error) {
      logger.error('Encryption monitoring error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to monitor encryption configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Get security monitoring service health status
 */
router.get(
  '/monitoring/health',
  requireAdminAccess,
  (req: Request, res: Response) => {
    try {
      const health = securityMonitoringService.getHealthStatus();

      res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Security monitoring health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Start security monitoring service
 */
router.post(
  '/monitoring/start',
  requireAdminAccess,
  (req: Request, res: Response) => {
    try {
      securityMonitoringService.start();

      logger.info('Security monitoring service started via admin endpoint', {
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: 'Security monitoring service started',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Security monitoring start error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start security monitoring service',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Stop security monitoring service
 */
router.post(
  '/monitoring/stop',
  requireAdminAccess,
  (req: Request, res: Response) => {
    try {
      securityMonitoringService.stop();

      logger.info('Security monitoring service stopped via admin endpoint', {
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: 'Security monitoring service stopped',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Security monitoring stop error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop security monitoring service',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export { router as securityRoutes };
