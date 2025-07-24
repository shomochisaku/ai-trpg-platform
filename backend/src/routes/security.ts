import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiKeyManager } from '@/middleware/apiKeyManager';
import { secretsService } from '@/services/secretsService';
import { aiProxyService } from '@/services/aiProxyService';
import { logger } from '@/utils/logger';

const router = Router();

// Request validation schemas
const rotateKeySchema = z.object({
  rotationToken: z.string().min(1),
  newKey: z.string().min(32), // Minimum key length
});

// Admin authentication middleware (placeholder - in production, use proper admin auth)
const requireAdminAccess = (req: Request, res: Response, next: Function): void => {
  // In production, implement proper admin authentication
  const adminToken = req.headers['x-admin-token'];
  
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    logger.warn('Unauthorized security endpoint access attempt', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path
    });
    
    res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Admin access required'
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
      status: audit.passed && secretsHealth.status === 'healthy' && aiProxyHealth.status === 'healthy' 
        ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      components: {
        apiKeys: {
          status: audit.passed ? 'healthy' : 'degraded',
          score: audit.score,
          issues: audit.issues
        },
        secrets: secretsHealth,
        aiProxy: aiProxyHealth
      }
    };

    logger.info('Security audit requested', {
      ip: req.ip,
      overallStatus: overallHealth.status,
      criticalIssues: audit.issues.filter(i => i.severity === 'critical').length
    });

    res.json({
      success: true,
      data: overallHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Security audit error:', error);
    res.status(500).json({
      success: false,
      error: 'Security audit failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get API key health status
 */
router.get('/api-keys/health', requireAdminAccess, (req: Request, res: Response) => {
  try {
    const health = apiKeyManager.getHealthStatus();
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('API key health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Rotate API key with secure token
 */
router.post('/api-keys/rotate', requireAdminAccess, (req: Request, res: Response) => {
  try {
    const { rotationToken, newKey } = rotateKeySchema.parse(req.body);
    
    const result = apiKeyManager.rotateKeyWithToken(rotationToken, newKey);
    
    if (result.success) {
      logger.info('API key rotated via admin endpoint', {
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: 'API key rotated successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Key rotation failed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('API key rotation error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Key rotation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate new API key
 */
router.post('/api-keys/generate', requireAdminAccess, (req: Request, res: Response) => {
  try {
    const keyName = req.body.keyName || 'generated-key';
    const newKey = apiKeyManager.generateNewApiKey(keyName);
    
    logger.info('New API key generated via admin endpoint', {
      keyName,
      keyPreview: newKey.substring(0, 8) + '...',
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: {
        keyName,
        key: newKey,
        keyPreview: newKey.substring(0, 8) + '...',
        generated: new Date().toISOString()
      },
      message: 'New API key generated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('API key generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Key generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get AI proxy statistics
 */
router.get('/ai-proxy/stats', requireAdminAccess, (req: Request, res: Response) => {
  try {
    const stats = aiProxyService.getStats();
    const health = aiProxyService.healthCheck();
    
    res.json({
      success: true,
      data: {
        stats,
        health
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('AI proxy stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI proxy stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Refresh AI proxy clients (for key rotation)
 */
router.post('/ai-proxy/refresh', requireAdminAccess, (req: Request, res: Response) => {
  try {
    aiProxyService.refreshClients();
    
    logger.info('AI proxy clients refreshed via admin endpoint', {
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'AI proxy clients refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('AI proxy refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh AI proxy clients',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test secrets service functionality
 */
router.post('/secrets/test', requireAdminAccess, (req: Request, res: Response) => {
  try {
    const testValue = 'test-encryption-value-' + Date.now();
    const encrypted = secretsService.encryptSecret(testValue);
    const decrypted = secretsService.decryptSecret(encrypted);
    
    const success = decrypted === testValue;
    
    logger.info('Secrets service test performed', {
      success,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: {
        encryptionTest: success,
        testCompleted: new Date().toISOString()
      },
      message: success ? 'Secrets service test passed' : 'Secrets service test failed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Secrets service test error:', error);
    res.status(500).json({
      success: false,
      error: 'Secrets service test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as securityRoutes };