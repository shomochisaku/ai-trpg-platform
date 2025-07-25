import crypto from 'crypto';
import { logger } from '@/utils/logger';

// Interface for encrypted secrets
export interface EncryptedSecret {
  iv: string;
  encryptedData: string;
  tag: string;
}

// Interface for secret configuration
export interface SecretConfig {
  name: string;
  value: string;
  encrypted?: boolean;
  rotatable?: boolean;
  lastRotated?: Date;
  expiresAt?: Date;
}

export class SecretsService {
  private masterKey!: Buffer;
  private algorithm = 'aes-256-gcm';
  private keyDerivationSalt!: Buffer;

  constructor() {
    this.initializeMasterKey();
  }

  private initializeMasterKey(): void {
    // In production, this should come from a secure key management service
    const masterKeySource = process.env.MASTER_ENCRYPTION_KEY || 
                           process.env.JWT_SECRET ||
                           'fallback-development-key-change-in-production';
    
    // Derive a consistent key from the source
    this.keyDerivationSalt = Buffer.from('ai-trpg-salt', 'utf8');
    this.masterKey = crypto.pbkdf2Sync(masterKeySource, this.keyDerivationSalt, 100000, 32, 'sha256');

    if (process.env.NODE_ENV === 'production' && !process.env.MASTER_ENCRYPTION_KEY) {
      logger.error('Production environment missing MASTER_ENCRYPTION_KEY');
      throw new Error('MASTER_ENCRYPTION_KEY is required in production');
    }
  }

  /**
   * Encrypt a secret value
   */
  public encryptSecret(plaintext: string): EncryptedSecret {
    try {
      const iv = crypto.randomBytes(12); // 12 bytes for GCM
      const cipher = crypto.createCipher(this.algorithm, this.masterKey);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // For GCM mode, we need to create the tag manually using HMAC
      const hmac = crypto.createHmac('sha256', this.masterKey);
      hmac.update(encrypted);
      hmac.update(iv);
      const tag = hmac.digest();

      return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        tag: tag.toString('hex')
      };
    } catch (error) {
      logger.error('Failed to encrypt secret:', error);
      throw new Error('Secret encryption failed');
    }
  }

  /**
   * Decrypt a secret value
   */
  public decryptSecret(encryptedSecret: EncryptedSecret): string {
    try {
      const iv = Buffer.from(encryptedSecret.iv, 'hex');
      
      // Verify the tag first
      const hmac = crypto.createHmac('sha256', this.masterKey);
      hmac.update(encryptedSecret.encryptedData);
      hmac.update(iv);
      const expectedTag = hmac.digest();
      const providedTag = Buffer.from(encryptedSecret.tag, 'hex');
      
      if (!crypto.timingSafeEqual(expectedTag, providedTag)) {
        throw new Error('Authentication tag verification failed');
      }

      const decipher = crypto.createDecipher(this.algorithm, this.masterKey);
      let decrypted = decipher.update(encryptedSecret.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt secret:', error);
      throw new Error('Secret decryption failed');
    }
  }

  /**
   * Securely store environment variables
   */
  public secureEnvironmentVariable(name: string, value: string): EncryptedSecret {
    if (process.env.NODE_ENV === 'development') {
      // In development, log a warning but don't encrypt (for easier debugging)
      logger.warn(`Environment variable ${name} is not encrypted in development mode`);
      return {
        iv: '',
        encryptedData: value,
        tag: ''
      };
    }

    return this.encryptSecret(value);
  }

  /**
   * Retrieve and decrypt environment variables
   */
  public getSecureEnvironmentVariable(name: string, encryptedSecret: EncryptedSecret): string {
    if (process.env.NODE_ENV === 'development' && !encryptedSecret.iv && !encryptedSecret.tag) {
      // Development mode - return as-is
      return encryptedSecret.encryptedData;
    }

    return this.decryptSecret(encryptedSecret);
  }

  /**
   * Generate a secure API key
   */
  public generateSecureApiKey(length: number = 64): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Validate API key format and strength
   */
  public validateApiKeyStrength(apiKey: string): {
    isValid: boolean;
    strength: 'weak' | 'medium' | 'strong';
    issues: string[];
  } {
    const issues: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'strong';

    // Check length
    if (apiKey.length < 32) {
      issues.push('API key is too short (minimum 32 characters)');
      strength = 'weak';
    } else if (apiKey.length < 64) {
      strength = 'medium';
    }

    // Check for entropy (basic check)
    const uniqueChars = new Set(apiKey).size;
    if (uniqueChars < 16) {
      issues.push('API key has low entropy');
      strength = 'weak';
    }

    // Check for patterns
    if (/(.)\1{3,}/.test(apiKey)) {
      issues.push('API key contains repeated character patterns');
      strength = 'weak';
    }

    return {
      isValid: issues.length === 0,
      strength,
      issues
    };
  }

  /**
   * Securely compare API keys (timing-safe)
   */
  public secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Generate a rotation token for API keys
   */
  public generateRotationToken(apiKeyName: string): string {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16);
    const payload = JSON.stringify({ apiKeyName, timestamp });
    
    const hmac = crypto.createHmac('sha256', this.masterKey);
    hmac.update(payload);
    const signature = hmac.digest('hex');

    return Buffer.from(JSON.stringify({
      payload,
      signature,
      randomBytes: randomBytes.toString('hex')
    })).toString('base64');
  }

  /**
   * Verify a rotation token
   */
  public verifyRotationToken(token: string): { valid: boolean; apiKeyName?: string; timestamp?: number } {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      const { payload, signature } = decoded;

      const hmac = crypto.createHmac('sha256', this.masterKey);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');

      if (!this.secureCompare(signature, expectedSignature)) {
        return { valid: false };
      }

      const parsedPayload = JSON.parse(payload);
      
      // Check if token is not expired (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - parsedPayload.timestamp > maxAge) {
        return { valid: false };
      }

      return {
        valid: true,
        apiKeyName: parsedPayload.apiKeyName,
        timestamp: parsedPayload.timestamp
      };
    } catch (error) {
      logger.error('Failed to verify rotation token:', error);
      return { valid: false };
    }
  }

  /**
   * Health check for secrets service
   */
  public healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, unknown>;
  } {
    const details: Record<string, unknown> = {
      masterKeyInitialized: !!this.masterKey,
      algorithm: this.algorithm,
      environment: process.env.NODE_ENV || 'unknown'
    };

    // Test encryption/decryption
    try {
      const testValue = 'test-secret-value';
      const encrypted = this.encryptSecret(testValue);
      const decrypted = this.decryptSecret(encrypted);
      
      if (decrypted !== testValue) {
        return {
          status: 'unhealthy',
          details: { ...details, error: 'Encryption/decryption test failed' }
        };
      }

      details.encryptionTest = 'passed';
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { ...details, error: 'Encryption test error', message: error instanceof Error ? error.message : 'Unknown error' }
      };
    }

    // Check for production security requirements
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.MASTER_ENCRYPTION_KEY) {
        return {
          status: 'degraded',
          details: { ...details, warning: 'Missing MASTER_ENCRYPTION_KEY in production' }
        };
      }
    }

    return {
      status: 'healthy',
      details
    };
  }
}

// Singleton instance
let _secretsService: SecretsService;

export const getSecretsService = (): SecretsService => {
  if (!_secretsService) {
    _secretsService = new SecretsService();
  }
  return _secretsService;
};

export const secretsService = getSecretsService();