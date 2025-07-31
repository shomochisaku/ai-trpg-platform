import { SecretsService } from '../../src/services/secretsService';
import crypto from 'crypto';

describe('SecretsService Encryption Tests', () => {
  let secretsService: SecretsService;

  beforeEach(() => {
    // Use the test master key from .env.test for consistent testing
    secretsService = new SecretsService();
  });

  describe('Encryption/Decryption Round-trip Tests', () => {
    test('should encrypt and decrypt simple text correctly', () => {
      const plaintext = 'Hello, World!';
      
      const encrypted = secretsService.encryptSecret(plaintext);
      const decrypted = secretsService.decryptSecret(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt and decrypt empty string', () => {
      const plaintext = '';
      
      const encrypted = secretsService.encryptSecret(plaintext);
      const decrypted = secretsService.decryptSecret(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt and decrypt long text (1MB)', () => {
      const plaintext = 'A'.repeat(1024 * 1024); // 1MB of text
      
      const encrypted = secretsService.encryptSecret(plaintext);
      const decrypted = secretsService.decryptSecret(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt and decrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?`~"\'\\n\\t\\r';
      
      const encrypted = secretsService.encryptSecret(plaintext);
      const decrypted = secretsService.decryptSecret(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt and decrypt Unicode text', () => {
      const plaintext = '🚀 Testing Unicode: 日本語, العربية, Ελληνικά 🔐';
      
      const encrypted = secretsService.encryptSecret(plaintext);
      const decrypted = secretsService.decryptSecret(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt and decrypt API keys format', () => {
      const plaintext = 'sk-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const encrypted = secretsService.encryptSecret(plaintext);
      const decrypted = secretsService.decryptSecret(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Encryption Security Tests', () => {
    test('should generate different IV for each encryption', () => {
      const plaintext = 'Same plaintext';
      
      const encrypted1 = secretsService.encryptSecret(plaintext);
      const encrypted2 = secretsService.encryptSecret(plaintext);
      
      // IVs should be different
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      // Encrypted data should be different due to different IVs
      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
      // Both should decrypt to same plaintext
      expect(secretsService.decryptSecret(encrypted1)).toBe(plaintext);
      expect(secretsService.decryptSecret(encrypted2)).toBe(plaintext);
    });

    test('should have proper IV length (12 bytes for GCM)', () => {
      const plaintext = 'Test IV length';
      
      const encrypted = secretsService.encryptSecret(plaintext);
      const ivBuffer = Buffer.from(encrypted.iv, 'hex');
      
      expect(ivBuffer.length).toBe(12); // 12 bytes = 24 hex characters
    });

    test('should have authentication tag', () => {
      const plaintext = 'Test authentication tag';
      
      const encrypted = secretsService.encryptSecret(plaintext);
      
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.tag.length).toBeGreaterThan(0);
      
      const tagBuffer = Buffer.from(encrypted.tag, 'hex');
      expect(tagBuffer.length).toBe(16); // GCM auth tag is 16 bytes
    });

    test('should fail with tampered encrypted data', () => {
      const plaintext = 'Original data';
      const encrypted = secretsService.encryptSecret(plaintext);
      
      // Tamper with encrypted data
      const tamperedEncrypted = {
        ...encrypted,
        encryptedData: encrypted.encryptedData.replace('a', 'b')
      };
      
      expect(() => {
        secretsService.decryptSecret(tamperedEncrypted);
      }).toThrow('Secret decryption failed');
    });

    test('should fail with tampered authentication tag', () => {
      const plaintext = 'Original data';
      const encrypted = secretsService.encryptSecret(plaintext);
      
      // Tamper with authentication tag
      const tamperedEncrypted = {
        ...encrypted,
        tag: encrypted.tag.replace('a', 'b')
      };
      
      expect(() => {
        secretsService.decryptSecret(tamperedEncrypted);
      }).toThrow('Secret decryption failed');
    });

    test('should fail with tampered IV', () => {
      const plaintext = 'Original data';
      const encrypted = secretsService.encryptSecret(plaintext);
      
      // Tamper with IV - change first byte completely
      const ivBuffer = Buffer.from(encrypted.iv, 'hex');
      ivBuffer[0] = ivBuffer[0] ^ 0xFF; // XOR with 0xFF to ensure change
      const tamperedEncrypted = {
        ...encrypted,
        iv: ivBuffer.toString('hex')
      };
      
      expect(() => {
        secretsService.decryptSecret(tamperedEncrypted);
      }).toThrow('Secret decryption failed');
    });

    test('should fail with invalid hex encoding', () => {
      const invalidEncrypted = {
        iv: 'invalid-hex',
        encryptedData: 'also-invalid-hex',
        tag: 'not-hex-either'
      };
      
      expect(() => {
        secretsService.decryptSecret(invalidEncrypted);
      }).toThrow('Secret decryption failed');
    });
  });

  describe('Different Master Keys', () => {
    test('should fail to decrypt with different master key', () => {
      const plaintext = 'Test different keys';
      
      // Encrypt with the default test key
      const encrypted = secretsService.encryptSecret(plaintext);
      
      // Save original key and set a different one temporarily
      const originalKey = process.env.MASTER_ENCRYPTION_KEY;
      process.env.MASTER_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      const secretsService2 = new SecretsService();
      
      // Decryption should fail with different key
      expect(() => {
        secretsService2.decryptSecret(encrypted);
      }).toThrow('Secret decryption failed');
      
      // Restore original key
      process.env.MASTER_ENCRYPTION_KEY = originalKey;
    });
  });

  describe('Performance Tests', () => {
    test('should encrypt/decrypt within reasonable time', () => {
      const plaintext = 'Performance test data';
      
      const startTime = Date.now();
      const encrypted = secretsService.encryptSecret(plaintext);
      const encryptTime = Date.now() - startTime;
      
      const decryptStart = Date.now();
      const decrypted = secretsService.decryptSecret(encrypted);
      const decryptTime = Date.now() - decryptStart;
      
      expect(decrypted).toBe(plaintext);
      expect(encryptTime).toBeLessThan(100); // Should encrypt within 100ms
      expect(decryptTime).toBeLessThan(100); // Should decrypt within 100ms
    });
  });
});