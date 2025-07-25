/**
 * Security Monitoring Configuration
 *
 * Centralizes all configuration values for the security monitoring system.
 * Values can be overridden via environment variables for production deployment.
 */
export class SecurityMonitoringConfig {
  // Score calculation weights
  public readonly CRITICAL_WEIGHT: number;
  public readonly HIGH_WEIGHT: number;
  public readonly MEDIUM_WEIGHT: number;
  public readonly LOW_WEIGHT: number;

  // Alert thresholds
  public readonly SCORE_DROP_THRESHOLD: number;
  public readonly SIGNIFICANT_DROP_THRESHOLD: number;

  // Audit history retention
  public readonly AUDIT_HISTORY_DAYS: number;
  public readonly MAX_POSSIBLE_ISSUES: number;

  // Cleanup intervals (in milliseconds)
  public readonly DAILY_AUDIT_INTERVAL: number;
  public readonly HOURLY_CLEANUP_INTERVAL: number;
  public readonly ALERT_CLEANUP_INTERVAL: number;

  // Query parameter limits
  public readonly MIN_DAYS_PARAM: number;
  public readonly MAX_DAYS_PARAM: number;
  public readonly DEFAULT_DAYS_PARAM: number;

  // Alert cleanup thresholds
  public readonly RESOLVED_ALERT_RETENTION_HOURS: number;

  constructor() {
    // Score calculation weights (default values from original implementation)
    this.CRITICAL_WEIGHT = this.parseEnvFloat('SECURITY_CRITICAL_WEIGHT', 4);
    this.HIGH_WEIGHT = this.parseEnvFloat('SECURITY_HIGH_WEIGHT', 2);
    this.MEDIUM_WEIGHT = this.parseEnvFloat('SECURITY_MEDIUM_WEIGHT', 1);
    this.LOW_WEIGHT = this.parseEnvFloat('SECURITY_LOW_WEIGHT', 0.5);

    // Alert thresholds
    this.SCORE_DROP_THRESHOLD = this.parseEnvInt(
      'SECURITY_SCORE_DROP_THRESHOLD',
      10
    );
    this.SIGNIFICANT_DROP_THRESHOLD = this.parseEnvInt(
      'SECURITY_SIGNIFICANT_DROP_THRESHOLD',
      20
    );

    // Audit history retention
    this.AUDIT_HISTORY_DAYS = this.parseEnvInt(
      'SECURITY_AUDIT_HISTORY_DAYS',
      90
    );
    this.MAX_POSSIBLE_ISSUES = this.parseEnvInt(
      'SECURITY_MAX_POSSIBLE_ISSUES',
      20
    );

    // Cleanup intervals (converted to milliseconds)
    this.DAILY_AUDIT_INTERVAL =
      this.parseEnvInt('SECURITY_DAILY_AUDIT_INTERVAL_HOURS', 24) *
      60 *
      60 *
      1000;
    this.HOURLY_CLEANUP_INTERVAL =
      this.parseEnvInt('SECURITY_CLEANUP_INTERVAL_HOURS', 1) * 60 * 60 * 1000;
    this.ALERT_CLEANUP_INTERVAL =
      this.parseEnvInt('SECURITY_ALERT_CLEANUP_INTERVAL_HOURS', 6) *
      60 *
      60 *
      1000;

    // Query parameter limits
    this.MIN_DAYS_PARAM = this.parseEnvInt('SECURITY_MIN_DAYS_PARAM', 1);
    this.MAX_DAYS_PARAM = this.parseEnvInt('SECURITY_MAX_DAYS_PARAM', 365);
    this.DEFAULT_DAYS_PARAM = this.parseEnvInt(
      'SECURITY_DEFAULT_DAYS_PARAM',
      30
    );

    // Alert cleanup thresholds
    this.RESOLVED_ALERT_RETENTION_HOURS = this.parseEnvInt(
      'SECURITY_RESOLVED_ALERT_RETENTION_HOURS',
      24
    );

    // Validate configuration
    this.validateConfig();
  }

  /**
   * Parse environment variable as integer with fallback to default
   */
  private parseEnvInt(envVar: string, defaultValue: number): number {
    const value = process.env[envVar];
    if (value === undefined) return defaultValue;

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      console.warn(
        `Invalid ${envVar} value: ${value}, using default: ${defaultValue}`
      );
      return defaultValue;
    }

