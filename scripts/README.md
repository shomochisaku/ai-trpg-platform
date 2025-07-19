# AI-TRPG Platform Development Scripts

このディレクトリには、開発効率化のためのスクリプトが含まれています。

## check-all-prs.sh

全てのPRブランチの健全性を一括チェックするスクリプトです。

### 機能

- 全PRブランチを自動検出
- 各ブランチでバックエンド・フロントエンドの基本チェック実行
- TypeScript型チェック、テスト、ビルドの確認
- 結果を集約してレポート生成
- 並列実行で高速化

### 使用方法

```bash
# 基本実行（全チェック）
./scripts/check-all-prs.sh

# バックエンドのみチェック
CHECK_FRONTEND=false ./scripts/check-all-prs.sh

# フロントエンドのみチェック
CHECK_BACKEND=false ./scripts/check-all-prs.sh

# 逐次実行（デバッグ用）
PARALLEL=false ./scripts/check-all-prs.sh

# カスタムレポートファイル
REPORT_FILE=my-report.txt ./scripts/check-all-prs.sh
```

### 環境変数

- `CHECK_BACKEND` (default: true): バックエンドチェックの有効/無効
- `CHECK_FRONTEND` (default: true): フロントエンドチェックの有効/無効
- `PARALLEL` (default: true): 並列実行の有効/無効
- `REPORT_FILE` (default: pr-check-report.txt): レポートファイル名

### 実行例

```bash
$ ./scripts/check-all-prs.sh

🚀 AI-TRPG Platform PR Health Check
==================================================
Current branch: main

📋 Detecting PR branches...
Found 4 PR branches:
  - claude/issue-23-20250718-1520
  - claude/issue-24-20250718-1519
  - claude/issue-25-20250718-1519
  - claude/issue-26-20250718-1519

🔍 Running health checks...
Running checks in parallel...

🔍 Checking branch: claude/issue-23-20250718-1520
  🔧 Backend checks...
    ✅ package.json syntax
    ✅ Dependencies install
    ✅ TypeScript types
    ✅ Core tests
    ✅ Build
  ✅ Branch claude/issue-23-20250718-1520: ALL CHECKS PASSED (5/5)

📊 SUMMARY REPORT
==================================================
Total branches checked: 4
Passed: 4
Failed: 0

🎉 All branches are healthy!
```

### 利点

1. **事前問題発見**: CIで失敗する前にローカルで問題を検出
2. **効率化**: 複数ブランチを並列で高速チェック
3. **統合レポート**: 全体状況を一目で把握
4. **長期化防止**: 問題の早期発見で修正時間を短縮

### 注意事項

- 初回実行時は各ブランチで依存関係のインストールが発生するため時間がかかります
- 大量のPRブランチがある場合は、並列実行数に注意してください
- `git worktree` を使用するため、一時的にディスク容量を消費します

### トラブルシューティング

**Q: スクリプトが途中で止まる**
A: `PARALLEL=false` で逐次実行して、どのブランチで問題が起きているか確認してください。

**Q: 依存関係のインストールが失敗する**
A: 個別のブランチに切り替えて手動で `npm install` を実行し、エラー内容を確認してください。

**Q: 権限エラーが発生する**
A: `chmod +x scripts/check-all-prs.sh` で実行権限を付与してください。