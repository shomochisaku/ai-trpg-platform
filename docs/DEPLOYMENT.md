# 本番環境デプロイガイド

## 📋 概要

このガイドでは、AI-TRPGプラットフォームを本番環境にデプロイする手順を説明します。

### デプロイ構成
- **フロントエンド**: Vercel
- **バックエンド**: Render (代替: Fly.io)
- **データベース**: Supabase/Neon.tech (PostgreSQL + pgvector)

## 🚀 デプロイ手順

### 1. データベースセットアップ

#### Supabaseを使用する場合

1. [Supabase](https://supabase.com/)にアカウント作成
2. 新しいプロジェクト作成
3. SQL Editorで以下を実行:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Check if pgvector is available
SELECT * FROM pg_available_extensions WHERE name = 'vector';
```

4. Settings → Database から接続文字列を取得

#### Neon.techを使用する場合

1. [Neon.tech](https://neon.tech/)にアカウント作成
2. 新しいプロジェクト作成
3. pgvector拡張を有効化:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

4. Connection stringを取得

### 2. バックエンドデプロイ (Render)

#### 事前準備

1. [Render](https://render.com/)にアカウント作成
2. GitHubレポジトリを連携

#### デプロイ設定

1. New → Web Service を選択
2. レポジトリを選択
3. 以下の設定を入力:

```yaml
Name: ai-trpg-backend
Environment: Node
Region: Oregon (Tokyo regionが利用可能なら推奨)
Branch: main
Build Command: cd backend && npm install && npm run build
Start Command: cd backend && npm start
```

#### 環境変数設定

Render Dashboard → Environment で以下を設定:

```env
NODE_ENV=production
DATABASE_URL=[Supabase/Neonの接続文字列]
FRONTEND_URL=https://[your-frontend-url].vercel.app
ALLOWED_ORIGINS=https://[your-frontend-url].vercel.app
JWT_SECRET=[ランダムな長い文字列]
OPENAI_API_KEY=[OpenAI APIキー]
ANTHROPIC_API_KEY=[Anthropic APIキー]
CORS_CREDENTIALS=true
TRUST_PROXY=1
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
SENTRY_DSN=[Sentryの場合]
SENTRY_ENVIRONMENT=production
```

### 3. フロントエンドデプロイ (Vercel)

#### 事前準備

1. [Vercel](https://vercel.com/)にアカウント作成
2. GitHubアカウントを連携

#### デプロイ設定

1. New Project → Import Git Repository
2. レポジトリを選択
3. 設定:

```
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

#### 環境変数設定

Vercel Dashboard → Settings → Environment Variables:

```env
VITE_API_URL=https://[your-backend-url].render.com
VITE_WS_URL=wss://[your-backend-url].render.com
VITE_NODE_ENV=production
VITE_APP_NAME=AI-TRPG Platform
VITE_SENTRY_DSN=[Sentryの場合]
```

### 4. CI/CDパイプライン設定

#### GitHub Secrets設定

Repository Settings → Secrets and variables → Actions:

**Backend用:**
```
RENDER_SERVICE_ID=[RenderのService ID]
RENDER_API_KEY=[RenderのAPI Key]
```

**Frontend用:**
```
VERCEL_TOKEN=[VercelのToken]
VERCEL_ORG_ID=[VercelのOrg ID]
VERCEL_PROJECT_ID=[VercelのProject ID]
VITE_API_URL=https://[your-backend-url].render.com
VITE_WS_URL=wss://[your-backend-url].render.com
```

**共通:**
```
OPENAI_API_KEY=[OpenAI APIキー]
ANTHROPIC_API_KEY=[Anthropic APIキー]
```

#### 自動デプロイ有効化

GitHub Actionsワークフローが既に設定済みです：
- `.github/workflows/deploy-backend.yml`
- `.github/workflows/deploy-frontend.yml`

mainブランチにプッシュすると自動的にデプロイされます。

## 🔧 代替デプロイオプション

### Fly.io (Backend代替)

```bash
# Fly.ioのセットアップ
fly auth login
cd backend
fly launch
```

環境変数設定:
```bash
fly secrets set NODE_ENV=production
fly secrets set DATABASE_URL="[接続文字列]"
fly secrets set JWT_SECRET="[ランダム文字列]"
# 他の環境変数も同様に設定
```

### Netlify (Frontend代替)

1. [Netlify](https://netlify.com/)にレポジトリ連携
2. Build settings:
   - Build command: `cd frontend && npm run build`
   - Publish directory: `frontend/dist`
3. 環境変数を設定

## 📊 監視・ログ設定

### Sentry設定 (推奨)

1. [Sentry](https://sentry.io/)でプロジェクト作成
2. DSNを取得
3. 環境変数に設定:
   - Backend: `SENTRY_DSN`
   - Frontend: `VITE_SENTRY_DSN`

### ヘルスチェック

バックエンドには以下のエンドポイントが用意されています：
- `/api/health` - 総合ヘルスチェック
- `/api/health/ready` - Readiness probe
- `/api/health/live` - Liveness probe

## 🔒 セキュリティチェックリスト

- [ ] 全ての環境変数が正しく設定されている
- [ ] APIキーが安全に保管されている
- [ ] HTTPS接続が強制されている
- [ ] CORS設定が適切に構成されている
- [ ] Rate limitingが有効になっている
- [ ] セキュリティヘッダーが設定されている
- [ ] データベース接続がSSLで保護されている

## 💰 コスト見積もり

### 初期段階 (月額)
- **Supabase**: Free tier (500MB)
- **Render**: Starter ($7)
- **Vercel**: Hobby (無料)
- **合計**: 約 $7/月

### 成長段階 (月額)
- **Supabase**: Pro ($25) or Neon.tech Scale ($69)
- **Render**: Standard ($25-$85)
- **Vercel**: Pro ($20)
- **合計**: 約 $70-$130/月

## 🐛 トラブルシューティング

### よくある問題

**1. データベース接続エラー**
```
Error: Connection refused
```
- 接続文字列が正しいか確認
- ファイアウォール設定を確認
- SSL設定を確認 (`?sslmode=require`)

**2. CORS エラー**
```
Access-Control-Allow-Origin header
```
- `FRONTEND_URL`と`ALLOWED_ORIGINS`が正しく設定されているか確認
- プロダクション URLが正確に指定されているか確認

**3. WebSocket接続エラー**
```
WebSocket connection failed
```
- `VITE_WS_URL`が正しく設定されているか確認
- HTTPSサイトからWSS接続を使用しているか確認

### ログ確認方法

**Render:**
```bash
# Renderのログを確認
render logs -s [service-id]
```

**Vercel:**
```bash
# Vercelのログを確認
vercel logs [deployment-url]
```

## 📚 関連ドキュメント

- [プロジェクト概要](./PROJECT_OVERVIEW.md)
- [開発ワークフロー](./development-workflow.md)
- [バックエンド README](../backend/README.md)
- [フロントエンド README](../frontend/README.md)

## 🆘 サポート

デプロイで問題が発生した場合：

1. まず[トラブルシューティング](#-トラブルシューティング)を確認
2. ログを確認して具体的なエラーメッセージを特定
3. 必要に応じてIssueを作成

---

**⚠️ 注意:** 本番環境では必ず強力なパスワードとAPIキーを使用し、定期的にローテーションしてください。