    return parsed;
  }

  /**
   * Parse environment variable as float with fallback to default
   */
  private parseEnvFloat(envVar: string, defaultValue: number): number {
    const value = process.env[envVar];
    if (value === undefined) return defaultValue;

    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      console.warn(
        `Invalid ${envVar} value: ${value}, using default: ${defaultValue}`
      );
      return defaultValue;
    }

    return parsed;
  }

  /**
   * Validate configuration values
   */
  private validateConfig(): void {
    const errors: string[] = [];

    // Validate weights are positive
    if (this.CRITICAL_WEIGHT <= 0)
      errors.push('CRITICAL_WEIGHT must be positive');
    if (this.HIGH_WEIGHT <= 0) errors.push('HIGH_WEIGHT must be positive');
    if (this.MEDIUM_WEIGHT <= 0) errors.push('MEDIUM_WEIGHT must be positive');
    if (this.LOW_WEIGHT <= 0) errors.push('LOW_WEIGHT must be positive');

    // Validate thresholds
    if (this.SCORE_DROP_THRESHOLD <= 0)
      errors.push('SCORE_DROP_THRESHOLD must be positive');
    if (this.SIGNIFICANT_DROP_THRESHOLD <= this.SCORE_DROP_THRESHOLD) {
      errors.push(
        'SIGNIFICANT_DROP_THRESHOLD must be greater than SCORE_DROP_THRESHOLD'
      );
    }

    // Validate retention periods
    if (this.AUDIT_HISTORY_DAYS <= 0)
      errors.push('AUDIT_HISTORY_DAYS must be positive');
    if (this.RESOLVED_ALERT_RETENTION_HOURS <= 0)
      errors.push('RESOLVED_ALERT_RETENTION_HOURS must be positive');

    // Validate parameter limits
    if (this.MIN_DAYS_PARAM <= 0)
      errors.push('MIN_DAYS_PARAM must be positive');
    if (this.MAX_DAYS_PARAM <= this.MIN_DAYS_PARAM) {
      errors.push('MAX_DAYS_PARAM must be greater than MIN_DAYS_PARAM');
    }
    if (
      this.DEFAULT_DAYS_PARAM < this.MIN_DAYS_PARAM ||
      this.DEFAULT_DAYS_PARAM > this.MAX_DAYS_PARAM
    ) {
      errors.push(
        'DEFAULT_DAYS_PARAM must be within MIN_DAYS_PARAM and MAX_DAYS_PARAM range'
      );
    }

    // Validate intervals
    if (this.DAILY_AUDIT_INTERVAL <= 0)
      errors.push('DAILY_AUDIT_INTERVAL must be positive');
    if (this.HOURLY_CLEANUP_INTERVAL <= 0)
      errors.push('HOURLY_CLEANUP_INTERVAL must be positive');
    if (this.ALERT_CLEANUP_INTERVAL <= 0)
      errors.push('ALERT_CLEANUP_INTERVAL must be positive');

    if (errors.length > 0) {
      throw new Error(
        `Security Monitoring Configuration Errors:\n${errors.join('\n')}`
      );
    }
  }

  /**
   * Get configuration summary for logging
   */
  public getConfigSummary(): Record<string, unknown> {
    return {
      scoreWeights: {
        critical: this.CRITICAL_WEIGHT,
        high: this.HIGH_WEIGHT,
        medium: this.MEDIUM_WEIGHT,
        low: this.LOW_WEIGHT,
      },
      alertThresholds: {
        scoreDropThreshold: this.SCORE_DROP_THRESHOLD,
        significantDropThreshold: this.SIGNIFICANT_DROP_THRESHOLD,
      },
      retentionPolicies: {
        auditHistoryDays: this.AUDIT_HISTORY_DAYS,
        resolvedAlertRetentionHours: this.RESOLVED_ALERT_RETENTION_HOURS,
      },
      intervals: {
        dailyAuditHours: this.DAILY_AUDIT_INTERVAL / (60 * 60 * 1000),
        cleanupHours: this.HOURLY_CLEANUP_INTERVAL / (60 * 60 * 1000),
        alertCleanupHours: this.ALERT_CLEANUP_INTERVAL / (60 * 60 * 1000),
      },
      queryLimits: {
        minDays: this.MIN_DAYS_PARAM,
        maxDays: this.MAX_DAYS_PARAM,
        defaultDays: this.DEFAULT_DAYS_PARAM,
      },
    };
  }
}

// Singleton instance
let _securityConfig: SecurityMonitoringConfig;

export const getSecurityConfig = (): SecurityMonitoringConfig => {
  if (!_securityConfig) {
    _securityConfig = new SecurityMonitoringConfig();
  }
  return _securityConfig;
};

export const securityConfig = getSecurityConfig();
