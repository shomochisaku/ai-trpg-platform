# AI-TRPG Platform

次世代のAI駆動型TRPGプラットフォーム。プレイヤーが「物語の主人公」になる体験に完全に没入できる環境を提供します。

## 🚀 クイックスタート

### 📖 プロジェクト全体を理解したい方
**[📋 プロジェクト概要](docs/PROJECT_OVERVIEW.md)** - 全体像とドキュメント索引

### 💻 開発を始めたい方
1. **[🛠️ 開発ガイド](CLAUDE.md)** - 開発環境セットアップと基本方針
2. **[📋 実装計画](/.kiro/specs/ai-trpg-platform/tasks.md)** - 具体的なタスクリスト
3. **[🔄 開発ワークフロー](docs/development-workflow.md)** - Issue作成から実装完了まで

### 🏗️ 技術詳細を知りたい方
- **[📐 設計文書](/.kiro/specs/ai-trpg-platform/design.md)** - アーキテクチャと技術設計
- **[🔧 バックエンド](backend/README.md)** - API・データベース・AI統合
- **[🎨 フロントエンド](frontend/README.md)** - UI・状態管理・リアルタイム通信

## 🎯 プロジェクト概要

本プラットフォームは、従来のTRPGツールが要求する複雑な事前設定を排除し、プレイヤーが創造的なロールプレイそのものに集中できるシームレスな環境を提供します。

### 主な特徴

- 🎭 **自然言語での行動宣言**: ルールに縛られない自由な物語体験
- 🤖 **AI駆動のゲームマスター**: Mastra AI Framework による動的な物語生成
- 📊 **状態タグシステム**: 数値ではなく記述的なタグでキャラクター状態を管理
- 💾 **永続的なキャンペーン管理**: いつでも中断・再開可能な物語
- 🎮 **直感的なUI**: 物語への没入を妨げないシンプルなインターフェース

## 🏛️ 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **バックエンド**: Node.js + Express + TypeScript
- **AI統合**: Mastra AI Framework + OpenAI GPT-4 + Claude 3.5 Sonnet
- **データベース**: PostgreSQL + Prisma ORM + pgvector
- **リアルタイム通信**: Socket.io

## 📁 プロジェクト構造

```
ai-trpg-platform/
├── docs/                         # 📚 統合ドキュメント
│   ├── PROJECT_OVERVIEW.md       # 📋 プロジェクト全体概要・索引
│   └── development-workflow.md   # 🔄 開発ワークフロー
├── .kiro/specs/ai-trpg-platform/ # 🏗️ 設計仕様
│   ├── requirements.md           # 📋 要件定義
│   ├── design.md                # 📐 設計文書
│   └── tasks.md                 # ✅ 実装タスク
├── backend/                      # 🔧 バックエンドAPI
│   ├── README.md                # 🔧 バックエンド開発ガイド
│   ├── DATABASE.md              # 🗄️ データベース設計
│   ├── MASTRA_AI_INTEGRATION.md # 🤖 AI統合詳細
│   └── docs/RAG_SYSTEM.md       # 🔍 RAGシステム
├── frontend/                     # 🎨 フロントエンドUI
│   └── README.md                # 🎨 フロントエンド開発ガイド
├── scripts/                      # 🛠️ 開発支援スクリプト
│   └── README.md                # 🛠️ スクリプト使用ガイド
├── CLAUDE.md                     # 🤖 Claude向け開発ガイド
├── CI-STRATEGY.md               # 🚀 CI/CD戦略
└── README.md                     # 📖 このファイル
```

## 📊 開発状況

### 現在の進捗
- ✅ プロジェクト設計・仕様策定完了
- ✅ 技術スタック選定完了  
- ✅ 開発環境・CI/CD構築完了
- 🔄 Mastra AI統合実装中
- ⏳ MVP開発準備中

### 次のアクション
1. **Mastra AI フレームワーク導入** ([タスク1.1](/.kiro/specs/ai-trpg-platform/tasks.md))
2. **GMエージェント実装** ([タスク1.2](/.kiro/specs/ai-trpg-platform/tasks.md))
3. **ゲーム専用ツール実装** ([タスク1.3](/.kiro/specs/ai-trpg-platform/tasks.md))

## 🚀 開発環境セットアップ

### 前提条件
- Node.js 18+
- PostgreSQL 12+
- OpenAI/Anthropic API キー

### セットアップ手順

1. **リポジトリクローン**
   ```bash
   git clone [repository-url]
   cd ai-trpg-platform
   ```

2. **バックエンドセットアップ**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # .envファイルを編集してAPI keyを設定
   npm run db:setup
   npm run dev
   ```

3. **フロントエンドセットアップ**
   ```bash
   cd frontend
   npm install
   cp .env.local.example .env.local
   npm run dev
   ```

詳細は [🛠️ 開発ガイド](CLAUDE.md) を参照してください。

## 🤝 貢献方法

1. **[🔄 開発ワークフロー](docs/development-workflow.md)** に従ってIssue作成
2. **Conflict予防チェック** を実行
3. **@claudeコマンド** で実装依頼
4. **PR作成・レビュー・マージ**

## 📞 サポート

- **開発環境問題**: [バックエンドREADME](backend/README.md) / [フロントエンドREADME](frontend/README.md)
- **AI統合問題**: [Mastra AI統合ガイド](backend/MASTRA_AI_INTEGRATION.md)
- **ワークフロー問題**: [開発ワークフロー](docs/development-workflow.md)

## 📄 ライセンス

MIT License

## 🙏 謝辞

このプロジェクトはClaude AIアシスタントとの協働により開発されています。