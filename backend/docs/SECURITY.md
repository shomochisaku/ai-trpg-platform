# Security Implementation Guide

## Overview

This document outlines the comprehensive security measures implemented in the AI-TRPG platform backend to protect API keys, sensitive data, and ensure production-ready security compliance.

## Security Components

### 1. API Key Management System

#### Features
- **Centralized Key Management**: All API keys managed through `ApiKeyManager` class
- **Usage Tracking**: Monitors API key usage patterns and frequency
- **Automatic Rotation Monitoring**: Alerts when keys are older than 30 days
- **Key Strength Validation**: Validates API key format and cryptographic strength
- **Secure Token-Based Rotation**: Uses cryptographically signed tokens for secure key rotation

#### Implementation
```typescript
// Access API key manager
import { apiKeyManager } from '@/middleware/apiKeyManager';

// Get secured key (tracks usage automatically)
const apiKey = apiKeyManager.getSecuredKey('OPENAI_API_KEY');

// Perform security audit
const audit = apiKeyManager.performSecurityAudit();
```

### 2. Environment Variable Encryption

#### Features
- **Production Encryption**: Automatic encryption of sensitive environment variables in production
- **Master Key Management**: Uses `MASTER_ENCRYPTION_KEY` for encryption operations
- **Development Fallback**: Allows unencrypted variables in development for easier debugging

#### Implementation
```typescript
import { secretsService } from '@/services/secretsService';

// Encrypt sensitive data
const encrypted = secretsService.encryptSecret(sensitiveValue);

// Decrypt when needed
const decrypted = secretsService.decryptSecret(encrypted);
```

### 3. AI API Proxy Service

#### Purpose
- **API Key Protection**: Prevents exposure of AI API keys to frontend
- **Centralized Request Management**: All AI API calls go through secure backend proxy
- **Usage Monitoring**: Tracks API usage, response times, and error rates
- **Request Validation**: Validates and sanitizes all AI API requests

#### Endpoints
```
POST /api/ai-proxy/openai    - Proxy OpenAI API requests
POST /api/ai-proxy/anthropic - Proxy Anthropic API requests
GET  /api/ai-proxy/health    - Health check
GET  /api/ai-proxy/stats     - Usage statistics (internal only)
POST /api/ai-proxy/refresh   - Refresh clients (for key rotation)
```

#### Security Features
- **Internal Service Headers**: Validates `X-Internal-Service` header
- **Request Size Limits**: 50KB per message, 100KB total
- **Message Count Limits**: Maximum 50 messages per request
- **Rate Limiting**: Integrated with existing rate limiting middleware

### 4. Security Audit System

#### Features
- **Comprehensive Security Scoring**: 0-100 security score based on multiple factors
- **Issue Classification**: Critical, High, Medium, Low severity levels
- **Production Environment Validation**: Special checks for production deployments
- **Automated Monitoring**: Regular security health checks

#### Audit Categories
1. **Key Strength**: Validates cryptographic strength of API keys
2. **Key Expiration**: Monitors for expired or soon-to-expire keys
3. **Key Rotation**: Tracks rotation schedules and recommendations
4. **Usage Monitoring**: Identifies abnormal usage patterns
5. **Production Security**: Ensures production-specific security measures

### 5. Security Admin Endpoints

Protected admin endpoints for security management:

```
GET  /api/security/audit              - Comprehensive security audit
GET  /api/security/api-keys/health    - API key health status
POST /api/security/api-keys/rotate    - Rotate API key with secure token
POST /api/security/api-keys/generate  - Generate new secure API key
GET  /api/security/ai-proxy/stats     - AI proxy usage statistics
POST /api/security/ai-proxy/refresh   - Refresh AI proxy clients
POST /api/security/secrets/test       - Test secrets service functionality
```

#### Authentication
Admin endpoints require `X-Admin-Token` header matching `ADMIN_TOKEN` environment variable.

## Environment Variables

### Required for Production

```bash
# Master encryption key (minimum 64 characters)
MASTER_ENCRYPTION_KEY="your-master-encryption-key-for-production-minimum-64-chars-long"

# Admin access token for security endpoints
ADMIN_TOKEN="your-admin-token-for-security-endpoints"

# Internal API URL for service communication
INTERNAL_API_URL="http://localhost:3000"

# Strong JWT secrets
JWT_SECRET="your-jwt-secret-key-at-least-32-characters-long"
JWT_REFRESH_SECRET="your-refresh-token-secret-key-different-from-jwt-secret"

# API keys (stored securely)
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### Security Validation

The system automatically validates:
- JWT secret minimum length (32 characters)
- OpenAI API key format (starts with 'sk-', minimum 20 characters)
- Production environment requirements
- Master encryption key presence in production

## Security Best Practices

### 1. API Key Rotation

```bash
# Generate rotation token (admin only)
curl -X POST /api/security/api-keys/generate \
  -H "X-Admin-Token: your-admin-token" \
  -H "Content-Type: application/json"

# Rotate key with token
curl -X POST /api/security/api-keys/rotate \
  -H "X-Admin-Token: your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "rotationToken": "base64-encoded-token",
    "newKey": "new-secure-api-key"
  }'
```

### 2. Security Auditing

```bash
# Run comprehensive security audit
curl -X GET /api/security/audit \
  -H "X-Admin-Token: your-admin-token"
```

### 3. Monitoring and Alerting

The system provides:
- **Usage Tracking**: API key usage patterns and frequency
- **Security Scoring**: Overall security posture scoring
- **Alert Generation**: Automatic alerts for security issues
- **Audit Logging**: Comprehensive security audit trails

## Frontend Integration

### Secure API Calls

Frontend should never contain API keys. All AI API calls must go through backend proxy:

```typescript
// ❌ NEVER do this - exposes API key
const openai = new OpenAI({ apiKey: 'sk-...' });

// ✅ Always use backend API
const response = await fetch('/api/campaigns/123/action', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'player action' })
});
```

## Compliance and Auditing

### Security Compliance Features

1. **Access Logging**: All security-related operations are logged
2. **Audit Trails**: Complete audit trails for key rotations and security changes
3. **Health Monitoring**: Continuous monitoring of security posture
4. **Incident Response**: Automated alerts for security incidents

### Regular Security Tasks

1. **Weekly**: Review security audit results
2. **Monthly**: Rotate API keys older than 30 days
3. **Quarterly**: Comprehensive security review and testing
4. **Production Deployment**: Full security audit before each deployment

## Troubleshooting

### Common Issues

1. **Missing MASTER_ENCRYPTION_KEY in Production**
   - Ensure environment variable is set
   - Minimum 64 characters required

2. **API Key Rotation Failures**
   - Verify rotation token validity (24-hour expiration)
   - Check new key strength requirements

3. **Security Audit Failures**
   - Review audit results for specific issues
   - Address critical issues before production deployment

### Testing Security Implementation

```bash
# Test secrets service
curl -X POST /api/security/secrets/test \
  -H "X-Admin-Token: your-admin-token"

# Check AI proxy health
curl -X GET /api/ai-proxy/health

# Run security audit
curl -X GET /api/security/audit \
  -H "X-Admin-Token: your-admin-token"
```

## Security Contact

For security issues or questions:
- Review this documentation
- Check security audit results
- Monitor application logs for security warnings
- Ensure all production security requirements are met

## Version History

- **v1.0**: Initial security implementation with API key management
- **v1.1**: Added environment variable encryption
- **v1.2**: Implemented AI proxy service and comprehensive auditing