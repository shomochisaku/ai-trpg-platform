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
Mastra AI フレームワーク中心アプローチを採用：
1. **Mastra AI フレームワーク**: エージェント・ワークフロー・RAGシステムの統合管理
2. **段階的な実装**: 基盤→エージェント→ワークフロー→UI統合
3. **並列処理**: 独立したコンポーネントは同時進行で効率化

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
- **AI統合**: Mastra AI Framework
- **ORM**: Prisma
- **リアルタイム**: Socket.io
- **認証**: JWT

### AI統合
- **コアフレームワーク**: Mastra AI Framework
- **LLMプロバイダー**: OpenAI GPT-4、Claude 3.5 Sonnet
- **RAGシステム**: Mastra内蔵RAGシステム
- **メモリ管理**: Mastra内蔵メモリ機能

### データベース
- **本番**: PostgreSQL + pgvector（ベクトル検索）
- **開発**: SQLite
- **キャッシュ**: Redis（オプション）
- **ベクトルDB**: pgvector or Pinecone（RAGシステム用）

### インフラ
- **フロントエンド**: Vercel or Netlify
- **バックエンド**: Render or Fly.io
- **CI/CD**: GitHub Actions

## プロジェクト管理方針

### Issues中心+Tasks参照方式

効率的なプロジェクト管理のため、以下の方針を採用しています：

#### 管理構造

1. **Tasks.md（Read Only - 全体設計書）**
   - 全体設計書として維持
   - 実装の詳細要件を記載
   - 更新しない（参照のみ）
   - 244項目の実装タスクを体系的に整理

2. **GitHub Issues（Master - 実装管理）**
   - 実装管理の中心
   - 進捗管理（Open/Closed）
   - 実装者への具体的指示
   - @claudeコマンドによる自動実装

#### 実装フロー

1. **現状分析**
   - Tasks.mdの項目レビュー
   - コードベース分析
   - 完了/未完了の把握

2. **Issue作成**
   - タイトル：[Tasks項目番号] 機能名
   - 説明：Tasks該当項目を引用
   - 実装タスク：具体的なチェックリスト
   - 受け入れ基準：明確な完了条件

3. **進捗管理**
   - Milestoneでフェーズ管理
   - Labelで優先度・種類を分類
   - 並列実行可能な項目の特定

#### メリット

- **効率性**: 一元管理で更新コスト最小
- **透明性**: 全体像（Tasks）と実装状況（Issues）が両方見える
- **実装しやすさ**: Issueベースで Claude GitHub Actions が動作

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
- `milestone-1`: Mastra AI統合とコアエンジン基盤
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
Title: [Backend] Mastra AI フレームワーク導入

## 概要
Mastra AI フレームワークをバックエンドプロジェクトに導入し、基本的なGMエージェントを構築します。

## タスク
- [ ] Mastra AI フレームワークのインストール
- [ ] OpenAI/Claude APIキーの設定
- [ ] 基本的なエージェント作成・対話テスト
- [ ] ゲーム専用ツール（rollDice, updateStatusTags）の実装
- [ ] 統合テストの実行

## 受け入れ基準
- Mastra フレームワークが正常に動作する
- GMエージェントとの基本的な対話が可能
- ゲーム専用ツールが期待通り動作する
- 統合テストが全て通る

## ラベル
`milestone-1`, `backend`, `ai-integration`, `priority-high`

## 実装依頼
@claude このIssueの実装をお願いします。Mastra AI フレームワークの導入とGMエージェントの構築を行ってください。
```

### 3. @claudeコマンドでの実装依頼

GitHub Actions経由でClaudeに実装を依頼する際の形式：

```markdown
@claude [具体的な指示をここに記載]

例：
@claude このIssueに記載されているMastra AI フレームワークの導入を実装してください。GMエージェントと基本的なツールの実装もお願いします。

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

# AI Services (Mastra統合)
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Vector Database (RAGシステム用)
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="your-pinecone-environment"

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

### Mastra AI統合
- Mastra AI フレームワークの導入を最優先で実施
- OpenAI/Claude APIキーの設定を確実に行う
- 段階的な統合（エージェント→RAG→ワークフロー）

### 開発の進め方
1. まずGitHubレポジトリを作成
2. 上記のラベルを設定
3. tasks.mdに基づいてIssueを作成（優先度の高いものから）
4. 各IssueでClaudeに実装を依頼
5. PRがマージされたら次のIssueへ

### 並列処理可能なタスク
以下のタスクは同時に進行可能：
- RAGシステム実装
- メモリ管理システム実装
- データベース設計
- フロントエンド基盤構築

効率的に開発を進めるため、並列実行可能なタスクは同時にIssue化してください。

## トラブルシューティング

### よくある質問

**Q: Mastra AI フレームワークのドキュメントはどこにありますか？**
A: https://mastra.ai/en/docs で公式ドキュメントを確認できます。

**Q: どのタスクから始めるべきですか？**
A: まずMastra AI フレームワークの導入（タスク1.1）から始めてください。

**Q: 技術的な判断に迷った場合は？**
A: Claude Code CLIで相談してください。最適な選択肢を提案します。

## 更新履歴

- 2025-01-18: 初版作成
- 2025-01-18: Mastra AI フレームワーク採用に伴う大幅更新（Inworld AI→Mastra AI）
- 2025-01-18: プロジェクト管理方針（Issues中心+Tasks参照方式）を追加