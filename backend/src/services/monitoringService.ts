import { logger } from '../utils/logger';
import { circuitBreakerManager } from '../utils/circuitBreaker';

export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  circuitBreakers: Record<string, unknown>;
  errors: {
    total: number;
    byType: Record<string, number>;
    recentErrors: ErrorMetric[];
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
}

export interface ErrorMetric {
  timestamp: string;
  type: string;
  service?: string;
  message: string;
  requestId?: string;
  statusCode?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    ai: ServiceHealth;
    database: ServiceHealth;
    system: ServiceHealth;
  };
  metrics: SystemMetrics;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime?: number;
  errorRate?: number;
  details?: Record<string, unknown>;
}

/**
 * Monitoring service for system health and metrics
 */
export class MonitoringService {
  private startTime: number;
  private errorMetrics: ErrorMetric[] = [];
  private requestMetrics: {
    total: number;
    successful: number;
    failed: number;
    responseTimes: number[];
  } = {
    total: 0,
    successful: 0,
    failed: 0,
    responseTimes: [],
  };

  constructor() {
    this.startTime = Date.now();
    this.startPeriodicHealthChecks();
  }

  /**
   * Record an error for monitoring
   */
  recordError(
    type: string,
    message: string,
    service?: string,
    requestId?: string,
    statusCode?: number
  ): void {
    const errorMetric: ErrorMetric = {
      timestamp: new Date().toISOString(),
      type,
      service,
      message,
      requestId,
      statusCode,
    };

    this.errorMetrics.push(errorMetric);

    // Keep only last 100 errors to prevent memory leaks
    if (this.errorMetrics.length > 100) {
      this.errorMetrics = this.errorMetrics.slice(-100);
    }

    logger.info('Error recorded for monitoring', errorMetric);
  }

  /**
   * Record a request for metrics
   */
  recordRequest(successful: boolean, responseTime: number): void {
    this.requestMetrics.total++;

    if (successful) {
      this.requestMetrics.successful++;
    } else {
      this.requestMetrics.failed++;
    }

    this.requestMetrics.responseTimes.push(responseTime);

    // Keep only last 1000 response times
    if (this.requestMetrics.responseTimes.length > 1000) {
      this.requestMetrics.responseTimes =
        this.requestMetrics.responseTimes.slice(-1000);
    }
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;

    // Calculate error statistics
    const errorsByType: Record<string, number> = {};
    for (const error of this.errorMetrics) {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    }

    // Calculate average response time
    const avgResponseTime =
      this.requestMetrics.responseTimes.length > 0
        ? this.requestMetrics.responseTimes.reduce((a, b) => a + b, 0) /
          this.requestMetrics.responseTimes.length
        : 0;

    return {
      timestamp: new Date().toISOString(),
      uptime,
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      circuitBreakers: circuitBreakerManager.getAllStats(),
      errors: {
        total: this.errorMetrics.length,
        byType: errorsByType,
        recentErrors: this.errorMetrics.slice(-10), // Last 10 errors
      },
      requests: {
        total: this.requestMetrics.total,
        successful: this.requestMetrics.successful,
        failed: this.requestMetrics.failed,
        averageResponseTime: avgResponseTime,
      },
    };
  }

  /**
   * Check health of AI services
   */
  private async checkAIServiceHealth(): Promise<ServiceHealth> {
    try {
      const breakerHealth = circuitBreakerManager.getHealthStatus();
      const aiServices = ['openai', 'anthropic', 'mastra'];

      let healthyServices = 0;
      let totalServices = 0;
      let totalErrorRate = 0;

      for (const service of aiServices) {
        const serviceHealth = breakerHealth.services[service] as any;
        if (serviceHealth) {
          totalServices++;
          if (serviceHealth.healthy) {
            healthyServices++;
          }

          // Calculate error rate from circuit breaker stats
          const stats = serviceHealth.stats?.stats;
          if (
            stats &&
            typeof stats === 'object' &&
            'fires' in stats &&
            'failures' in stats
          ) {
            const fires = (stats as any).fires;
            const failures = (stats as any).failures;
            if (fires > 0) {
              const errorRate = (failures / fires) * 100;
              totalErrorRate += errorRate;
            }
          }
        }
      }

      const avgErrorRate =
        totalServices > 0 ? totalErrorRate / totalServices : 0;
      const healthPercentage =
        totalServices > 0 ? (healthyServices / totalServices) * 100 : 100;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthPercentage >= 100) {
        status = 'healthy';
      } else if (healthPercentage >= 50) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        lastCheck: new Date().toISOString(),
        errorRate: avgErrorRate,
        details: {
          healthyServices,
          totalServices,
          breakerHealth: breakerHealth.services,
        },
      };
    } catch (error) {
      logger.error('AI service health check failed:', error);
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    try {
      // This would typically include actual database connectivity checks
      // For now, we'll do a simple check based on recent database errors
      const dbErrors = this.errorMetrics.filter(
        error =>
          error.type === 'DATABASE_ERROR' &&
          new Date(error.timestamp).getTime() > Date.now() - 5 * 60 * 1000 // Last 5 minutes
      );

      const status =
        dbErrors.length === 0
          ? 'healthy'
          : dbErrors.length < 5
            ? 'degraded'
            : 'unhealthy';

      return {
        status,
        lastCheck: new Date().toISOString(),
        details: {
          recentErrors: dbErrors.length,
        },
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Check system health
   */
  private checkSystemHealth(): ServiceHealth {
    const memoryUsage = process.memoryUsage();
    const memoryPercentage =
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (memoryPercentage < 70) {
      status = 'healthy';
    } else if (memoryPercentage < 90) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      lastCheck: new Date().toISOString(),
      details: {
        memoryUsage: memoryPercentage,
        uptime: Date.now() - this.startTime,
      },
    };
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const [aiHealth, dbHealth] = await Promise.all([
      this.checkAIServiceHealth(),
      this.checkDatabaseHealth(),
    ]);

    const systemHealth = this.checkSystemHealth();

    // Determine overall status
    const services = { ai: aiHealth, database: dbHealth, system: systemHealth };
    const statuses = Object.values(services).map(s => s.status);

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (statuses.every(s => s === 'healthy')) {
      overallStatus = 'healthy';
    } else if (statuses.some(s => s === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      metrics: this.getSystemMetrics(),
    };
  }

  /**
   * Start periodic health checks and logging
   */
  private startPeriodicHealthChecks(): void {
    // Log system metrics every 5 minutes
    setInterval(
      async () => {
        try {
          const healthStatus = await this.getHealthStatus();
          logger.info('Periodic health check', {
            status: healthStatus.status,
            metrics: {
              memory: healthStatus.metrics.memory,
              circuitBreakers: Object.keys(healthStatus.metrics.circuitBreakers)
                .length,
              errors: healthStatus.metrics.errors.total,
              requests: healthStatus.metrics.requests,
            },
          });

          // Log warning if system is not healthy
          if (healthStatus.status !== 'healthy') {
            logger.warn('System health degraded', healthStatus);
          }
        } catch (error) {
          logger.error('Periodic health check failed:', error);
        }
      },
      5 * 60 * 1000
    ); // 5 minutes

    logger.info('Monitoring service started with periodic health checks');
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.errorMetrics = [];
    this.requestMetrics = {
      total: 0,
      successful: 0,
      failed: 0,
      responseTimes: [],
    };
    this.startTime = Date.now();
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
