import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { secretsService } from '@/services/secretsService';

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
    // Skip rotation monitoring in test environment to prevent Jest open handles
    if (process.env.NODE_ENV === 'test') {
      return;
    }

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

    // Generate rotation token for secure rotation
    const rotationToken = secretsService.generateRotationToken(keyName);
    logger.info('API Key rotation token generated', {
      keyName,
      rotationTokenId: rotationToken.substring(0, 8) + '...',
      expiresIn: '24 hours',
    });

    // TODO: Integrate with external alerting system
    // - Send email to administrators with rotation token
    // - Create ticket in issue tracking system
    // - Send notification to monitoring dashboard
    // - Store rotation token securely for admin access
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

    // Validate new key strength
    const validation = secretsService.validateApiKeyStrength(newKey);
    if (!validation.isValid) {
      logger.error(`API key rotation failed - weak key: ${keyName}`, {
        issues: validation.issues,
        strength: validation.strength,
      });
      return false;
    }

    const oldKey = keyInfo.key;
    keyInfo.key = newKey;
    keyInfo.lastRotated = new Date();
    keyInfo.usageCount = 0;

    logger.info(`API key rotated successfully: ${keyName}`, {
      previousKeyPreview: oldKey.substring(0, 8) + '...',
      newKeyPreview: newKey.substring(0, 8) + '...',
      rotatedAt: keyInfo.lastRotated,
      strength: validation.strength,
    });

    return true;
  }

  public rotateKeyWithToken(
    rotationToken: string,
    newKey: string
  ): { success: boolean; error?: string } {
    // Verify rotation token
    const tokenVerification = secretsService.verifyRotationToken(rotationToken);
    if (!tokenVerification.valid || !tokenVerification.apiKeyName) {
      logger.error('Invalid rotation token used', {
        tokenPreview: rotationToken.substring(0, 8) + '...',
      });
      return { success: false, error: 'Invalid or expired rotation token' };
    }

    // Perform rotation
    const success = this.rotateKey(tokenVerification.apiKeyName, newKey);
    if (success) {
      logger.info('API key rotated via secure token', {
        keyName: tokenVerification.apiKeyName,
        rotatedAt: new Date().toISOString(),
      });
      return { success: true };
    } else {
      return { success: false, error: 'Failed to rotate API key' };
    }
  }

  public generateNewApiKey(): string {
    // Generate a secure API key using secrets service
    return secretsService.generateSecureApiKey(64);
  }

  public getHealthStatus(): {
    totalKeys: number;
    validKeys: number;
    keysNeedingRotation: number;
    lastCheck: Date;
    securityAudit: {
      weakKeys: string[];
      expiredKeys: string[];
      highUsageKeys: string[];
      overallSecurityScore: number;
    };
  } {
    const now = new Date();
    const rotationThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days
    const highUsageThreshold = 10000;

    let keysNeedingRotation = 0;
    const weakKeys: string[] = [];
    const expiredKeys: string[] = [];
    const highUsageKeys: string[] = [];

    this.apiKeys.forEach((keyInfo, keyName) => {
      // Check rotation needs
      if (
        keyInfo.lastRotated &&
        now.getTime() - keyInfo.lastRotated.getTime() > rotationThreshold
      ) {
        keysNeedingRotation++;
      }

      // Security audit checks
      const keyStrength = secretsService.validateApiKeyStrength(keyInfo.key);
      if (!keyStrength.isValid || keyStrength.strength === 'weak') {
        weakKeys.push(keyName);
      }

      if (keyInfo.expiresAt && keyInfo.expiresAt < now) {
        expiredKeys.push(keyName);
      }

      if ((keyInfo.usageCount || 0) > highUsageThreshold) {
        highUsageKeys.push(keyName);
      }
    });

    // Calculate overall security score (0-100)
    const totalIssues =
      weakKeys.length + expiredKeys.length + keysNeedingRotation;
    const maxIssues = this.apiKeys.size * 3; // Max 3 issues per key
    const securityScore = Math.max(
      0,
      Math.round(100 - (totalIssues / maxIssues) * 100)
    );

    return {
      totalKeys: this.apiKeys.size,
      validKeys: this.apiKeys.size, // All loaded keys are considered valid
      keysNeedingRotation,
      lastCheck: now,
      securityAudit: {
        weakKeys,
        expiredKeys,
        highUsageKeys,
        overallSecurityScore: securityScore,
      },
    };
  }

  public performSecurityAudit(): {
    passed: boolean;
    score: number;
    issues: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      category: string;
      description: string;
      affected: string[];
      recommendation: string;
    }>;
  } {
    const healthStatus = this.getHealthStatus();
    const issues: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      category: string;
      description: string;
      affected: string[];
      recommendation: string;
    }> = [];

    // Check for weak keys
    if (healthStatus.securityAudit.weakKeys.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'Key Strength',
        description: 'Weak API keys detected',
        affected: healthStatus.securityAudit.weakKeys,
        recommendation: 'Replace weak keys with cryptographically strong keys',
      });
    }

    // Check for expired keys
    if (healthStatus.securityAudit.expiredKeys.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'Key Expiration',
        description: 'Expired API keys detected',
        affected: healthStatus.securityAudit.expiredKeys,
        recommendation: 'Rotate expired keys immediately',
      });
    }

    // Check for keys needing rotation
    if (healthStatus.keysNeedingRotation > 0) {
      issues.push({
        severity: 'high',
        category: 'Key Rotation',
        description: 'API keys need rotation (older than 30 days)',
        affected: [], // Would need to track which specific keys
        recommendation: 'Implement regular key rotation schedule',
      });
    }

    // Check for high usage keys
    if (healthStatus.securityAudit.highUsageKeys.length > 0) {
      issues.push({
        severity: 'medium',
        category: 'Usage Monitoring',
        description: 'High usage API keys detected',
        affected: healthStatus.securityAudit.highUsageKeys,
        recommendation: 'Monitor for potential abuse or consider rate limiting',
      });
    }

    // Production environment checks
    if (process.env.NODE_ENV === 'production') {
      const productionIssues = this.checkProductionSecurity();
      issues.push(...productionIssues);
    }

    const passed =
      issues.filter(issue => issue.severity === 'critical').length === 0;

    logger.info('Security audit completed', {
      passed,
      score: healthStatus.securityAudit.overallSecurityScore,
      issueCount: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
    });

    return {
      passed,
      score: healthStatus.securityAudit.overallSecurityScore,
      issues,
    };
  }

  private checkProductionSecurity(): Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    description: string;
    affected: string[];
    recommendation: string;
  }> {
    const issues: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      category: string;
      description: string;
      affected: string[];
      recommendation: string;
    }> = [];

    // Check for default secrets
    if (process.env.JWT_SECRET === 'development-secret') {
      issues.push({
        severity: 'critical',
        category: 'Production Security',
        description: 'Default JWT secret in production',
        affected: ['JWT_SECRET'],
        recommendation: 'Set a strong, unique JWT secret for production',
      });
    }

    // Check for missing encryption key
    if (!process.env.MASTER_ENCRYPTION_KEY) {
      issues.push({
        severity: 'high',
        category: 'Production Security',
        description: 'Missing master encryption key in production',
        affected: ['MASTER_ENCRYPTION_KEY'],
        recommendation: 'Set MASTER_ENCRYPTION_KEY for production encryption',
      });
    }

    return issues;
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
  rotateKeyWithToken: (
    rotationToken: string,
    newKey: string
  ): { success: boolean; error?: string } =>
    getApiKeyManager().rotateKeyWithToken(rotationToken, newKey),
  generateNewApiKey: (): string => getApiKeyManager().generateNewApiKey(),
  performSecurityAudit: (): ReturnType<ApiKeyManager['performSecurityAudit']> =>
    getApiKeyManager().performSecurityAudit(),
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
  performSecurityAudit: (): ReturnType<ApiKeyManager['performSecurityAudit']> =>
    getApiKeyManager().performSecurityAudit(),
  rotateKeyWithToken: (
    rotationToken: string,
    newKey: string
  ): { success: boolean; error?: string } =>
    getApiKeyManager().rotateKeyWithToken(rotationToken, newKey),
};

export default apiKeyMiddleware;
