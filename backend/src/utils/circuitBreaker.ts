import CircuitBreaker from 'opossum';
import { logger } from './logger';

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  name?: string;
  volumeThreshold?: number;
}

/**
 * Default circuit breaker configuration for AI services
 */
export const DEFAULT_AI_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  timeout: 30000, // 30 seconds timeout
  errorThresholdPercentage: 50, // Trip when 50% of requests fail
  resetTimeout: 30000, // Try again after 30 seconds
  rollingCountTimeout: 60000, // 1 minute rolling window
  rollingCountBuckets: 10, // 10 buckets for rolling count
  volumeThreshold: 10, // Minimum 10 requests before circuit can trip
  name: 'AI_API_CIRCUIT_BREAKER',
};

/**
 * Circuit breaker wrapper for AI API calls
 */
export class AICircuitBreaker {
  private breaker: CircuitBreaker;
  private options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions = DEFAULT_AI_CIRCUIT_BREAKER_OPTIONS) {
    this.options = { ...DEFAULT_AI_CIRCUIT_BREAKER_OPTIONS, ...options };
    
    this.breaker = new CircuitBreaker(this.executeWithFallback.bind(this), {
      timeout: this.options.timeout!,
      errorThresholdPercentage: this.options.errorThresholdPercentage!,
      resetTimeout: this.options.resetTimeout!,
      rollingCountTimeout: this.options.rollingCountTimeout!,
      rollingCountBuckets: this.options.rollingCountBuckets!,
      volumeThreshold: this.options.volumeThreshold!,
      name: this.options.name!,
    });

    this.setupEventHandlers();
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T> | T
  ): Promise<T> {
    return this.breaker.fire(operation, fallback);
  }

  /**
   * Internal method to execute with fallback handling
   */
  private async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T> | T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      logger.error(`Circuit breaker operation failed:`, {
        name: this.options.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (fallback) {
        logger.info(`Executing fallback for circuit breaker: ${this.options.name}`);
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Setup event handlers for circuit breaker
   */
  private setupEventHandlers(): void {
    this.breaker.on('open', () => {
      logger.warn(`Circuit breaker opened: ${this.options.name}`, {
        stats: this.getStats(),
      });
    });

    this.breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-opened: ${this.options.name}`, {
        stats: this.getStats(),
      });
    });

    this.breaker.on('close', () => {
      logger.info(`Circuit breaker closed: ${this.options.name}`, {
        stats: this.getStats(),
      });
    });

    this.breaker.on('failure', (error) => {
      logger.warn(`Circuit breaker failure: ${this.options.name}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stats: this.getStats(),
      });
    });

    this.breaker.on('success', () => {
      logger.debug(`Circuit breaker success: ${this.options.name}`);
    });

    this.breaker.on('timeout', () => {
      logger.warn(`Circuit breaker timeout: ${this.options.name}`, {
        timeout: this.options.timeout,
        stats: this.getStats(),
      });
    });

    this.breaker.on('reject', () => {
      logger.warn(`Circuit breaker rejected request: ${this.options.name}`, {
        stats: this.getStats(),
      });
    });
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return {
      name: this.options.name,
      state: this.breaker.opened ? 'OPEN' : this.breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: this.breaker.stats,
      options: {
        timeout: this.options.timeout,
        errorThresholdPercentage: this.options.errorThresholdPercentage,
        resetTimeout: this.options.resetTimeout,
        volumeThreshold: this.options.volumeThreshold,
      },
    };
  }

  /**
   * Check if circuit breaker is open
   */
  isOpen(): boolean {
    return this.breaker.opened;
  }

  /**
   * Check if circuit breaker is half-open
   */
  isHalfOpen(): boolean {
    return this.breaker.halfOpen;
  }

  /**
   * Check if circuit breaker is closed
   */
  isClosed(): boolean {
    return !this.breaker.opened && !this.breaker.halfOpen;
  }

  /**
   * Manually open the circuit breaker
   */
  open(): void {
    this.breaker.open();
  }

  /**
   * Manually close the circuit breaker
   */
  close(): void {
    this.breaker.close();
  }
}

/**
 * Global circuit breakers for different AI services
 */
export class CircuitBreakerManager {
  private breakers: Map<string, AICircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker for a service
   */
  getCircuitBreaker(
    serviceName: string,
    options?: CircuitBreakerOptions
  ): AICircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const breakerOptions = {
        ...DEFAULT_AI_CIRCUIT_BREAKER_OPTIONS,
        ...options,
        name: `${serviceName}_CIRCUIT_BREAKER`,
      };
      
      this.breakers.set(serviceName, new AICircuitBreaker(breakerOptions));
      logger.info(`Created circuit breaker for service: ${serviceName}`);
    }

    return this.breakers.get(serviceName)!;
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats() {
    const stats: Record<string, any> = {};
    
    for (const [serviceName, breaker] of this.breakers) {
      stats[serviceName] = breaker.getStats();
    }

    return stats;
  }

  /**
   * Check health of all circuit breakers
   */
  getHealthStatus() {
    const health = {
      healthy: true,
      services: {} as Record<string, any>,
    };

    for (const [serviceName, breaker] of this.breakers) {
      const serviceHealth = {
        healthy: breaker.isClosed(),
        state: breaker.isOpen() ? 'OPEN' : breaker.isHalfOpen() ? 'HALF_OPEN' : 'CLOSED',
        stats: breaker.getStats(),
      };

      health.services[serviceName] = serviceHealth;
      
      if (!serviceHealth.healthy) {
        health.healthy = false;
      }
    }

    return health;
  }
}

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();