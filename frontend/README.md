# AI TRPG Platform Frontend

> 📋 **関連ドキュメント**: [プロジェクト概要](../docs/PROJECT_OVERVIEW.md) | [設計文書](../.kiro/specs/ai-trpg-platform/design.md) | [開発ガイド](../CLAUDE.md)

React + TypeScript + Vite フロントエンドアプリケーション

## 開発

### 前提条件

- Node.js 18+
- npm または yarn

### セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

### 利用可能なコマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# ビルド結果のプレビュー
npm run preview

# Lint実行
npm run lint

# 型チェック
npm run type-check

# テスト実行
npm test

# テスト（UI付き）
npm run test:ui

# テスト（一回実行）
npm run test:run
```

### 技術スタック

- **React** 18 - UIフレームワーク
- **TypeScript** - 型安全性
- **Vite** - 高速な開発サーバー・ビルドツール
- **ESLint** - コード品質チェック
- **Vitest** - 高速テストランナー
- **@testing-library/react** - Reactコンポーネントテスト

### プロジェクト構造

```
src/
├── assets/        # 静的ファイル（画像、SVGなど）
├── components/    # 再利用可能なコンポーネント
├── pages/         # ページコンポーネント
├── hooks/         # カスタムフック
├── utils/         # ユーティリティ関数
├── types/         # TypeScript型定義
├── services/      # API呼び出し
└── test/          # テスト設定
```

### 環境変数

`.env.local` ファイルを作成して以下を設定：

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```