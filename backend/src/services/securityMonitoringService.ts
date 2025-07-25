import { logger } from '@/utils/logger';
import { secretsService } from './secretsService';
import { getApiKeyManager } from '@/middleware/apiKeyManager';
import { securityConfig } from '@/config/securityMonitoringConfig';

// Interfaces for security monitoring data structures
export interface SecurityAuditRecord {
  id: string;
  timestamp: Date;
  overallScore: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  details: SecurityAuditDetails;
  previousScore?: number;
  scoreChange?: number;
}

export interface SecurityAuditDetails {
  apiKeyAudit: {
    totalKeys: number;
    expiredKeys: string[];
    weakKeys: string[];
    keysNeedingRotation: string[];
    highUsageKeys: string[];
  };
  encryptionAudit: {
    masterKeyConfigured: boolean;
    encryptionTestPassed: boolean;
    productionSecurityEnabled: boolean;
  };
  environmentAudit: {
    productionIssues: string[];
    configurationIssues: string[];
    tlsEnabled: boolean;
  };
}

export interface SecurityAlert {
  id: string;
  type:
    | 'SCORE_DETERIORATION'
    | 'CRITICAL_ISSUE'
    | 'KEY_EXPIRY'
    | 'ENCRYPTION_FAILURE'
    | 'CONFIGURATION_ERROR';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  affectedComponents: string[];
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ApiKeyCleanupResult {
  cleanedKeys: string[];
  errors: string[];
  summary: {
    totalProcessed: number;
    successfulCleanups: number;
    failedCleanups: number;
  };
}

export class SecurityMonitoringService {
  private auditHistory: SecurityAuditRecord[] = [];
  private activeAlerts: Map<string, SecurityAlert> = new Map();
  private isRunning = false;
  private dailyAuditInterval?: NodeJS.Timeout;
  private hourlyCleanupInterval?: NodeJS.Timeout;
  private auditMutex: boolean = false; // Enhanced mutex for audit operations
  private alertCleanupInterval?: NodeJS.Timeout; // Cleanup resolved alerts
  private config = securityConfig; // Configuration instance

  constructor() {
    // Log configuration summary on initialization
    logger.info(
      'Security Monitoring Service initialized with configuration:',
      this.config.getConfigSummary()
    );
    this.initializeMonitoring();
  }

  /**
   * Initialize the security monitoring system
   */
  private initializeMonitoring(): void {
    logger.info('Initializing Security Monitoring Service');

    // Note: In production, consider using a proper cron library like node-cron
    // for more precise scheduling. For now, using intervals for simplicity.

    // Perform initial audit on startup
    void this.performInitialAudit();
  }

  /**
   * Start the monitoring service
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn('Security monitoring service is already running');
      return;
    }

    this.isRunning = true;

    // Setup daily security audit
    this.dailyAuditInterval = setInterval(async () => {
      await this.performDailySecurityAudit();
    }, this.config.DAILY_AUDIT_INTERVAL);

    // Setup API key cleanup
    this.hourlyCleanupInterval = setInterval(async () => {
      await this.performApiKeyCleanup();
    }, this.config.HOURLY_CLEANUP_INTERVAL);

    // Setup resolved alert cleanup
    this.alertCleanupInterval = setInterval(() => {
      this.cleanupResolvedAlerts();
    }, this.config.ALERT_CLEANUP_INTERVAL);

    logger.info('Security monitoring service started', {
      dailyAuditInterval: `${this.config.DAILY_AUDIT_INTERVAL / (60 * 60 * 1000)} hours`,
      hourlyCleanupInterval: `${this.config.HOURLY_CLEANUP_INTERVAL / (60 * 60 * 1000)} hours`,
      alertCleanupInterval: `${this.config.ALERT_CLEANUP_INTERVAL / (60 * 60 * 1000)} hours`,
    });
  }

  /**
   * Stop the monitoring service
   */
  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.dailyAuditInterval) {
      clearInterval(this.dailyAuditInterval);
      this.dailyAuditInterval = undefined;
    }

