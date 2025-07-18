# AI-TRPG Platform

次世代のAI駆動型TRPGプラットフォーム。プレイヤーが「物語の主人公」になる体験に完全に没入できる環境を提供します。

## 概要

本プラットフォームは、従来のTRPGツールが要求する複雑な事前設定を排除し、プレイヤーが創造的なロールプレイそのものに集中できるシームレスな環境を提供します。

### 主な特徴

- 🎭 **自然言語での行動宣言**: ルールに縛られない自由な物語体験
- 🤖 **AI駆動のゲームマスター**: Inworld AI（または代替AI）による動的な物語生成
- 📊 **状態タグシステム**: 数値ではなく記述的なタグでキャラクター状態を管理
- 💾 **永続的なキャンペーン管理**: いつでも中断・再開可能な物語
- 🎮 **直感的なUI**: 物語への没入を妨げないシンプルなインターフェース

## 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **バックエンド**: Node.js + Express + TypeScript
- **AI統合**: Inworld AI / OpenAI GPT / Anthropic Claude
- **データベース**: PostgreSQL + Prisma ORM
- **リアルタイム通信**: Socket.io

## プロジェクト構造

```
ai-trpg-platform/
├── .kiro/
│   └── specs/
│       └── ai-trpg-platform/
│           ├── requirements.md    # 要件定義
│           ├── design.md         # 設計文書
│           └── tasks.md          # 実装タスク
├── frontend/                     # フロントエンドアプリケーション
├── backend/                      # バックエンドAPI
├── CLAUDE.md                     # Claude向け開発ガイド
└── README.md                     # このファイル
```

## 開発状況

現在、プロジェクトは初期段階にあります。詳細な実装計画は[tasks.md](.kiro/specs/ai-trpg-platform/tasks.md)を参照してください。

## ライセンス

MIT License

## 貢献

このプロジェクトはClaude AIアシスタントとの協働により開発されています。