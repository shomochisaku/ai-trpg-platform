#!/bin/bash

# Setup GitHub Actions for AI-TRPG Platform
# This script helps set up CI/CD workflows and GitHub secrets

set -e

echo "🔧 AI-TRPG Platform - GitHub Actions Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]] && [[ ! -d "backend" ]] && [[ ! -d "frontend" ]]; then
    error "Please run this script from the project root directory"
    exit 1
fi

info "Setting up GitHub Actions workflows..."

# Create .github/workflows directory
mkdir -p .github/workflows

# Move workflow files
if [[ -f "workflows/ci.yml" ]]; then
    cp workflows/ci.yml .github/workflows/
    success "Copied CI workflow"
else
    warning "CI workflow not found in workflows directory"
fi

if [[ -f "workflows/docker-build.yml" ]]; then
    cp workflows/docker-build.yml .github/workflows/
    success "Copied Docker build workflow"
else
    warning "Docker build workflow not found in workflows directory"
fi

if [[ -f "workflows/deploy.yml" ]]; then
    cp workflows/deploy.yml .github/workflows/
    success "Copied deployment workflow"
else
    warning "Deployment workflow not found in workflows directory"
fi

# Check if GitHub CLI is available
if command -v gh &> /dev/null; then
    info "GitHub CLI detected. You can set secrets using the commands below."
    
    echo ""
    echo "📋 GitHub Secrets Setup Commands:"
    echo "=================================="
    echo ""
    echo "# Core API Keys"
    echo "gh secret set OPENAI_API_KEY"
    echo "gh secret set ANTHROPIC_API_KEY"
    echo ""
    echo "# Render.com deployment"
    echo "gh secret set RENDER_API_KEY"
    echo "gh secret set RENDER_SERVICE_ID"
    echo ""
    echo "# Vercel deployment"
    echo "gh secret set VERCEL_TOKEN"
    echo "gh secret set VERCEL_ORG_ID"
    echo "gh secret set VERCEL_PROJECT_ID"
    echo ""
    echo "# Optional: Fly.io deployment"
    echo "gh secret set FLY_API_TOKEN"
    echo ""
    echo "# Optional: Security scanning"
    echo "gh secret set SNYK_TOKEN"
    echo ""
    echo "# Optional: Error monitoring"
    echo "gh secret set SENTRY_DSN"
    echo ""
    
    echo "📋 GitHub Variables Setup Commands:"
    echo "==================================="
    echo ""
    echo "# Production URLs"
    echo "gh variable set BACKEND_URL --body \"https://your-backend.onrender.com\""
    echo "gh variable set FRONTEND_URL --body \"https://your-frontend.vercel.app\""
    echo "gh variable set VITE_API_URL --body \"https://your-backend.onrender.com/api\""
    echo "gh variable set VITE_WS_URL --body \"wss://your-backend.onrender.com\""
    echo ""
    echo "# Feature flags"
    echo "gh variable set USE_FLY_IO --body \"false\""
    echo ""
    
else
    warning "GitHub CLI not found. You'll need to set secrets manually in GitHub."
    echo ""
    echo "📋 Manual Setup Instructions:"
    echo "============================="
    echo ""
    echo "1. Go to: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\\([^.]*\\).*/\\1/')/settings/secrets/actions"
    echo ""
    echo "2. Add the following secrets:"
    echo "   - OPENAI_API_KEY"
    echo "   - ANTHROPIC_API_KEY"
    echo "   - RENDER_API_KEY"
    echo "   - RENDER_SERVICE_ID"
    echo "   - VERCEL_TOKEN"
    echo "   - VERCEL_ORG_ID"
    echo "   - VERCEL_PROJECT_ID"
    echo ""
    echo "3. Go to Variables tab and add:"
    echo "   - BACKEND_URL"
    echo "   - FRONTEND_URL"
    echo "   - VITE_API_URL"
    echo "   - VITE_WS_URL"
fi

# Check if workflows were copied successfully
if [[ -f ".github/workflows/ci.yml" ]] && [[ -f ".github/workflows/docker-build.yml" ]] && [[ -f ".github/workflows/deploy.yml" ]]; then
    success "All workflows copied successfully!"
    
    info "Next steps:"
    echo "1. Set up GitHub secrets (see commands above)"
    echo "2. Configure your deployment services (Render, Vercel)"
    echo "3. Push changes to trigger first CI run"
    echo "4. Monitor workflow runs in GitHub Actions tab"
    
else
    error "Some workflows were not copied. Please check the workflows directory."
    exit 1
fi

# Create workflow validation script
cat > .github/validate-workflows.js << 'EOF'
#!/usr/bin/env node
/**
 * Validate GitHub Actions workflows syntax
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const workflowsDir = path.join(__dirname, 'workflows');
const workflows = ['ci.yml', 'docker-build.yml', 'deploy.yml'];

console.log('🔍 Validating GitHub Actions workflows...\n');

let valid = true;

workflows.forEach(workflow => {
    const workflowPath = path.join(workflowsDir, workflow);
    
    if (!fs.existsSync(workflowPath)) {
        console.error(`❌ ${workflow} not found`);
        valid = false;
        return;
    }
    
    try {
        const content = fs.readFileSync(workflowPath, 'utf8');
        yaml.load(content);
        console.log(`✅ ${workflow} syntax is valid`);
    } catch (error) {
        console.error(`❌ ${workflow} has syntax errors:`);
        console.error(`   ${error.message}`);
        valid = false;
    }
});

if (valid) {
    console.log('\n🎉 All workflows are valid!');
    process.exit(0);
} else {
    console.log('\n❌ Some workflows have errors. Please fix them before committing.');
    process.exit(1);
}
EOF

chmod +x .github/validate-workflows.js

info "Created workflow validation script at .github/validate-workflows.js"

echo ""
success "GitHub Actions setup completed!"
echo ""
warning "Don't forget to:"
echo "1. Set up your deployment services first (Render, Vercel)"
echo "2. Configure GitHub secrets before pushing"
echo "3. Test deployments with a small change first"