    if (this.hourlyCleanupInterval) {
      clearInterval(this.hourlyCleanupInterval);
      this.hourlyCleanupInterval = undefined;
    }

    if (this.alertCleanupInterval) {
      clearInterval(this.alertCleanupInterval);
      this.alertCleanupInterval = undefined;
    }

    logger.info('Security monitoring service stopped');
  }

  /**
   * Perform initial security audit on startup
   */
  private async performInitialAudit(): Promise<void> {
    try {
      logger.info('Performing initial security audit');
      const audit = await this.calculateSecurityScore();

      // Check for critical issues
      if (audit.criticalIssues > 0) {
        await this.generateAlert({
          type: 'CRITICAL_ISSUE',
          severity: 'CRITICAL',
          title: 'Critical Security Issues Detected on Startup',
          description: `Found ${audit.criticalIssues} critical security issues that require immediate attention`,
          affectedComponents: this.extractAffectedComponents(audit.details),
          timestamp: new Date(),
          resolved: false,
          metadata: { auditId: audit.id, initialAudit: true },
        });
      }

      logger.info('Initial security audit completed', {
        score: audit.overallScore,
        criticalIssues: audit.criticalIssues,
        totalIssues:
          audit.criticalIssues +
          audit.highIssues +
          audit.mediumIssues +
          audit.lowIssues,
      });
    } catch (error) {
      logger.error('Failed to perform initial security audit', error);
    }
  }

  /**
   * Perform daily security audit and score calculation with enhanced atomicity
   */
  public async performDailySecurityAudit(): Promise<SecurityAuditRecord> {
    // Enhanced mutex with timeout for better reliability
    const timeoutMs = 30000; // 30 seconds timeout
    const startTime = Date.now();

    while (this.auditMutex) {
      if (Date.now() - startTime > timeoutMs) {
        logger.error(
          'Audit timeout: Another audit has been running for too long, forcing execution'
        );
        this.auditMutex = false;
        break;
      }

      logger.info('Waiting for concurrent audit to complete...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.auditMutex = true;

    try {
      logger.info('Starting enhanced atomic daily security audit');

      const audit = await this.calculateSecurityScore();

      // Enhanced atomic operation with rollback capability
      const operationResult = await this.performAtomicHistoryUpdate(audit);

      if (!operationResult.success) {
        throw new Error(`Atomic operation failed: ${operationResult.error}`);
      }

      // Check for score deterioration
      await this.checkScoreDeterioration(audit);

      // Generate alerts for critical issues
      await this.processAuditAlerts(audit);

      logger.info('Enhanced atomic daily security audit completed', {
        auditId: audit.id,
        score: audit.overallScore,
        scoreChange: audit.scoreChange,
        criticalIssues: audit.criticalIssues,
        operationId: operationResult.operationId,
      });

      return audit;
    } catch (error) {
      logger.error(
        'Failed to perform enhanced atomic daily security audit',
        error
      );
      throw error;
    } finally {
      // Always release the mutex
      this.auditMutex = false;
    }
  }

  /**
   * Perform atomic history update with rollback capability
   */
  private async performAtomicHistoryUpdate(
    audit: SecurityAuditRecord
  ): Promise<{
    success: boolean;
    error?: string;
    operationId: string;
  }> {
    const operationId = `atomic_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create comprehensive snapshot for rollback
    const historySnapshot = [...this.auditHistory];
    const previousLength = this.auditHistory.length;

    try {
      logger.info(`Starting atomic history update [${operationId}]`, {
        currentHistoryLength: previousLength,
        newAuditId: audit.id,
        retentionDays: this.config.AUDIT_HISTORY_DAYS,
      });

      // Step 1: Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.AUDIT_HISTORY_DAYS);

      // Step 2: Create new history with atomic operation (immutable)
      const beforeFilterLength = this.auditHistory.length;

      // Perform all operations atomically on a new array
      const newHistory = [...this.auditHistory, audit]
        .filter(record => record.timestamp > cutoffDate)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const afterFilterLength = newHistory.length;

      // Step 3: Verify integrity before applying changes
      const expectedMinLength = Math.min(1, previousLength + 1); // At least the new audit should remain
      if (newHistory.length < expectedMinLength) {
        throw new Error(
          `Integrity check failed: Expected at least ${expectedMinLength} records, got ${newHistory.length}`
        );
      }

      // Step 4: Verify the new audit is present
      const newAuditExists = newHistory.some(record => record.id === audit.id);
      if (!newAuditExists) {
        throw new Error(
          'Integrity check failed: New audit was lost during filtering'
        );
      }

      // Step 5: Verify chronological order (already sorted, but double-check)
      for (let i = 1; i < newHistory.length; i++) {
        const currentAudit = newHistory[i];
        const previousAudit = newHistory[i - 1];

        if (!currentAudit || !previousAudit) {
          throw new Error(
            'Integrity check failed: Audit history contains undefined entries'
          );
        }

        if (currentAudit.timestamp < previousAudit.timestamp) {
          throw new Error(
            'Integrity check failed: Audit history chronological order is corrupted'
          );
        }
      }

      // Step 6: Apply changes atomically after all checks pass
      this.auditHistory = newHistory;

      logger.info(
        `Atomic history update completed successfully [${operationId}]`,
        {
          previousLength,
          beforeFilterLength,
          afterFilterLength,
          finalLength: this.auditHistory.length,
          removedCount: beforeFilterLength - afterFilterLength,
          newAuditPresent: newAuditExists,
        }
      );

      return { success: true, operationId };
    } catch (error) {
      // Rollback on any failure
      logger.error(
        `Atomic operation failed, performing rollback [${operationId}]`,
        error
      );

      this.auditHistory = historySnapshot;

      // Verify rollback
      if (this.auditHistory.length !== previousLength) {
        logger.error(
          `CRITICAL: Rollback verification failed [${operationId}]`,
          {
            expectedLength: previousLength,
            actualLength: this.auditHistory.length,
          }
        );
      } else {
        logger.info(`Rollback completed successfully [${operationId}]`);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operationId,
      };
    }
  }

  /**
   * Calculate comprehensive security score
   */
  private async calculateSecurityScore(): Promise<SecurityAuditRecord> {
    const timestamp = new Date();
    const auditId = `audit_${timestamp.getTime()}`;

    // Get API key manager audit
    const apiKeyAudit = getApiKeyManager().performSecurityAudit();

    // Perform encryption tests
    const encryptionAudit = this.performEncryptionAudit();

    // Check environment configuration
    const environmentAudit = this.performEnvironmentAudit();

    // Calculate detailed issue counts
    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;

    // Count API key issues
    apiKeyAudit.issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          criticalIssues++;
          break;
        case 'high':
          highIssues++;
          break;
        case 'medium':
          mediumIssues++;
          break;
        case 'low':
          lowIssues++;
          break;
      }
    });

    // Count encryption issues
    if (!encryptionAudit.masterKeyConfigured) criticalIssues++;
    if (!encryptionAudit.encryptionTestPassed) criticalIssues++;
    if (
      !encryptionAudit.productionSecurityEnabled &&
      process.env.NODE_ENV === 'production'
    ) {
      highIssues++;
    }

    // Count environment issues
    environmentAudit.productionIssues.forEach(issue => {
      if (issue.includes('TLS') || issue.includes('JWT')) {
        criticalIssues++;
      } else {
        highIssues++;
      }
    });

    // Calculate overall score (0-100) using configured weights
    const totalIssues =
      criticalIssues * this.config.CRITICAL_WEIGHT +
      highIssues * this.config.HIGH_WEIGHT +
      mediumIssues * this.config.MEDIUM_WEIGHT +
      lowIssues * this.config.LOW_WEIGHT;
    const maxPossibleIssues = this.config.MAX_POSSIBLE_ISSUES;
    const overallScore = Math.max(
      0,
      Math.round(100 - (totalIssues / maxPossibleIssues) * 100)
    );

    // Get previous score for comparison
    const previousAudit = this.auditHistory[this.auditHistory.length - 1];
    const previousScore = previousAudit?.overallScore;
    const scoreChange =
      previousScore !== undefined ? overallScore - previousScore : undefined;

    const auditRecord: SecurityAuditRecord = {
      id: auditId,
      timestamp,
      overallScore,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      previousScore,
      scoreChange,
      details: {
        apiKeyAudit: {
          totalKeys: getApiKeyManager().getHealthStatus().totalKeys,
          expiredKeys: apiKeyAudit.issues
            .filter(i => i.category === 'Key Expiration')
            .flatMap(i => i.affected),
          weakKeys: apiKeyAudit.issues
            .filter(i => i.category === 'Key Strength')
            .flatMap(i => i.affected),
          keysNeedingRotation: apiKeyAudit.issues
            .filter(i => i.category === 'Key Rotation')
            .flatMap(i => i.affected),
          highUsageKeys: apiKeyAudit.issues
            .filter(i => i.category === 'Usage Monitoring')
            .flatMap(i => i.affected),
        },
        encryptionAudit,
        environmentAudit: {
          productionIssues: environmentAudit.productionIssues,
          configurationIssues: environmentAudit.configurationIssues,
          tlsEnabled: environmentAudit.tlsEnabled,
        },
      },
    };

    return auditRecord;
  }

  /**
   * Perform encryption system audit
   */
  private performEncryptionAudit(): {
    masterKeyConfigured: boolean;
    encryptionTestPassed: boolean;
    productionSecurityEnabled: boolean;
  } {
    const healthCheck = secretsService.healthCheck();

    return {
      masterKeyConfigured: !!process.env.MASTER_ENCRYPTION_KEY,
      encryptionTestPassed: healthCheck.status === 'healthy',
      productionSecurityEnabled:
        process.env.NODE_ENV !== 'production' ||
        !!process.env.MASTER_ENCRYPTION_KEY,
    };
  }

  /**
   * Perform environment configuration audit
   */
  private performEnvironmentAudit(): {
    productionIssues: string[];
    configurationIssues: string[];
    tlsEnabled: boolean;
  } {
    const productionIssues: string[] = [];
    const configurationIssues: string[] = [];

    if (process.env.NODE_ENV === 'production') {
      if (!process.env.MASTER_ENCRYPTION_KEY) {
        productionIssues.push('Missing MASTER_ENCRYPTION_KEY in production');
      }

      if (
        process.env.JWT_SECRET === 'development-secret' ||
        !process.env.JWT_SECRET
      ) {
        productionIssues.push('Invalid JWT secret in production');
      }

      if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
        productionIssues.push(
          'TLS certificate validation disabled in production'
        );
      }
    }

    // Check for common configuration issues
    if (!process.env.DATABASE_URL) {
      configurationIssues.push('Missing DATABASE_URL configuration');
    }

    if (!process.env.OPENAI_API_KEY) {
      configurationIssues.push('Missing OPENAI_API_KEY configuration');
    }

    return {
      productionIssues,
      configurationIssues,
      tlsEnabled: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
    };
  }

  /**
   * Check for score deterioration and generate alerts
   */
  private async checkScoreDeterioration(
    audit: SecurityAuditRecord
  ): Promise<void> {
    if (audit.scoreChange === undefined || audit.previousScore === undefined)
      return;

    const scoreDropThreshold = this.config.SCORE_DROP_THRESHOLD;
    const significantDropThreshold = this.config.SIGNIFICANT_DROP_THRESHOLD;

    if (audit.scoreChange <= -scoreDropThreshold) {
      const severity =
        audit.scoreChange <= -significantDropThreshold ? 'CRITICAL' : 'HIGH';

      await this.generateAlert({
        type: 'SCORE_DETERIORATION',
        severity,
        title: 'Security Score Deterioration Detected',
        description: `Security score dropped from ${audit.previousScore} to ${audit.overallScore} (${audit.scoreChange} points)`,
        affectedComponents: this.extractAffectedComponents(audit.details),
        timestamp: new Date(),
        resolved: false,
        metadata: {
          auditId: audit.id,
          previousScore: audit.previousScore,
          currentScore: audit.overallScore,
          scoreChange: audit.scoreChange,
        },
      });
    }
  }

  /**
   * Process audit results and generate appropriate alerts
   */
  private async processAuditAlerts(audit: SecurityAuditRecord): Promise<void> {
    // Critical issues alert
    if (audit.criticalIssues > 0) {
      await this.generateAlert({
        type: 'CRITICAL_ISSUE',
        severity: 'CRITICAL',
        title: `${audit.criticalIssues} Critical Security Issues Found`,
        description:
          'Critical security vulnerabilities require immediate attention',
        affectedComponents: this.extractAffectedComponents(audit.details),
        timestamp: new Date(),
        resolved: false,
        metadata: { auditId: audit.id, criticalCount: audit.criticalIssues },
      });
    }

    // Expired keys alert
    if (audit.details.apiKeyAudit.expiredKeys.length > 0) {
      await this.generateAlert({
        type: 'KEY_EXPIRY',
        severity: 'CRITICAL',
        title: 'Expired API Keys Detected',
        description: `${audit.details.apiKeyAudit.expiredKeys.length} API keys have expired and need immediate rotation`,
        affectedComponents: audit.details.apiKeyAudit.expiredKeys,
        timestamp: new Date(),
        resolved: false,
        metadata: {
          auditId: audit.id,
          expiredKeys: audit.details.apiKeyAudit.expiredKeys,
        },
      });
    }

    // Encryption failure alert
    if (!audit.details.encryptionAudit.encryptionTestPassed) {
      await this.generateAlert({
        type: 'ENCRYPTION_FAILURE',
        severity: 'CRITICAL',
        title: 'Encryption System Failure',
        description: 'Critical encryption system test failed',
        affectedComponents: ['SecretsService'],
        timestamp: new Date(),
        resolved: false,
        metadata: { auditId: audit.id },
      });
    }
  }

  /**
   * Perform API key cleanup and maintenance
   */
  public async performApiKeyCleanup(): Promise<ApiKeyCleanupResult> {
    try {
      logger.info('Starting API key cleanup process');

      const cleanedKeys: string[] = [];
      const errors: string[] = [];
      const apiKeyManager = getApiKeyManager();
      const auditResult = apiKeyManager.performSecurityAudit();

      // Process expired keys
      for (const expiredKey of auditResult.issues.filter(
        i => i.category === 'Key Expiration'
      )) {
        try {
          for (const keyName of expiredKey.affected) {
            // In a real implementation, this would involve:
            // 1. Notifying administrators
            // 2. Generating rotation tokens
            // 3. Scheduling automatic rotation if configured
            // 4. Disabling the key if no automatic rotation is set up

            logger.warn(`Expired API key detected: ${keyName}`, {
              action: 'cleanup_scheduled',
              keyName,
              timestamp: new Date().toISOString(),
            });

            cleanedKeys.push(keyName);
          }
        } catch (error) {
          const errorMsg = `Failed to process expired key: ${expiredKey.affected.join(', ')}`;
          errors.push(errorMsg);
          logger.error(errorMsg, error);
        }
      }

      // Analyze usage patterns for validity
      await this.performUsageValidityAnalysis();

      const result: ApiKeyCleanupResult = {
        cleanedKeys,
        errors,
        summary: {
          totalProcessed: cleanedKeys.length + errors.length,
          successfulCleanups: cleanedKeys.length,
          failedCleanups: errors.length,
        },
      };

      logger.info('API key cleanup completed', result.summary);
      return result;
    } catch (error) {
      logger.error('Failed to perform API key cleanup', error);
      throw error;
    }
  }

  /**
   * Perform usage frequency-based key validity analysis
   */
  private async performUsageValidityAnalysis(): Promise<void> {
    const apiKeyManager = getApiKeyManager();
    const healthStatus = apiKeyManager.getHealthStatus();

    // Analyze high usage keys for potential abuse
    if (healthStatus.securityAudit.highUsageKeys.length > 0) {
      logger.info('Analyzing high usage API keys', {
        highUsageKeys: healthStatus.securityAudit.highUsageKeys,
        timestamp: new Date().toISOString(),
      });

      // In a real implementation, this would:
      // 1. Analyze usage patterns for anomalies
      // 2. Check for rate limiting violations
      // 3. Validate legitimate vs. potentially abusive usage
      // 4. Generate alerts for suspicious activity
    }

    // Check for unused keys that might be stale
    // This would involve checking usage counts and last access times
    logger.info('Usage validity analysis completed');
  }

  /**
   * Monitor MASTER_ENCRYPTION_KEY configuration
   */
  public monitorEncryptionKeyConfiguration(): {
    isConfigured: boolean;
    isProduction: boolean;
    healthStatus: 'healthy' | 'degraded' | 'critical';
    recommendations: string[];
  } {
    const isProduction = process.env.NODE_ENV === 'production';
    const isConfigured = !!process.env.MASTER_ENCRYPTION_KEY;
    const secretsHealth = secretsService.healthCheck();

    const recommendations: string[] = [];
    let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';

    if (isProduction && !isConfigured) {
      healthStatus = 'critical';
      recommendations.push(
        'Set MASTER_ENCRYPTION_KEY environment variable for production'
      );
    }

    if (secretsHealth.status !== 'healthy') {
      // Only downgrade if not already critical
      if (healthStatus !== 'critical') {
        healthStatus = secretsHealth.status as
          | 'healthy'
          | 'degraded'
          | 'critical';
      }
      recommendations.push(
        'Fix secrets service issues to ensure proper encryption'
      );
    }

    if (!isProduction && !isConfigured) {
      healthStatus = 'degraded';
      recommendations.push(
        'Consider setting MASTER_ENCRYPTION_KEY even in development for testing'
      );
    }

    return {
      isConfigured,
      isProduction,
      healthStatus,
      recommendations,
    };
  }

  /**
   * Generate and manage security alerts
   */
  private async generateAlert(
    alertData: Omit<SecurityAlert, 'id'>
  ): Promise<string> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: SecurityAlert = {
      id: alertId,
      ...alertData,
    };

    this.activeAlerts.set(alertId, alert);

    // Log the alert
    logger.warn('Security alert generated', {
      alertId,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      affectedComponents: alert.affectedComponents,
    });

    // In a real implementation, this would:
    // 1. Send notifications via email, Slack, etc.
    // 2. Create tickets in issue tracking systems
    // 3. Update monitoring dashboards
    // 4. Trigger automated remediation if configured

    return alertId;
  }

  /**
   * Resolve a security alert
   */
  public resolveAlert(alertId: string, resolution?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();
    if (resolution) {
      alert.metadata = { ...alert.metadata, resolution };
    }

    logger.info('Security alert resolved', {
      alertId,
      resolvedAt: alert.resolvedAt,
      resolution,
    });

    return true;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): SecurityAlert[] {
    return Array.from(this.activeAlerts.values()).filter(
      alert => !alert.resolved
    );
  }

  /**
   * Get audit history with trend analysis
   */
  public getAuditHistory(days: number = 30): {
    audits: SecurityAuditRecord[];
    trends: {
      averageScore: number;
      scoreImprovement: number;
      criticalIssuesTrend: number;
      lastAuditDate: Date;
    };
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentAudits = this.auditHistory
      .filter(audit => audit.timestamp > cutoffDate)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (recentAudits.length === 0) {
      return {
        audits: [],
        trends: {
          averageScore: 0,
          scoreImprovement: 0,
          criticalIssuesTrend: 0,
          lastAuditDate: new Date(),
        },
      };
    }

    const averageScore =
      recentAudits.reduce((sum, audit) => sum + audit.overallScore, 0) /
      recentAudits.length;
    const firstAudit = recentAudits[0];
    const lastAudit = recentAudits[recentAudits.length - 1];

    if (!firstAudit || !lastAudit) {
      return {
        audits: recentAudits,
        trends: {
          averageScore: Math.round(averageScore * 100) / 100,
          scoreImprovement: 0,
          criticalIssuesTrend: 0,
          lastAuditDate: new Date(),
        },
      };
    }

    const firstScore = firstAudit.overallScore;
    const lastScore = lastAudit.overallScore;
    const scoreImprovement = lastScore - firstScore;

    const firstCritical = firstAudit.criticalIssues;
    const lastCritical = lastAudit.criticalIssues;
    const criticalIssuesTrend = lastCritical - firstCritical;

    return {
      audits: recentAudits,
      trends: {
        averageScore: Math.round(averageScore * 100) / 100,
        scoreImprovement: Math.round(scoreImprovement * 100) / 100,
        criticalIssuesTrend,
        lastAuditDate: lastAudit.timestamp,
      },
    };
  }

  /**
   * Extract affected components from audit details
   */
  private extractAffectedComponents(details: SecurityAuditDetails): string[] {
    const components: string[] = [];

    if (details.apiKeyAudit.expiredKeys.length > 0) {
      components.push('API Key Management');
    }

    if (details.apiKeyAudit.weakKeys.length > 0) {
      components.push('API Key Security');
    }

    if (!details.encryptionAudit.encryptionTestPassed) {
      components.push('Encryption Service');
    }

    if (details.environmentAudit.productionIssues.length > 0) {
      components.push('Production Configuration');
    }

    return components;
  }

  /**
   * Clean up resolved alerts that are older than configured retention period
   */
  private cleanupResolvedAlerts(): void {
    const cutoffTime = new Date();
    cutoffTime.setHours(
      cutoffTime.getHours() - this.config.RESOLVED_ALERT_RETENTION_HOURS
    );

    let cleanedCount = 0;

    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoffTime) {
        this.activeAlerts.delete(alertId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} resolved alerts from memory`, {
        cleanedCount,
        remainingAlerts: this.activeAlerts.size,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get service health status
   */
  public getHealthStatus(): {
    isRunning: boolean;
    lastAuditDate?: Date;
    activeAlertsCount: number;
    auditInterval: string;
    cleanupInterval: string;
  } {
    const lastAudit = this.auditHistory[this.auditHistory.length - 1];

    return {
      isRunning: this.isRunning,
      lastAuditDate: lastAudit?.timestamp,
      activeAlertsCount: this.getActiveAlerts().length,
      auditInterval: `${this.config.DAILY_AUDIT_INTERVAL / (60 * 60 * 1000)} hours`,
      cleanupInterval: `${this.config.HOURLY_CLEANUP_INTERVAL / (60 * 60 * 1000)} hours`,
    };
  }
}

// Singleton instance
let _securityMonitoringService: SecurityMonitoringService;

export const getSecurityMonitoringService = (): SecurityMonitoringService => {
  if (!_securityMonitoringService) {
    _securityMonitoringService = new SecurityMonitoringService();
  }
  return _securityMonitoringService;
};

export const securityMonitoringService = getSecurityMonitoringService();
