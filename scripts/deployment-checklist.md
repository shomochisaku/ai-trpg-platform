# 📋 Production Deployment Checklist

Complete this checklist before and after deployment to ensure everything is configured correctly.

## 🔧 Pre-Deployment Setup

### Prerequisites
- [ ] GitHub account with repository access
- [ ] Render.com account created
- [ ] Vercel.com account created
- [ ] Supabase.com account created
- [ ] Required API keys obtained:
  - [ ] OpenAI API key
  - [ ] Anthropic API key
  - [ ] Sentry DSN (optional)

### Environment Configuration
- [ ] **Backend .env variables configured**:
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL` (PostgreSQL connection string)
  - [ ] `JWT_SECRET` (32+ character secure random string)
  - [ ] `JWT_REFRESH_SECRET` (different from JWT_SECRET)
  - [ ] `OPENAI_API_KEY`
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `CORS_ORIGIN` (frontend URL)
  - [ ] `SENTRY_DSN` (if using error monitoring)

- [ ] **Frontend .env variables configured**:
  - [ ] `VITE_API_URL` (backend API URL)
  - [ ] `VITE_WS_URL` (backend WebSocket URL)
  - [ ] `VITE_ENABLE_DEBUG_MODE=false`

### Database Setup
- [ ] **Supabase/Neon.tech database created**
- [ ] **Required extensions enabled**:
  - [ ] `vector` extension
  - [ ] `uuid-ossp` extension
  - [ ] `pg_trgm` extension
- [ ] **Connection string tested**
- [ ] **Database migrations ready**

### Code Preparation
- [ ] All changes committed to main branch
- [ ] Code passes local tests
- [ ] Docker configurations validated
- [ ] Environment variables documented
- [ ] Sensitive data not committed to repository

## 🚀 Deployment Process

### Backend Deployment (Render)
- [ ] **Render service created**
- [ ] **Repository connected**
- [ ] **Build settings configured**:
  - [ ] Environment: Node
  - [ ] Build Command: `npm install && npm run build`
  - [ ] Start Command: `npm start`
  - [ ] Root Directory: `backend`
- [ ] **Environment variables set in Render dashboard**
- [ ] **First deployment completed successfully**
- [ ] **Health check endpoint accessible**: `/api/health`

### Frontend Deployment (Vercel)
- [ ] **Vercel project created**
- [ ] **Repository connected**
- [ ] **Build settings configured**:
  - [ ] Framework: Vite
  - [ ] Root Directory: `frontend`
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `dist`
- [ ] **Environment variables set in Vercel dashboard**
- [ ] **First deployment completed successfully**
- [ ] **Frontend accessible and loading**

### CI/CD Setup (Optional but Recommended)
- [ ] **GitHub Actions workflows moved to `.github/workflows/`**
- [ ] **GitHub Secrets configured**:
  - [ ] `RENDER_API_KEY`
  - [ ] `RENDER_SERVICE_ID`
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_ID`
  - [ ] `OPENAI_API_KEY`
  - [ ] `ANTHROPIC_API_KEY`
- [ ] **CI/CD pipeline tested with test deployment**

## ✅ Post-Deployment Verification

### Basic Functionality
- [ ] **Backend health check passes**: `GET /api/health`
- [ ] **Frontend loads without errors**
- [ ] **API connectivity verified**: Frontend can communicate with backend
- [ ] **WebSocket connection working**: Real-time features functional
- [ ] **Database connection stable**: No connection errors in logs

### Security Verification
- [ ] **HTTPS enabled on both frontend and backend**
- [ ] **CORS configured correctly**: No cross-origin errors
- [ ] **Security headers present**: Check with browser developer tools
- [ ] **Rate limiting active**: Test with multiple rapid requests
- [ ] **No sensitive data exposed**: Check network tab for leaked secrets

### Performance Testing
- [ ] **Page load times acceptable**: < 3 seconds initial load
- [ ] **API response times good**: < 500ms for basic endpoints
- [ ] **WebSocket latency reasonable**: < 200ms for real-time updates
- [ ] **Memory usage stable**: No memory leaks detected

### Monitoring Setup
- [ ] **Error monitoring configured**: Sentry capturing errors
- [ ] **Log aggregation working**: Can access application logs
- [ ] **Health check monitoring**: Uptime monitoring configured
- [ ] **Performance monitoring**: Response time tracking active

### User Acceptance Testing
- [ ] **User registration working** (if enabled)
- [ ] **Authentication flow complete**: Login/logout functional
- [ ] **Core game features working**: AI conversations, dice rolling, etc.
- [ ] **Campaign creation/management working**
- [ ] **Real-time chat functional**: WebSocket communication stable

## 🔍 Testing Checklist

### Automated Testing
- [ ] **CI pipeline passes**: All automated tests green
- [ ] **Security scans pass**: No critical vulnerabilities
- [ ] **Build process succeeds**: Both frontend and backend build without errors

### Manual Testing
- [ ] **Cross-browser testing**: Chrome, Firefox, Safari compatibility
- [ ] **Mobile responsiveness**: Works on mobile devices
- [ ] **Error handling**: Graceful error messages displayed
- [ ] **Edge cases**: Test with malformed inputs, network failures

### Load Testing (Optional)
- [ ] **Basic load test**: 10-50 concurrent users
- [ ] **Database performance**: Query performance under load
- [ ] **Memory usage under load**: No excessive memory consumption

## 🔧 Post-Deployment Configuration

### DNS & Domain (Optional)
- [ ] **Custom domain configured**: Point domain to Vercel/Render
- [ ] **SSL certificate installed**: HTTPS working with custom domain
- [ ] **CDN configured**: Static assets served efficiently

### Backup Strategy
- [ ] **Database backup scheduled**: Automatic daily backups enabled
- [ ] **Environment variables documented**: Secure documentation created
- [ ] **Recovery procedures documented**: How to restore from backup

### Maintenance Planning
- [ ] **Update schedule planned**: Regular dependency updates
- [ ] **Monitoring alerts configured**: Get notified of issues
- [ ] **Performance baselines established**: Know normal performance metrics

## 🚨 Troubleshooting Quick Checks

If something goes wrong, check these first:

### Backend Issues
- [ ] Check Render service logs
- [ ] Verify environment variables are set correctly
- [ ] Test database connection
- [ ] Check API endpoints with curl/Postman

### Frontend Issues
- [ ] Check Vercel function logs
- [ ] Verify VITE_ environment variables
- [ ] Check browser console for errors
- [ ] Test API connectivity from browser network tab

### Database Issues
- [ ] Check Supabase/Neon.tech dashboard
- [ ] Verify connection string format
- [ ] Check database extensions are installed
- [ ] Monitor query performance

### Network Issues
- [ ] Verify CORS settings
- [ ] Check firewall/security group settings
- [ ] Test WebSocket connections
- [ ] Validate SSL certificates

## 📞 Support Resources

- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Environment Variables Guide](./docs/ENVIRONMENT_VARIABLES.md)
- [Troubleshooting Section](./docs/DEPLOYMENT.md#troubleshooting)
- Render Support: https://render.com/docs
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support

---

**Completion Status**: ___/50 items completed

**Deployment Date**: _____________

**Deployed By**: _____________

**Production URLs**:
- Frontend: https://________________
- Backend: https://________________
- Database: ________________

**Notes**:
_________________________________
_________________________________
_________________________________