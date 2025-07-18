import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';

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

export { router as healthRoutes };