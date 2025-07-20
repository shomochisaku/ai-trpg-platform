# CI Strategy - Individual Developer Optimized

## 🎯 Overview

This project uses a multi-tiered CI strategy optimized for individual development, balancing speed and thoroughness.

## 🚀 CI Workflows

### 1. **Core CI** (`.github/workflows/ci.yml`)
- **Triggers**: Backend changes (`backend/**`)
- **Tests**: Database + Health tests only
- **Duration**: ~2-3 minutes
- **Purpose**: Fast feedback for core functionality

### 2. **Frontend CI** (`.github/workflows/frontend-ci.yml`)
- **Triggers**: Frontend changes (`frontend/**`)
- **Tests**: TypeScript, Lint, Build
- **Duration**: ~1-2 minutes
- **Purpose**: Frontend-specific validation

### 3. **Full Test Suite** (`.github/workflows/full-test.yml`)
- **Triggers**: Manual dispatch, Daily schedule
- **Tests**: Complete test suite including AI integration
- **Duration**: ~10-15 minutes
- **Purpose**: Comprehensive validation

## 🎮 Usage

### Default Behavior
- **PR/Push**: Runs core tests only
- **Fast feedback**: Essential functionality validated quickly
- **AI integration tests**: Excluded (in development)

### Full Test Execution
```bash
# Option 1: Commit message flag
git commit -m "feat: new feature [full-test]"

# Option 2: PR title flag
Create PR with title: "feat: new feature [full-test]"

# Option 3: Manual trigger
Go to Actions → Full Test Suite → Run workflow
```

## 🧪 Test Categories

### Core Tests (`npm run test:core`)
- ✅ `database.test.ts` - Database operations
- ✅ `health.test.ts` - Health checks
- **Status**: Stable, always passing

### AI Integration Tests (`npm run test:ai`)
- ⚠️ `memory.test.ts` - Memory management
- ⚠️ `ai/aiService.test.ts` - AI service integration
- ⚠️ `rag.test.ts` - RAG system
- **Status**: In development, may fail

### Available Test Commands
```bash
# Core tests (fast)
npm run test:core

# AI integration tests
npm run test:ai

# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 🎨 Benefits

### For Individual Development
- **Fast feedback**: Core functionality validated in 2-3 minutes
- **Focused testing**: Only test relevant changes
- **Gradual integration**: Add AI tests as features mature
- **Flexible control**: Choose test scope as needed

### For Team Development (Future)
- **Parallel workflows**: Frontend/Backend teams work independently
- **Comprehensive validation**: Full test suite for critical changes
- **Scheduled testing**: Daily full test runs catch integration issues

## 📊 CI Performance

| Workflow | Duration | Scope | Frequency |
|----------|----------|--------|-----------|
| Core CI | 2-3 min | Essential tests | Every PR/Push |
| Frontend CI | 1-2 min | Frontend validation | Frontend changes |
| Full Test | 10-15 min | Complete suite | Manual/Daily |

## 🔧 Configuration

### Environment Variables
```env
# Core Tests (Required)
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_db
JWT_SECRET=test-secret
NODE_ENV=test

# Full Tests (Optional - use GitHub Secrets)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=your-pinecone-env
```

### Path Filtering
- **Backend**: `backend/**` triggers backend CI
- **Frontend**: `frontend/**` triggers frontend CI
- **Workflows**: `.github/workflows/**` triggers relevant CI

## 🚨 Troubleshooting

### Core Tests Failing
- Check database connection
- Verify Prisma schema sync
- Review recent backend changes

### AI Tests Failing
- Expected during development
- Use `[full-test]` flag when AI integration is ready
- Check API key configuration for full tests

### Performance Issues
- Core tests should complete in 2-3 minutes
- If slower, review test efficiency
- Consider test parallelization

## 📈 Evolution Path

### Phase 1: Core Foundation (Current)
- ✅ Database operations stable
- ✅ Health checks working
- ✅ Fast CI feedback

### Phase 2: AI Integration (In Progress)
- 🔄 Memory management
- 🔄 AI service integration
- 🔄 RAG system

### Phase 3: Full Integration (Future)
- 🔜 All tests passing
- 🔜 Performance optimization
- 🔜 Advanced CI features

## 🤝 Contributing

When working on this project:

1. **Default workflow**: Let core tests run automatically
2. **AI features**: Test locally, use `[full-test]` when ready
3. **Frontend changes**: Frontend CI runs automatically
4. **Major changes**: Run full test suite before merging

This strategy ensures rapid development velocity while maintaining code quality and reliability.

## 🔄 Phase 1.5: PostgreSQL Migration Period

### Overview

During the transition from SQLite (MVP) to PostgreSQL (Production), the CI strategy supports both database environments to ensure smooth migration.

### Migration CI Configuration

#### Backend CI Updates
```yaml
# Dual Database Support
- SQLite: Default for quick local development
- PostgreSQL: Required for RAG/Vector features
```

#### Environment Detection
```javascript
// Auto-detect database based on features
const usePostgreSQL = process.env.ENABLE_VECTOR_SEARCH || 
                      process.env.DATABASE_URL?.includes('postgresql');
```

### Test Strategy During Migration

#### Core Tests (Modified)
- **SQLite Mode**: Basic CRUD operations (2-3 min)
- **PostgreSQL Mode**: Full features including vector (3-5 min)
- **Auto-switch**: Based on DATABASE_URL environment

#### New Test Categories
```bash
# PostgreSQL-specific tests
npm run test:pg      # PostgreSQL features only
npm run test:vector  # pgvector functionality
npm run test:migrate # Migration validation
```

### CI Workflow Updates

#### Pull Request CI
```yaml
strategy:
  matrix:
    database: [sqlite, postgresql]
```

#### Migration Validation
1. **Dual Testing**: Run tests on both databases
2. **Schema Sync**: Validate Prisma migrations
3. **Performance**: Compare query execution times

### Rollback Strategy

#### Local Development
- SQLite remains default for simplicity
- PostgreSQL opt-in via environment variable

#### CI Environment  
- Gradual PostgreSQL adoption
- Feature flags for database selection
- Parallel test execution

### Success Criteria

- [ ] All existing tests pass on PostgreSQL
- [ ] Vector search tests implemented
- [ ] CI duration remains under 5 minutes
- [ ] Zero regression in functionality
- [ ] Clear migration documentation

### Post-Migration Cleanup

Once PostgreSQL migration is complete:
1. Remove SQLite dependencies
2. Simplify CI configuration
3. Update documentation
4. Archive migration scripts

This phased approach ensures zero downtime and maintains development velocity during the critical database migration.