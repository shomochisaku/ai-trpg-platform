# AI-TRPG Platform 開発ガイド

## プロジェクト概要

このプロジェクトは、プレイヤーが「物語の主人公」になる体験に完全に没入できる、次世代のAI駆動型TRPGプラットフォームです。従来のツールが要求する複雑な事前設定を排除し、プレイヤーが創造的なロールプレイそのものに集中できるシームレスな環境を提供します。

### 開発者向け注意事項
- 開発者（プロジェクトオーナー）はノンプログラマーのため、Claudeが全ての実装を担当します
- 必要な手続きはStep by stepで指示を出してください
- 技術的な判断や実装方針の決定もClaudeが主導的に行います

## 開発方針

### 役割分担
1. **Claude Code CLI（ここ）**: 全体のオペレート管理
   - プロジェクト構造の設計
   - 開発フローの管理
   - Issue作成と優先順位付け
   - 技術的な意思決定

2. **Claude GitHub Actions**: Issue管理ベースの実装
   - 各Issueに対する具体的なコード実装
   - @claudeコマンドによる自動実装
   - PRの作成とレビュー

### 実装アプローチ
Inworld AI検証ファーストアプローチを採用：
1. まずInworld AIの利用可能性を1-2日以内に検証
2. 検証結果に基づいて実装パスを決定（1A or 1B）
3. 並列処理可能なタスクは同時進行で効率化

## 技術スタック

### フロントエンド
- **フレームワーク**: React + TypeScript
- **ビルドツール**: Vite
- **スタイリング**: Tailwind CSS
- **状態管理**: Zustand or Redux Toolkit
- **リアルタイム通信**: Socket.io-client

### バックエンド
- **ランタイム**: Node.js
- **フレームワーク**: Express + TypeScript
- **ORM**: Prisma
- **リアルタイム**: Socket.io
- **認証**: JWT

### AI統合
- **第一選択**: Inworld AI Node.js SDK（内蔵メモリ機能付き）
- **代替**: OpenAI GPT、Anthropic Claude

### データベース
- **本番**: PostgreSQL
- **開発**: SQLite
- **キャッシュ**: Redis（オプション）

### インフラ
- **フロントエンド**: Vercel or Netlify
- **バックエンド**: Render or Fly.io
- **CI/CD**: GitHub Actions

## 開発フロー

### 1. GitHubレポジトリ作成手順

開発者向けの手順：
```bash
# 1. GitHubにアクセス
# https://github.com/new

# 2. 以下の情報を入力
# - Repository name: ai-trpg-platform
# - Description: AI-driven TRPG platform for immersive storytelling
# - Public/Private: お好みで選択
# - Initialize with README: チェックを入れる
# - .gitignore: Node を選択
# - License: MIT を選択（推奨）

# 3. Create repository ボタンをクリック

# 4. ローカルにクローン
cd /Users/shou/Scripts
git clone https://github.com/[your-username]/ai-trpg-platform.git ai-trpg-platform-github
cd ai-trpg-platform-github

# 5. 現在のファイルをコピー
cp -r /Users/shou/Scripts/ai-trpg-platform/.kiro .
cp /Users/shou/Scripts/ai-trpg-platform/CLAUDE.md .

# 6. 初回コミット
git add .
git commit -m "Initial commit: Add project specifications and CLAUDE.md"
git push origin main
```

### 2. Issue作成戦略

#### ラベルの設定
まず以下のラベルをGitHubで作成してください：
- `milestone-1`: Inworld AI検証とコアエンジン基盤
- `milestone-2`: MVP開発
- `milestone-3`: 機能拡張と永続化
- `milestone-4`: ポリッシュとデプロイ
- `backend`: バックエンド関連
- `frontend`: フロントエンド関連
- `ai-integration`: AI統合関連
- `database`: データベース関連
- `priority-high`: 優先度高
- `priority-medium`: 優先度中
- `priority-low`: 優先度低

#### Issue作成例
```markdown
Title: [Backend] Inworld AI検証プロトタイプ作成

## 概要
Inworld AIの利用可能性を検証するためのプロトタイプを作成します。

## タスク
- [ ] Inworld Studioでアカウント作成とAPIキー取得
- [ ] Inworld Node.js SDK のインストール
- [ ] 基本的なキャラクター作成・対話テスト
- [ ] 内蔵メモリ機能の動作検証
- [ ] 判定システムの実現可能性確認

## 受け入れ基準
- Inworld AIとの基本的な対話が可能
- メモリ機能が期待通り動作する
- 判定システムが実装可能であることを確認

## ラベル
`milestone-1`, `backend`, `ai-integration`, `priority-high`

## 実装依頼
@claude このIssueの実装をお願いします。Inworld AIの検証プロトタイプを作成してください。
```

### 3. @claudeコマンドでの実装依頼

GitHub Actions経由でClaudeに実装を依頼する際の形式：

```markdown
@claude [具体的な指示をここに記載]

例：
@claude このIssueに記載されているバックエンドAPIの実装をお願いします。Express + TypeScriptで実装してください。

@claude フロントエンドのチャットログコンポーネントを実装してください。Reactで作成し、適切なスタイリングを適用してください。
```

## コマンドとテスト

### バックエンド
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト実行
npm test

# Lint実行
npm run lint

# 型チェック
npm run typecheck
```

### フロントエンド
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト実行
npm test

# Lint実行
npm run lint

# 型チェック
npm run type-check
```

## 環境変数

### バックエンド (.env)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/aitrpg"

# AI Services
INWORLD_API_KEY="your-inworld-api-key"
INWORLD_WORKSPACE_ID="your-workspace-id"
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Auth
JWT_SECRET="your-jwt-secret"

# Server
PORT=3000
NODE_ENV=development
```

### フロントエンド (.env.local)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## 重要な注意事項

### セキュリティ
- APIキーは絶対にコミットしない
- .envファイルは.gitignoreに含める
- フロントエンドにAPIキーを露出させない

### Inworld AI検証
- 最優先で実施（1-2日以内）
- 利用不可の場合は速やかに代替案（OpenAI/Claude）に切り替え
- 検証結果を必ずドキュメント化

### 開発の進め方
1. まずGitHubレポジトリを作成
2. 上記のラベルを設定
3. tasks.mdに基づいてIssueを作成（優先度の高いものから）
4. 各IssueでClaudeに実装を依頼
5. PRがマージされたら次のIssueへ

### 並列処理可能なタスク
以下のタスクは同時に進行可能：
- フロントエンド基盤構築
- バックエンド基盤構築  
- データベース設計

効率的に開発を進めるため、並列実行可能なタスクは同時にIssue化してください。

## トラブルシューティング

### よくある質問

**Q: Inworld AIのAPIキーはどこで取得できますか？**
A: https://studio.inworld.ai/ でアカウントを作成後、ダッシュボードから取得できます。

**Q: どのタスクから始めるべきですか？**
A: まずInworld AIの検証（タスク0.1）から始めてください。その結果によって後続のタスクが変わります。

**Q: 技術的な判断に迷った場合は？**
A: Claude Code CLIで相談してください。最適な選択肢を提案します。

## 更新履歴

- 2025-01-18: 初版作成