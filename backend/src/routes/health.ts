import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Check database connectivity
    let dbStatus = 'OK';
    let dbResponseTime = 0;
    
    try {
      const dbStartTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbResponseTime = Date.now() - dbStartTime;
    } catch (error) {
      dbStatus = 'ERROR';
      logger.error('Database health check failed:', error);
    }

    const healthInfo = {
      status: dbStatus === 'OK' ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          status: dbStatus,
          responseTime: `${dbResponseTime}ms`
        },
        api: {
          status: 'OK',
          responseTime: `${Date.now() - startTime}ms`
        }
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      }
    };

    const statusCode = healthInfo.status === 'OK' ? 200 : 503;
    logger.info('Health check requested', { status: healthInfo.status, dbResponseTime });
    res.status(statusCode).json(healthInfo);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Internal server error'
    });
  }
});

// Readiness probe for Kubernetes/container orchestration
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check critical dependencies
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'READY',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      error: 'Service not ready'
    });
  }
});

// Liveness probe for Kubernetes/container orchestration
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export { router as healthRoutes };
