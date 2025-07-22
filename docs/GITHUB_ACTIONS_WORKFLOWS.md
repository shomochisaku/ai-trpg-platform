# 🔄 GitHub Actions ワークフロー

本番デプロイメント用のGitHub Actionsワークフローファイルです。手動で`.github/workflows/`ディレクトリに配置してください。

## 📁 ファイル構成

```
.github/workflows/
├── deploy-backend.yml
└── deploy-frontend.yml
```

## 🚀 Backend デプロイワークフロー

### ファイル: `.github/workflows/deploy-backend.yml`

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'
  workflow_dispatch:

env:
  NODE_VERSION: '20'

jobs:
  test:
    name: Test Backend
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Generate Prisma client
        working-directory: ./backend
        run: npx prisma generate

      - name: Run database migrations
        working-directory: ./backend
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Run type check
        working-directory: ./backend
        run: npm run typecheck

      - name: Run linting
        working-directory: ./backend
        run: npm run lint

      - name: Run tests
        working-directory: ./backend
        run: npm test
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          JWT_SECRET: test-secret
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Build application
        working-directory: ./backend
        run: npm run build

  deploy-render:
    name: Deploy to Render
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v0.0.8
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}

  deploy-fly:
    name: Deploy to Fly.io (Alternative)
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' && false # Disabled by default
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Fly.io CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy to Fly.io
        working-directory: ./backend
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  notify:
    name: Notify Deployment Status
    runs-on: ubuntu-latest
    needs: [deploy-render]
    if: always()
    
    steps:
      - name: Notify Success
        if: needs.deploy-render.result == 'success'
        run: |
          echo "✅ Backend deployment successful!"
          # Add webhook notification here if needed
      
      - name: Notify Failure
        if: needs.deploy-render.result == 'failure'
        run: |
          echo "❌ Backend deployment failed!"
          # Add webhook notification here if needed
```

## 🎨 Frontend デプロイワークフロー

### ファイル: `.github/workflows/deploy-frontend.yml`

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'
  workflow_dispatch:

env:
  NODE_VERSION: '20'

jobs:
  test:
    name: Test Frontend
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run type check
        working-directory: ./frontend
        run: npm run type-check

      - name: Run linting
        working-directory: ./frontend
        run: npm run lint

      - name: Run tests
        working-directory: ./frontend
        run: npm run test:run

      - name: Build application
        working-directory: ./frontend
        run: npm run build
        env:
          VITE_API_URL: https://ai-trpg-api.render.com
          VITE_WS_URL: wss://ai-trpg-api.render.com
          VITE_NODE_ENV: production
          VITE_APP_NAME: "AI-TRPG Platform"
          VITE_APP_VERSION: ${{ github.sha }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: frontend-build
          path: frontend/dist
          retention-days: 7

  deploy-vercel:
    name: Deploy to Vercel
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Build application
        working-directory: ./frontend
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_WS_URL: ${{ secrets.VITE_WS_URL }}
          VITE_NODE_ENV: production
          VITE_APP_NAME: "AI-TRPG Platform"
          VITE_APP_VERSION: ${{ github.sha }}
          VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}

      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend

  deploy-netlify:
    name: Deploy to Netlify (Alternative)
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' && false # Disabled by default
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Build application
        working-directory: ./frontend
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_WS_URL: ${{ secrets.VITE_WS_URL }}
          VITE_NODE_ENV: production

      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2.0
        with:
          publish-dir: './frontend/dist'
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
          enable-pull-request-comment: false
          enable-commit-comment: true
          overwrites-pull-request-comment: true
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}

  notify:
    name: Notify Deployment Status
    runs-on: ubuntu-latest
    needs: [deploy-vercel]
    if: always()
    
    steps:
      - name: Notify Success
        if: needs.deploy-vercel.result == 'success'
        run: |
          echo "✅ Frontend deployment successful!"
          # Add webhook notification here if needed
      
      - name: Notify Failure
        if: needs.deploy-vercel.result == 'failure'
        run: |
          echo "❌ Frontend deployment failed!"
          # Add webhook notification here if needed
```

## 🔐 GitHub Secrets 設定

以下のSecretsをGitHub Repository Settings → Secrets and variables → Actions で設定してください：

### Backend用
```
RENDER_SERVICE_ID     # RenderのService ID
RENDER_API_KEY        # RenderのAPI Key
FLY_API_TOKEN         # Fly.io Token (代替プラットフォーム用)
```

### Frontend用
```
VERCEL_TOKEN          # VercelのToken
VERCEL_ORG_ID         # VercelのOrganization ID
VERCEL_PROJECT_ID     # VercelのProject ID
VITE_API_URL          # https://your-backend.render.com
VITE_WS_URL           # wss://your-backend.render.com
VITE_SENTRY_DSN       # Sentry DSN (監視用、オプション)
```

### 共通
```
OPENAI_API_KEY        # OpenAI APIキー
ANTHROPIC_API_KEY     # Anthropic APIキー
NETLIFY_AUTH_TOKEN    # Netlify Token (代替プラットフォーム用)
NETLIFY_SITE_ID       # Netlify Site ID (代替プラットフォーム用)
```

## 🚀 セットアップ手順

1. **ワークフローファイルを作成**:
   ```bash
   mkdir -p .github/workflows
   # 上記のYAMLファイルを.github/workflows/に配置
   ```

2. **GitHub Secretsを設定**:
   - Repository Settings → Secrets and variables → Actions
   - 上記リストのSecretsを追加

3. **デプロイサービスの設定**:
   - Render/Fly.ioでアプリケーションを作成
   - Vercel/Netlifyでプロジェクトをセットアップ

4. **ワークフローをテスト**:
   ```bash
   git add .github/workflows/
   git commit -m "Add GitHub Actions workflows"
   git push origin main
   ```

## 📊 ワークフロー機能

### 自動テスト
- TypeScriptタイプチェック
- ESLintによるコード品質チェック
- 自動テスト実行
- データベースマイグレーション

### 自動デプロイ
- mainブランチへのプッシュで自動トリガー
- テストが通過した場合のみデプロイ実行
- 複数プラットフォーム対応（Render/Fly.io, Vercel/Netlify）

### 通知機能
- デプロイ成功/失敗の通知
- Slack/Discordへの通知設定可能

## ⚠️ 注意事項

1. **Secrets管理**: APIキーなどの機密情報は必ずGitHub Secretsで管理
2. **ブランチ保護**: mainブランチにプロテクションルールを設定推奨
3. **モニタリング**: デプロイ後のヘルスチェックを確認
4. **ロールバック**: 問題発生時の迅速なロールバック手順を準備

---

これらのワークフローを使用することで、コードの品質を保ちながら安全で効率的な自動デプロイが可能になります。