# Issue#30: MVP Testing - Temporary Changes Summary

## 🎯 目的
最小限スキーマ（SQLite）でのMVP動作確認のため、複雑な機能を一時的に無効化

## ✅ 実行済み変更リスト

### 📁 ファイル移動・無効化
```
src/services/memory/ → src/services/memory.mvp-disabled/
src/services/ragService.ts → src/services/ragService.ts.mvp-disabled
src/routes/memory.ts → src/routes/memory.ts.mvp-disabled
src/routes/rag.ts → src/routes/rag.ts.mvp-disabled
```

### 📄 スキーマ変更
```
prisma/schema.prisma → prisma/schema.full.prisma (バックアップ)
prisma/schema.minimal.prisma → prisma/schema.prisma (使用中)
```

### ⚙️ 設定ファイル修正

#### `.env`
```diff
- DATABASE_URL="postgresql://user:password@localhost:5432/aitrpg"
+ DATABASE_URL="file:./dev.db"
```

#### `tsconfig.json`
```diff
  "exclude": [
    "node_modules",
    "dist",
    "tests",
+   "**/*.mvp-disabled",
+   "**/*.mvp-disabled/**/*"
  ]
```

### 🔧 コード修正

#### `src/index.ts`
```diff
- import memoryRoutes from '@/routes/memory';
- import { ragRoutes } from '@/routes/rag';
- import { memoryService } from '@/services/memory';
- import { ragService } from '@/services/ragService';
+ // MVP: 上記すべてコメントアウト

- app.use('/api/memory', memoryRoutes);
- app.use('/api/rag', ragRoutes);
+ // MVP: 上記すべてコメントアウト

- await ragService.initialize();
+ // MVP: 初期化処理コメントアウト
```

#### `src/services/campaignService.ts`
```diff
- import { ragService, SearchResult } from './ragService';
+ // MVP: import無効化 + SearchResult型定義追加

- setting: JSON.stringify(validated.settings),
+ aiSettings: JSON.stringify(validated.settings),

- await prisma.memoryEntry.deleteMany({
+ // MVP: memoryEntry削除処理コメントアウト

- isActive: true,
+ // MVP: isActiveフィールド削除

// 以下メソッドを簡素化:
- initializeCampaignKnowledge() // → 空実装
- buildGameActionContext() // → デフォルト値のみ
- storeActionResult() // → ログ出力のみ
- getCampaignStats() // → 固定値返却
```

#### `src/ai/workflows/types.ts`
```diff
- import { SessionStatus, MemoryType } from '@prisma/client';
+ // MVP: import削除

- sessionStatus: SessionStatus;
- type: MemoryType;
+ sessionStatus: string;
+ type: string;
```

#### `src/ai/workflows/gameWorkflow.ts`
```diff
- private determineSessionStatus(...): SessionStatus
+ private determineSessionStatus(...): string

- MemoryType.EVENT → 'EVENT'
- SessionStatus.ACTIVE → 'ACTIVE'
```

## 📊 解決したエラー
- **TypeScriptコンパイルエラー**: 50+ → 0
- **Prismaスキーマ不整合**: 解消
- **存在しないテーブル参照**: 全て無効化

## 🔄 復旧手順（フル機能復元時）

### 1. データベース復旧
```bash
# PostgreSQL起動
brew services start postgresql

# スキーマ復元
mv prisma/schema.prisma prisma/schema.minimal.prisma
mv prisma/schema.full.prisma prisma/schema.prisma

# .env修正
DATABASE_URL="postgresql://user:password@localhost:5432/aitrpg"

# マイグレーション
npx prisma migrate dev
```

### 2. サービス復旧
```bash
# ファイル復元
mv src/services/memory.mvp-disabled src/services/memory
mv src/services/ragService.ts.mvp-disabled src/services/ragService.ts
mv src/routes/memory.ts.mvp-disabled src/routes/memory.ts
mv src/routes/rag.ts.mvp-disabled src/routes/rag.ts
```

### 3. コード復旧
- `src/index.ts`: コメントアウト解除
- `src/services/campaignService.ts`: フル実装に戻す
- `tsconfig.json`: exclude設定削除

## 📝 注意事項
- MVP期間中は複雑なAI機能（RAG、メモリ管理）は動作しません
- Campaign作成・基本的なAI応答のみ動作確認対象
- 本格運用前に必ず復旧手順を実行してください

## 🗓️ 作成日時
2025-07-20 - Claude Code MVP Testing

---
**このファイルはMVP期間中の一時的な変更記録です。**