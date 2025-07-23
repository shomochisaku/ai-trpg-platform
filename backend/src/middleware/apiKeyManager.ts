import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

// Extend Express Request interface
interface AuthenticatedRequest extends Request {
  apiKey?: string;
}

// API Key management and security
export interface ApiKeyInfo {
  name: string;
  key: string;
  required: boolean;
  lastRotated?: Date;
  expiresAt?: Date;
  usageCount?: number;
}

export class ApiKeyManager {
  private apiKeys: Map<string, ApiKeyInfo> = new Map();
  private rotationSchedule: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeApiKeys();
    this.validateEnvironmentVariables();
    this.setupRotationMonitoring();
  }

  private initializeApiKeys(): void {
    const keyConfigs: Omit<ApiKeyInfo, 'key'>[] = [
      { name: 'OPENAI_API_KEY', required: true },
      { name: 'ANTHROPIC_API_KEY', required: false },
      { name: 'PINECONE_API_KEY', required: false },
      { name: 'JWT_SECRET', required: true },
    ];

    keyConfigs.forEach(config => {
      const key = process.env[config.name];
      if (key) {
        this.apiKeys.set(config.name, {
          ...config,
          key,
          lastRotated: new Date(),
          usageCount: 0,
        });
      } else if (config.required) {
        logger.error(`Required API key missing: ${config.name}`);
        throw new Error(
          `Missing required environment variable: ${config.name}`
        );
      }
    });
  }

  private validateEnvironmentVariables(): void {
    const securityChecks = [
      {
        name: 'OPENAI_API_KEY',
        validator: (key: string) => key.startsWith('sk-') && key.length > 20,
        message: 'OpenAI API key format is invalid',
      },
      {
        name: 'JWT_SECRET',
        validator: (key: string) => key.length >= 32,
        message: 'JWT secret must be at least 32 characters long',
      },
    ];

    securityChecks.forEach(check => {
      const keyInfo = this.apiKeys.get(check.name);
      if (keyInfo && !check.validator(keyInfo.key)) {
        logger.error(`Security validation failed: ${check.message}`);
        throw new Error(`Security validation failed: ${check.message}`);
      }
    });

    logger.info('API key validation completed successfully');
  }

  private setupRotationMonitoring(): void {
    // Check for API key rotation needs every 24 hours
    const rotationInterval = setInterval(
      () => {
        this.checkRotationNeeds();
      },
      24 * 60 * 60 * 1000
    );

    // Clean up on process exit
    process.on('SIGTERM', () => {
      clearInterval(rotationInterval);
      this.rotationSchedule.forEach(timeout => clearTimeout(timeout));
    });
  }

  private checkRotationNeeds(): void {
    const now = new Date();
    const rotationThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days

    this.apiKeys.forEach((keyInfo, keyName) => {
      if (keyInfo.lastRotated) {
        const daysSinceRotation = now.getTime() - keyInfo.lastRotated.getTime();

        if (daysSinceRotation > rotationThreshold) {
          logger.warn(`API key rotation recommended: ${keyName}`, {
            lastRotated: keyInfo.lastRotated,
            daysSinceRotation: Math.floor(
              daysSinceRotation / (24 * 60 * 60 * 1000)
            ),
            usageCount: keyInfo.usageCount,
          });

          // Emit rotation event (could be handled by monitoring system)
          this.emitRotationAlert(keyName, keyInfo);
        }
      }
    });
  }

  private emitRotationAlert(keyName: string, keyInfo: ApiKeyInfo): void {
    // This could integrate with external monitoring/alerting systems
    logger.warn('API Key Rotation Alert', {
      keyName,
      lastRotated: keyInfo.lastRotated,
      usageCount: keyInfo.usageCount,
      action: 'rotation_recommended',
      timestamp: new Date().toISOString(),
    });

    // TODO: Integrate with external alerting system
    // - Send email to administrators
    // - Create ticket in issue tracking system
    // - Send notification to monitoring dashboard
  }

  public incrementUsage(keyName: string): void {
    const keyInfo = this.apiKeys.get(keyName);
    if (keyInfo) {
      keyInfo.usageCount = (keyInfo.usageCount || 0) + 1;

      // Log high usage patterns
      if (keyInfo.usageCount % 1000 === 0) {
        logger.info(`API key usage milestone: ${keyName}`, {
          usageCount: keyInfo.usageCount,
          lastRotated: keyInfo.lastRotated,
        });
      }
    }
  }

  public getKeyInfo(keyName: string): ApiKeyInfo | undefined {
    return this.apiKeys.get(keyName);
  }

  public getSecuredKey(keyName: string): string | undefined {
    const keyInfo = this.apiKeys.get(keyName);
    if (!keyInfo) return undefined;

    this.incrementUsage(keyName);
    return keyInfo.key;
  }

  public rotateKey(keyName: string, newKey: string): boolean {
    const keyInfo = this.apiKeys.get(keyName);
    if (!keyInfo) return false;

    const oldKey = keyInfo.key;
    keyInfo.key = newKey;
    keyInfo.lastRotated = new Date();
    keyInfo.usageCount = 0;

    logger.info(`API key rotated successfully: ${keyName}`, {
      previousKeyPreview: oldKey.substring(0, 8) + '...',
      newKeyPreview: newKey.substring(0, 8) + '...',
      rotatedAt: keyInfo.lastRotated,
    });

    return true;
  }

  public getHealthStatus(): {
    totalKeys: number;
    validKeys: number;
    keysNeedingRotation: number;
    lastCheck: Date;
  } {
    const now = new Date();
    const rotationThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days

    let keysNeedingRotation = 0;

    this.apiKeys.forEach(keyInfo => {
      if (
        keyInfo.lastRotated &&
        now.getTime() - keyInfo.lastRotated.getTime() > rotationThreshold
      ) {
        keysNeedingRotation++;
      }
    });

    return {
      totalKeys: this.apiKeys.size,
      validKeys: this.apiKeys.size, // All loaded keys are considered valid
      keysNeedingRotation,
      lastCheck: now,
    };
  }
}

