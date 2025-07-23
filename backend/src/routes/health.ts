import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { apiKeyManager } from '@/middleware/apiKeyManager';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  };

  logger.info('Health check requested');
  res.json(healthInfo);
});

// Enhanced security health check endpoint
router.get('/security', (req: Request, res: Response) => {
  try {
    const apiKeyHealth = apiKeyManager.getHealthStatus();
    const memoryUsage = process.memoryUsage();
    
    const securityHealth = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      apiKeys: {
        total: apiKeyHealth.totalKeys,
        valid: apiKeyHealth.validKeys,
        needingRotation: apiKeyHealth.keysNeedingRotation,
        lastCheck: apiKeyHealth.lastCheck,
      },
      security: {
        environment: process.env.NODE_ENV || 'development',
        tlsEnabled: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
        corsEnabled: true,
        helmetEnabled: true,
        rateLimitEnabled: true,
      },
      performance: {
        uptime: process.uptime(),
        memoryUsage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
        },
        cpuUsage: process.cpuUsage(),
      },
    };

    // Log security health check (without sensitive data)
    logger.info('Security health check requested', {
      apiKeysStatus: apiKeyHealth,
      environment: process.env.NODE_ENV,
      requesterIp: req.ip,
    });

    res.json(securityHealth);
  } catch (error) {
    logger.error('Security health check failed', error);
    
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Security health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as healthRoutes };
