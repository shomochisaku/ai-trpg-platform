# 🚀 Production Deployment Guide

Complete guide for deploying the AI-TRPG Platform to production environments.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Database Setup](#database-setup)
- [Backend Deployment (Render)](#backend-deployment-render)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [Alternative: Fly.io Deployment](#alternative-flyio-deployment)
- [Docker Deployment](#docker-deployment)
- [CI/CD Setup](#cicd-setup)
- [Post-Deployment](#post-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## 🌟 Overview

The AI-TRPG Platform deployment architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Vercel)      │───▶│   (Render)      │───▶│  (Supabase)     │
│   React + Vite  │    │ Node.js Express │    │  PostgreSQL     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │     Cache       │
                       │    (Redis)      │
                       └─────────────────┘
```

### Cost Estimates

| Service | Tier | Monthly Cost | Limits |
|---------|------|--------------|--------|
| Vercel | Hobby | $0 | 100GB bandwidth |
| Render | Starter | $7 | 512MB RAM, 0.1 CPU |
| Supabase | Free | $0 | 500MB database, 50MB storage |
| **Total** | | **$7/month** | Initial deployment |

## 🔧 Prerequisites

### Required Accounts

1. **GitHub**: Source code and CI/CD
2. **Render.com**: Backend hosting
3. **Vercel.com**: Frontend hosting  
4. **Supabase.com**: Database hosting
5. **Sentry.io**: Error monitoring (optional)

### Required API Keys

- OpenAI API key
- Anthropic API key
- Sentry DSN (optional)

### Development Tools

```bash
# Required tools
node --version  # v20+
npm --version   # v10+
git --version   # v2.0+
docker --version # v20+ (for local testing)
```

## 🗄️ Database Setup

### Option 1: Supabase (Recommended)

1. **Create Supabase Project**
   ```bash
   # Go to https://supabase.com
   # Click "New Project"
   # Project name: ai-trpg-platform
   # Region: Choose closest to your users
   ```

2. **Enable Required Extensions**
   ```sql
   -- Run in Supabase SQL Editor
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE EXTENSION IF NOT EXISTS btree_gin;
   ```

3. **Get Connection String**
   ```bash
   # From Supabase Dashboard > Settings > Database
   # Copy "Connection string" (URI format)
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### Option 2: Neon.tech

1. **Create Neon Project**
   ```bash
   # Go to https://neon.tech
   # Create new project: ai-trpg-platform
   # Region: Choose closest to your users
   ```

2. **Enable Vector Extension**
   ```sql
   -- In Neon Console SQL Editor
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **Get Connection String**
   ```bash
   # From Neon Dashboard
   postgresql://[user]:[password]@[host]/[database]?sslmode=require
   ```

## 🖥️ Backend Deployment (Render)

### Step 1: Prepare Repository

```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### Step 2: Create Render Service

1. **Go to Render Dashboard**
   - Visit https://render.com/dashboard
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Connect your GitHub account
   - Select `ai-trpg-platform` repository
   - Branch: `main`

3. **Configure Service**
   ```yaml
   Name: ai-trpg-platform-backend
   Environment: Node
   Region: Choose closest to users
   Branch: main
   Root Directory: backend
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

### Step 3: Set Environment Variables

In Render Dashboard > Environment:

```bash
# Core Configuration
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# AI Services
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Security
JWT_SECRET=your-secure-jwt-secret-32-chars-minimum
JWT_REFRESH_SECRET=different-refresh-secret-32-chars
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-32-chars
MASTER_ENCRYPTION_KEY=your-master-key-64-chars-minimum

# CORS
CORS_ORIGIN=https://your-frontend-domain.vercel.app
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Rate Limiting (Production)
RATE_LIMIT_MAX_REQUESTS=50
AUTH_RATE_LIMIT_MAX=5

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Security Headers
HSTS_MAX_AGE=31536000
```

### Step 4: Deploy

1. Click "Create Web Service"
2. Wait for initial deployment (5-10 minutes)
3. Check deployment logs for errors
4. Verify health endpoint: `https://your-app.onrender.com/api/health`

## 🌐 Frontend Deployment (Vercel)

### Step 1: Install Vercel CLI (Optional)

```bash
npm install -g vercel
vercel login
```

### Step 2: Deploy via Dashboard

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import Repository**
   - Connect GitHub account
   - Select `ai-trpg-platform` repository
   - Click "Import"

3. **Configure Project**
   ```yaml
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

### Step 3: Set Environment Variables

In Vercel Dashboard > Settings > Environment Variables:

```bash
# API Configuration
VITE_API_URL=https://your-backend.onrender.com/api
VITE_WS_URL=wss://your-backend.onrender.com

# Application
VITE_APP_NAME=AI-TRPG Platform
VITE_APP_VERSION=1.0.0

# Production Features
VITE_ENABLE_DEBUG_MODE=false
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true

# Optional Monitoring
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build and deployment (2-5 minutes)
3. Verify deployment at your Vercel URL
4. Test frontend-backend connectivity

## 🛩️ Alternative: Fly.io Deployment

### Backend on Fly.io

1. **Install Fly CLI**
   ```bash
   # macOS
   brew install flyctl
   
   # Linux/Windows
   curl -L https://fly.io/install.sh | sh
   ```

2. **Initialize Fly App**
   ```bash
   cd backend
   fly auth login
   fly launch --name ai-trpg-backend --region nrt
   ```

3. **Configure fly.toml**
   ```toml
   app = "ai-trpg-backend"
   primary_region = "nrt"

   [build]
     dockerfile = "Dockerfile"

   [env]
     NODE_ENV = "production"
     PORT = "3000"

   [[services]]
     internal_port = 3000
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0

     [[services.ports]]
       port = 80
       handlers = ["http"]
       force_https = true

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]

     [services.concurrency]
       type = "connections"
       hard_limit = 25
       soft_limit = 20

   [[services.http_checks]]
     interval = "30s"
     timeout = "10s"
     grace_period = "5s"
     method = "GET"
     path = "/api/health"
   ```

4. **Set Secrets**
   ```bash
   flyctl secrets set DATABASE_URL="postgresql://..."
   flyctl secrets set JWT_SECRET="your-jwt-secret"
   flyctl secrets set OPENAI_API_KEY="sk-..."
   flyctl secrets set ANTHROPIC_API_KEY="sk-ant-..."
   ```

5. **Deploy**
   ```bash
   flyctl deploy
   ```

## 🐳 Docker Deployment

### Local Testing

```bash
# Build and test locally
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Check services
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs

# Test endpoints
curl http://localhost:3000/api/health
curl http://localhost:80
```

### Production Docker Compose

1. **Prepare Environment**
   ```bash
   # Copy production environment file
   cp .env.example .env.production
   # Edit with production values
   nano .env.production
   ```

2. **Deploy with Docker Compose**
   ```bash
   # Deploy
   docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

   # Monitor
   docker-compose -f docker-compose.prod.yml logs -f

   # Scale services
   docker-compose -f docker-compose.prod.yml up -d --scale backend=2
   ```

## 🔄 CI/CD Setup

### GitHub Actions Setup

1. **Move Workflow Files**
   ```bash
   # Create .github/workflows directory
   mkdir -p .github/workflows
   
   # Move workflow files
   mv workflows/ci.yml .github/workflows/
   mv workflows/docker-build.yml .github/workflows/
   mv workflows/deploy.yml .github/workflows/
   ```

2. **Set GitHub Secrets**

   Go to GitHub Repository > Settings > Secrets and Variables > Actions:

   ```bash
   # Deployment
   RENDER_API_KEY=your-render-api-key
   RENDER_SERVICE_ID=your-render-service-id
   VERCEL_TOKEN=your-vercel-token
   VERCEL_ORG_ID=your-vercel-org-id
   VERCEL_PROJECT_ID=your-vercel-project-id

   # Optional: Fly.io
   FLY_API_TOKEN=your-fly-api-token

   # API Keys
   OPENAI_API_KEY=sk-your-openai-key
   ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

   # Security Scanning
   SNYK_TOKEN=your-snyk-token

   # Monitoring
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   ```

3. **Set Repository Variables**

   Go to GitHub Repository > Settings > Secrets and Variables > Actions > Variables:

   ```bash
   # URLs
   BACKEND_URL=https://your-backend.onrender.com
   FRONTEND_URL=https://your-frontend.vercel.app
   VITE_API_URL=https://your-backend.onrender.com/api
   VITE_WS_URL=wss://your-backend.onrender.com

   # Feature flags
   USE_FLY_IO=false
   ```

### Manual Deployment Trigger

```bash
# Trigger deployment manually
gh workflow run deploy.yml
```

## 🏁 Post-Deployment

### 1. Database Migration

```bash
# SSH into Render container or run locally with production DB
npx prisma migrate deploy
npx prisma db seed
```

### 2. Health Checks

```bash
# Backend health
curl https://your-backend.onrender.com/api/health
curl https://your-backend.onrender.com/api/health/detailed

# Frontend health
curl https://your-frontend.vercel.app

# WebSocket test (use browser developer tools)
const ws = new WebSocket('wss://your-backend.onrender.com');
ws.onopen = () => console.log('Connected');
```

### 3. Performance Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Basic load test
artillery quick --count 10 --num 5 https://your-backend.onrender.com/api/health
```

### 4. SSL Certificate Verification

```bash
# Check SSL certificate
openssl s_client -connect your-backend.onrender.com:443 -servername your-backend.onrender.com

# Check security headers
curl -I https://your-backend.onrender.com/api/health
```

## 📊 Monitoring & Maintenance

### Sentry Error Monitoring

1. **Create Sentry Project**
   - Go to https://sentry.io
   - Create new project: "AI-TRPG Platform"
   - Get DSN URL

2. **Configure Sentry**
   ```bash
   # Add to environment variables
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```

### Log Monitoring

```bash
# Render logs
render logs --service ai-trpg-platform-backend

# Vercel logs  
vercel logs your-frontend-domain.vercel.app

# Fly.io logs
flyctl logs
```

### Performance Monitoring

```bash
# Database performance
# In Supabase Dashboard > Reports

# Application metrics
# Visit your backend health endpoints:
https://your-backend.onrender.com/api/health/metrics
```

### Backup Strategy

1. **Database Backups**
   ```bash
   # Supabase: Automatic daily backups (free tier: 7 days)
   # Manual backup
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

2. **Application Backups**
   ```bash
   # Code: GitHub repository
   # Environment variables: Document securely
   # Deployment configs: Infrastructure as Code
   ```

### Update Procedures

1. **Regular Updates**
   ```bash
   # Dependencies update
   npm audit fix
   npm update

   # Security patches
   npm audit --audit-level high
   ```

2. **Deployment Updates**
   ```bash
   # Test locally first
   docker-compose -f docker-compose.prod.yml up

   # Deploy via CI/CD
   git push origin main

   # Or manual deployment
   render deploy --service your-service-id
   ```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Issues

**Problem**: "Error: connect ECONNREFUSED"

**Solutions**:
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
pg_isready -d $DATABASE_URL

# Verify Supabase IP allowlist (if using IP restrictions)
```

#### 2. CORS Errors

**Problem**: "Access to fetch at 'API_URL' from origin 'FRONTEND_URL' has been blocked by CORS policy"

**Solutions**:
```bash
# Check CORS_ORIGIN setting
# Ensure exact match including protocol (https vs http)
# No trailing slashes

# Backend environment
CORS_ORIGIN=https://your-frontend.vercel.app

# Frontend environment  
VITE_API_URL=https://your-backend.onrender.com/api
```

#### 3. JWT Token Issues

**Problem**: "JsonWebTokenError: invalid signature"

**Solutions**:
```bash
# Ensure JWT_SECRET is consistent across deployments
# Check secret length (32+ characters)
# Verify environment variable is set correctly
```

#### 4. WebSocket Connection Issues

**Problem**: WebSocket connection fails in production

**Solutions**:
```bash
# Check WebSocket URL protocol (wss vs ws)
VITE_WS_URL=wss://your-backend.onrender.com

# Verify reverse proxy WebSocket support
# Check firewall/load balancer settings
```

#### 5. Build Failures

**Problem**: Build fails during deployment

**Solutions**:
```bash
# Check Node.js version compatibility
# Verify package.json scripts
# Check for missing environment variables during build

# Local test
npm ci
npm run build
```

#### 6. Memory/Resource Issues

**Problem**: Application crashes due to memory limits

**Solutions**:
```bash
# Monitor memory usage
# Upgrade Render plan if needed
# Optimize database queries
# Implement proper caching
```

### Debug Commands

```bash
# Check environment variables
printenv | grep -E "(NODE_ENV|DATABASE_URL|JWT_SECRET)"

# Test database connection
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => console.log('DB Connected')).catch(console.error);"

# Test API endpoints
curl -v https://your-backend.onrender.com/api/health

# Check logs
tail -f /var/log/app.log
```

### Performance Optimization

1. **Database Optimization**
   ```sql
   -- Add database indexes
   CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
   CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
   
   -- Analyze query performance
   EXPLAIN ANALYZE SELECT * FROM campaigns WHERE user_id = $1;
   ```

2. **Application Optimization**
   ```bash
   # Enable production optimizations
   NODE_ENV=production
   
   # Use PM2 for production (if on VPS)
   npm install -g pm2
   pm2 start npm --name "ai-trpg" -- start
   ```

3. **Frontend Optimization**
   ```bash
   # Analyze bundle size
   npm run build
   npx vite-bundle-analyzer
   
   # Enable compression
   # Already configured in nginx.conf
   ```

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Fly.io Documentation](https://fly.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## 🆘 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review service logs (Render/Vercel/Fly.io dashboards)
3. Test locally with production environment
4. Check GitHub Issues for similar problems
5. Create new issue with detailed error logs

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: AI-TRPG Platform Team