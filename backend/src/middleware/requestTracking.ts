import { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/monitoringService';
import { logger } from '../utils/logger';

/**
 * Middleware to track request metrics for monitoring
 */
export const requestTrackingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Generate request ID if not present
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] =
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Set request ID in response header
  res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  let responseRecorded = false;

  res.end = function (this: Response, ...args: unknown[]): Response {
    if (!responseRecorded) {
      const responseTime = Date.now() - startTime;
      const successful = res.statusCode < 400;

      // Record request metrics
      monitoringService.recordRequest(successful, responseTime);

      // Log request completion
      logger.debug('Request completed', {
        requestId: req.headers['x-request-id'],
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        successful,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });

      responseRecorded = true;
    }

    // Call original end method with all arguments
    return (originalEnd as any).apply(this, args);
  } as any;

  next();
};