// Lazy initialization to allow test security setup
let _apiKeyManager: ApiKeyManager;

export const getApiKeyManager = (): ApiKeyManager => {
  if (!_apiKeyManager) {
    _apiKeyManager = new ApiKeyManager();
  }
  return _apiKeyManager;
};

// Backward compatibility
export const apiKeyManager = {
  get instance(): ApiKeyManager {
    return getApiKeyManager();
  },
  getHealthStatus: (): ReturnType<ApiKeyManager['getHealthStatus']> =>
    getApiKeyManager().getHealthStatus(),
  incrementUsage: (keyName: string): void =>
    getApiKeyManager().incrementUsage(keyName),
  getKeyInfo: (keyName: string): ApiKeyInfo | undefined =>
    getApiKeyManager().getKeyInfo(keyName),
  getSecuredKey: (keyName: string): string | undefined =>
    getApiKeyManager().getSecuredKey(keyName),
  rotateKey: (keyName: string, newKey: string): boolean =>
    getApiKeyManager().rotateKey(keyName, newKey),
};

// Middleware to track API key usage
export const trackApiKeyUsage = (keyName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Track usage when the request is processed
    getApiKeyManager().incrementUsage(keyName);

    // Add usage info to response headers (for monitoring)
    const keyInfo = getApiKeyManager().getKeyInfo(keyName);
    if (keyInfo) {
      res.setHeader('X-API-Key-Usage', keyInfo.usageCount || 0);
    }

    next();
  };
};

// Middleware to validate API key presence
export const requireApiKey = (keyName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getApiKeyManager().getSecuredKey(keyName);

    if (!key) {
      logger.error(`Required API key not available: ${keyName}`, {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        code: 'API_KEY_UNAVAILABLE',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Store the key in request context for use by the route handler
    (req as AuthenticatedRequest).apiKey = key;
    next();
  };
};

// Environment security validation middleware
export const validateEnvironmentSecurity = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const securityIssues: string[] = [];

  // Check for development-specific security risks
  if (isDevelopment) {
    // Allow in development but log warnings
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      securityIssues.push('TLS certificate validation is disabled');
    }

    if (process.env.JWT_SECRET === 'development-secret') {
      securityIssues.push('Using default JWT secret in development');
    }
  } else {
    // Enforce strict security in production
    if (
      !process.env.NODE_TLS_REJECT_UNAUTHORIZED ||
      process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
    ) {
      securityIssues.push(
        'TLS certificate validation must be enabled in production'
      );
    }

    if (
      process.env.JWT_SECRET === 'development-secret' ||
      !process.env.JWT_SECRET
    ) {
      securityIssues.push('Production JWT secret is required');
    }
  }

  if (securityIssues.length > 0) {
    logger.warn('Environment security issues detected', {
      issues: securityIssues,
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
    });

    if (!isDevelopment) {
      res.status(500).json({
        success: false,
        error: 'Environment security validation failed',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  next();
};

export const apiKeyMiddleware = {
  get manager(): ApiKeyManager {
    return getApiKeyManager();
  },
  trackUsage: trackApiKeyUsage,
  requireKey: requireApiKey,
  validateEnvironment: validateEnvironmentSecurity,
};

export default apiKeyMiddleware;
