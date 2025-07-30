# Environment Variables Guide

## Overview

This document provides a comprehensive guide to all environment variables used in the AI-TRPG Platform for both development and production environments.

## 🔐 Security Best Practices

### ⚠️ Critical Security Notes

1. **Never commit secrets**: Always use `.env` files (which are in `.gitignore`)
2. **Use strong secrets**: Generate cryptographically secure random strings
3. **Rotate keys regularly**: Especially in production environments
4. **Separate environments**: Use different values for dev/staging/production
5. **Principle of least privilege**: Only set necessary environment variables

### Secret Generation Commands

```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Generate master encryption key (64+ characters)
openssl rand -base64 64

# Generate session secret
openssl rand -hex 32
```

## 🖥️ Backend Environment Variables

### Core Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Runtime environment |
| `PORT` | No | `3000` | Server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret (32+ chars) |

### Database Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | No | Redis connection for caching | `redis://localhost:6379` |
| `DB_CONNECTION_TIMEOUT` | No | Database connection timeout (ms) | `10000` |

### AI Services

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `OPENAI_MODEL` | No | Default OpenAI model |
| `PINECONE_API_KEY` | No | Pinecone vector database key |
| `PINECONE_ENVIRONMENT` | No | Pinecone environment |

### Security & Authentication

| Variable | Required | Description | Production Value |
|----------|----------|-------------|------------------|
| `JWT_SECRET` | Yes | JWT signing key | 32+ char random string |
| `JWT_REFRESH_SECRET` | Yes | Refresh token key | Different from JWT_SECRET |
| `JWT_EXPIRES_IN` | No | Token expiration | `7d` or `1h` for production |
| `BCRYPT_ROUNDS` | No | Password hashing rounds | `12` for production |
| `SESSION_SECRET` | Yes | Session cookie secret | 32+ char random string |
| `MASTER_ENCRYPTION_KEY` | Yes | Data encryption key | 64+ char random string |
| `ADMIN_TOKEN` | Yes | Admin API access token | Secure random string |

### Rate Limiting

| Variable | Default | Production | Description |
|----------|---------|------------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | `50` | Max requests per window |
| `AUTH_RATE_LIMIT_MAX` | `10` | `5` | Auth requests per window |

### CORS & Network

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `CORS_ORIGIN` | `http://localhost:5173` | `https://yourdomain.com` | Allowed origins |
| `FRONTEND_URL` | `http://localhost:5173` | `https://yourdomain.com` | Frontend URL |

### Monitoring & Logging

| Variable | Required | Description |
|----------|----------|-------------|
| `LOG_LEVEL` | No | Logging level (`debug`, `info`, `warn`, `error`) |
| `SENTRY_DSN` | No | Sentry error tracking URL |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_REGISTRATION` | `true` | Allow user registration |
| `ENABLE_PASSWORD_RESET` | `true` | Enable password reset |
| `ENABLE_EMAIL_VERIFICATION` | `false` | Require email verification |

## 🌐 Frontend Environment Variables

### Core Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API URL | `https://api.yourdomain.com/api` |
| `VITE_WS_URL` | Yes | WebSocket URL | `wss://api.yourdomain.com` |

### Application Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_APP_NAME` | `"AI-TRPG Platform"` | Application name |
| `VITE_APP_VERSION` | `"1.0.0"` | Version number |
| `VITE_DEFAULT_THEME` | `"dark"` | Default UI theme |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENABLE_DEBUG_MODE` | `false` | Enable debug features (prod: false) |
| `VITE_ENABLE_ANALYTICS` | `false` | Enable analytics tracking |
| `VITE_MOCK_API` | `false` | Use mock API responses |

## 🚀 Production Environment Setup

### Render.com Setup

1. Go to your Render dashboard
2. Select your backend service
3. Navigate to "Environment"
4. Add the following variables:

```bash
NODE_ENV=production
DATABASE_URL=<your-database-url>
JWT_SECRET=<generated-secret>
OPENAI_API_KEY=<your-openai-key>
ANTHROPIC_API_KEY=<your-anthropic-key>
CORS_ORIGIN=https://your-frontend-domain.com
SENTRY_DSN=<your-sentry-dsn>
```

### Vercel Setup

1. Go to your Vercel dashboard
2. Select your frontend project
3. Navigate to "Settings" → "Environment Variables"
4. Add the following variables:

```bash
VITE_API_URL=https://your-backend-domain.onrender.com/api
VITE_WS_URL=wss://your-backend-domain.onrender.com
VITE_ENABLE_DEBUG_MODE=false
VITE_ENABLE_ANALYTICS=true
```

### Fly.io Setup

Create `fly.toml` with environment variables:

```toml
[env]
  NODE_ENV = "production"
  PORT = "3000"

[[services]]
  http_checks = []
  internal_port = 3000
  processes = ["app"]
  protocol = "tcp"
  script_checks = []
```

Set secrets via Fly CLI:

```bash
fly secrets set DATABASE_URL=postgresql://...
fly secrets set JWT_SECRET=your-secret
fly secrets set OPENAI_API_KEY=sk-...
```

## 🧪 Testing Environment

### Test Database Setup

```bash
# Test environment variables
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aitrpg_test
JWT_SECRET=test-jwt-secret
REDIS_URL=redis://localhost:6379/1
```

### CI/CD Environment

GitHub Actions secrets to set:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `RENDER_API_KEY`
- `RENDER_SERVICE_ID`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `SNYK_TOKEN`
- `SENTRY_DSN`

## 🔍 Environment Validation

### Backend Validation

The backend automatically validates required environment variables at startup:

```typescript
// Required variables check
const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY'
];

requiredVars.forEach(var => {
  if (!process.env[var]) {
    throw new Error(`Missing required environment variable: ${var}`);
  }
});
```

### Frontend Validation

Vite validates environment variables at build time. Variables without `VITE_` prefix are ignored.

## 🚨 Troubleshooting

### Common Issues

1. **"Missing environment variable" error**
   - Check that all required variables are set
   - Verify spelling and case sensitivity
   - Ensure `.env` file is in the correct directory

2. **Database connection failed**
   - Verify `DATABASE_URL` format
   - Check database server is running
   - Confirm network connectivity

3. **JWT token errors**
   - Ensure `JWT_SECRET` is set and consistent
   - Check token expiration settings
   - Verify secret length (32+ characters)

4. **CORS errors**
   - Check `CORS_ORIGIN` matches frontend domain
   - Verify protocol (http vs https)
   - Ensure no trailing slashes

### Health Check URLs

Use these endpoints to verify environment configuration:

- Backend health: `https://your-backend.com/api/health`
- Detailed health: `https://your-backend.com/api/health/detailed`
- Security health: `https://your-backend.com/api/health/security`

## 📚 Additional Resources

- [Node.js Environment Variables Best Practices](https://nodejs.dev/learn/how-to-read-environment-variables-from-nodejs)
- [Vite Environment Variables Guide](https://vitejs.dev/guide/env-and-mode.html)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)