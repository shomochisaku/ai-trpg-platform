#!/usr/bin/env node
/**
 * Configuration Validation Script
 * Validates Docker configurations, environment variables, and deployment readiness
 */

const fs = require('fs');
const path = require('path');

class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.projectRoot = path.resolve(__dirname, '..');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  error(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  warning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  success(message) {
    this.log(message, 'success');
  }

  fileExists(filePath) {
    const fullPath = path.join(this.projectRoot, filePath);
    return fs.existsSync(fullPath);
  }

  readFile(filePath) {
    try {
      const fullPath = path.join(this.projectRoot, filePath);
      return fs.readFileSync(fullPath, 'utf8');
    } catch (error) {
      return null;
    }
  }

  validateDockerfiles() {
    this.log('🐳 Validating Dockerfiles...');

    // Check backend Dockerfile
    if (this.fileExists('backend/Dockerfile')) {
      const dockerfileContent = this.readFile('backend/Dockerfile');
      
      // Check for multi-stage build
      if (dockerfileContent.includes('FROM') && dockerfileContent.includes('AS base')) {
        this.success('Backend Dockerfile uses multi-stage build');
      } else {
        this.warning('Backend Dockerfile should use multi-stage build for optimization');
      }

      // Check for security best practices
      if (dockerfileContent.includes('USER node')) {
        this.success('Backend Dockerfile uses non-root user');
      } else {
        this.error('Backend Dockerfile should use non-root user for security');
      }

      // Check for health check
      if (dockerfileContent.includes('HEALTHCHECK')) {
        this.success('Backend Dockerfile includes health check');
      } else {
        this.warning('Backend Dockerfile should include health check');
      }
    } else {
      this.error('Backend Dockerfile not found');
    }

    // Check frontend Dockerfile
    if (this.fileExists('frontend/Dockerfile')) {
      const dockerfileContent = this.readFile('frontend/Dockerfile');
      
      if (dockerfileContent.includes('nginx:alpine')) {
        this.success('Frontend Dockerfile uses nginx for production');
      } else {
        this.warning('Frontend Dockerfile should use nginx for production serving');
      }
    } else {
      this.error('Frontend Dockerfile not found');
    }
  }

  validateDockerCompose() {
    this.log('🔧 Validating Docker Compose configurations...');

    // Check development compose
    if (this.fileExists('docker-compose.yml')) {
      this.success('Development docker-compose.yml found');
    } else {
      this.error('Development docker-compose.yml not found');
    }

    // Check production compose
    if (this.fileExists('docker-compose.prod.yml')) {
      const composeContent = this.readFile('docker-compose.prod.yml');
      
      if (composeContent.includes('pgvector/pgvector')) {
        this.success('Production compose uses pgvector for vector database');
      } else {
        this.warning('Production compose should use pgvector for AI features');
      }

      if (composeContent.includes('restart: unless-stopped')) {
        this.success('Production compose has restart policies');
      } else {
        this.warning('Production compose should have restart policies');
      }
    } else {
      this.error('Production docker-compose.prod.yml not found');
    }
  }

  validateEnvironmentFiles() {
    this.log('🌍 Validating environment files...');

    // Check backend .env.example
    if (this.fileExists('backend/.env.example')) {
      const envContent = this.readFile('backend/.env.example');
      
      const requiredVars = [
        'DATABASE_URL',
        'JWT_SECRET',
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'NODE_ENV',
        'PORT'
      ];

      requiredVars.forEach(varName => {
        if (envContent.includes(varName)) {
          this.success(`Backend .env.example includes ${varName}`);
        } else {
          this.error(`Backend .env.example missing required variable: ${varName}`);
        }
      });
    } else {
      this.error('Backend .env.example not found');
    }

    // Check frontend .env.example
    if (this.fileExists('frontend/.env.example')) {
      const envContent = this.readFile('frontend/.env.example');
      
      const requiredVars = [
        'VITE_API_URL',
        'VITE_WS_URL'
      ];

      requiredVars.forEach(varName => {
        if (envContent.includes(varName)) {
          this.success(`Frontend .env.example includes ${varName}`);
        } else {
          this.error(`Frontend .env.example missing required variable: ${varName}`);
        }
      });
    } else {
      this.error('Frontend .env.example not found');
    }
  }

  validateWorkflows() {
    this.log('🔄 Validating CI/CD workflows...');

    const workflows = ['ci.yml', 'docker-build.yml', 'deploy.yml'];
    
    workflows.forEach(workflow => {
      if (this.fileExists(`workflows/${workflow}`)) {
        this.success(`Workflow ${workflow} found`);
      } else {
        this.warning(`Workflow ${workflow} not found (needs manual setup in .github/workflows/)`);
      }
    });
  }

  validatePackageFiles() {
    this.log('📦 Validating package.json files...');

    // Backend package.json
    if (this.fileExists('backend/package.json')) {
      const packageContent = JSON.parse(this.readFile('backend/package.json'));
      
      if (packageContent.scripts && packageContent.scripts.start) {
        this.success('Backend has start script');
      } else {
        this.error('Backend package.json missing start script');
      }

      if (packageContent.scripts && packageContent.scripts.build) {
        this.success('Backend has build script');
      } else {
        this.error('Backend package.json missing build script');
      }

      if (packageContent.engines && packageContent.engines.node) {
        this.success('Backend specifies Node.js version requirement');
      } else {
        this.warning('Backend should specify Node.js version in engines field');
      }
    } else {
      this.error('Backend package.json not found');
    }

    // Frontend package.json
    if (this.fileExists('frontend/package.json')) {
      const packageContent = JSON.parse(this.readFile('frontend/package.json'));
      
      if (packageContent.scripts && packageContent.scripts.build) {
        this.success('Frontend has build script');
      } else {
        this.error('Frontend package.json missing build script');
      }
    } else {
      this.error('Frontend package.json not found');
    }
  }

  validateDocumentation() {
    this.log('📚 Validating documentation...');

    const docs = [
      'docs/DEPLOYMENT.md',
      'docs/ENVIRONMENT_VARIABLES.md',
      'README.md'
    ];

    docs.forEach(doc => {
      if (this.fileExists(doc)) {
        this.success(`Documentation ${doc} found`);
      } else {
        this.warning(`Documentation ${doc} missing`);
      }
    });
  }

  generateReport() {
    this.log('\n📊 Validation Report Summary:');
    this.log(`✅ Validations passed: ${this.getTotalChecks() - this.errors.length - this.warnings.length}`);
    this.log(`⚠️  Warnings: ${this.warnings.length}`);
    this.log(`❌ Errors: ${this.errors.length}`);

    if (this.errors.length > 0) {
      this.log('\n🚨 Critical issues that need to be fixed:');
      this.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️  Recommended improvements:');
      this.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (this.errors.length === 0) {
      this.log('\n🎉 Configuration validation passed! Ready for deployment.');
      return true;
    } else {
      this.log('\n❌ Configuration validation failed. Please fix the errors above.');
      return false;
    }
  }

  getTotalChecks() {
    // Approximate number of validation checks
    return 20;
  }

  async run() {
    this.log('🔍 Starting AI-TRPG Platform configuration validation...\n');

    this.validateDockerfiles();
    this.validateDockerCompose();
    this.validateEnvironmentFiles();
    this.validateWorkflows();
    this.validatePackageFiles();
    this.validateDocumentation();

    return this.generateReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ConfigValidator();
  validator.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = ConfigValidator;