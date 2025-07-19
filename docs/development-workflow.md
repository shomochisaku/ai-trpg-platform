# AI-TRPG Platform 開発ワークフロー完全ガイド

## 概要

このドキュメントは、AI-TRPG Platformプロジェクトでのissue作成から実装完了までの標準ワークフローを定義します。conflict予防を重視した効率的な並列開発手法を提供します。

## 🎯 ワークフローの目的

1. **Conflict予防**: 並列実装時のファイル競合を事前に回避
2. **効率性**: 依存関係を考慮した最適な実装順序
3. **品質**: 段階的検証による高品質な実装
4. **透明性**: 全体進捗の可視化と共有

## 📋 ワークフロー全体像

```
現状分析 → 実装対象選定 → Conflict予防 → Issue作成 → 実装 → 検証 → マージ
    ↓         ↓            ↓         ↓        ↓      ↓      ↓
Dashboard  → 並列安全性   → ファイル   → GitHub → @claude → CI → Review
分析        分析         conflict   Issue   実装   Tests  
                        チェック    作成
```

## 🔍 Phase 1: 現状分析フェーズ

### 1.1 全体状況の把握

```bash
# プロジェクト全体ダッシュボードで現状把握
./scripts/project-status-dashboard.sh --detailed --recommend-next
```

**確認項目:**
- [ ] Tasks.md進捗率
- [ ] Open/Closed Issues状況
- [ ] Open PRs状況とMergeable状態
- [ ] 最近の開発アクティビティ
- [ ] Milestone進捗

**分析観点:**
- どのマイルストーンが進行中か
- 何が実装完了しているか
- 何がブロッキングファクターになっているか

### 1.2 依存関係の確認

```bash
# Tasks.mdと現実の実装状況の照合
grep -A 5 -B 5 "要件:" .kiro/specs/ai-trpg-platform/tasks.md
```

**依存関係マッピング:**
- **基盤レイヤー**: Mastra AI, Database Schema, State Management
- **サービスレイヤー**: API Services, Business Logic
- **UIレイヤー**: Components, Pages, Integration

## 🎯 Phase 2: 実装対象選定フェーズ

### 2.1 並列安全性分析

```bash
# 安全な並列実行可能Issueの特定
./scripts/select-parallel-safe-issues.sh --recommend --max-parallel 3 --focus frontend
```

**選定基準:**
1. **依存関係チェック**: 前提条件が満たされているか
2. **優先度評価**: Milestone、Priority labelの確認
3. **実装可能性**: 現在のコードベース状況との整合性
4. **リソース考慮**: 実装者のキャパシティと専門性

### 2.2 実装領域の決定

**推奨実装パターン:**

#### A. 基盤優先パターン
```
1. State Management System
2. API Service Layer  
3. UI Components (並列)
4. Integration & Testing
```

#### B. 機能単位パターン
```
1. Backend API Group (並列)
2. Frontend Service Group (並列)
3. UI Component Group (並列)
4. Testing Group (並列)
```

#### C. リスク分散パターン
```
1. High-impact Issues (sequential)
2. Medium-impact Issues (limited parallel)
3. Low-impact Issues (full parallel)
```

## 🛡️ Phase 3: Conflict予防フェーズ

### 3.1 ファイル影響範囲分析

```bash
# 具体的なファイル変更のconflictチェック
./scripts/check-issue-conflicts.sh --files "frontend/src/App.tsx,backend/package.json" --existing-prs --analyze-deps
```

**チェック項目:**
- [ ] 既存Open PRsとのファイル重複
- [ ] High-impact files (App.tsx, package.json, config files)
- [ ] 関連ファイルの影響範囲
- [ ] Type definitions の競合可能性

### 3.2 リスク評価とミティゲーション

**リスクレベル判定:**

| レベル | 条件 | 対応 |
|--------|------|------|
| 🟢 **Safe** | ファイル重複なし、依存関係クリア | 並列実行OK |
| 🟡 **Caution** | 関連ファイル重複、軽微な依存関係 | 監視しながら実行 |
| 🔴 **Danger** | 直接ファイル競合、重要な依存関係 | 実行停止、順序調整 |

**ミティゲーション戦略:**
1. **ファイル分離**: 異なるディレクトリでの作業
2. **時間分離**: 段階的実装でタイミングをずらす
3. **機能分離**: 独立性の高い機能に分解
4. **チーム分離**: 担当領域を明確に分割

## 📝 Phase 4: Issue作成フェーズ

### 4.1 Issue設計

**Issueテンプレート:**
```markdown
## タイトル
[Area] [TaskID] 機能名

## 概要
Tasks.mdの該当項目から引用

## 実装タスク
- [ ] 具体的なタスク1
- [ ] 具体的なタスク2
- [ ] テスト実装
- [ ] ドキュメント更新

## 受け入れ基準
- 明確な完了条件
- テスト通過条件
- 品質基準

## 影響範囲
- 変更予定ファイル一覧
- 依存関係の明記
- Conflict可能性の記載

## ラベル
milestone-X, area-name, priority-level
```

### 4.2 並列Issue群の作成

**作成手順:**
1. **基準Issue作成**: 最も重要/影響の大きいIssue
2. **関連Issue作成**: 並列実行可能なIssue群
3. **依存関係設定**: GitHub Issue linkingで関係性を明記
4. **実装順序計画**: 推奨実装順序をコメントで記載

## 🚀 Phase 5: 実装フェーズ

### 5.1 実装開始手順

```bash
# 実装前最終チェック
./scripts/check-issue-conflicts.sh --files "[予定ファイル]" --existing-prs --simulate

# 問題なければIssueに実装指示
# @claude このIssueの実装をお願いします
```

### 5.2 実装中の監視

**監視コマンド:**
```bash
# 定期的なPR状況確認
gh pr list --state open --json number,title,mergeable

# 全PRの健全性チェック
./scripts/check-all-prs.sh

# プロジェクト状況の更新確認
./scripts/project-status-dashboard.sh --recommend-next
```

**監視頻度:**
- **Real-time**: GitHub notifications
- **Daily**: PR status check
- **Weekly**: プロジェクト全体レビュー

### 5.3 問題発生時の対応

**Conflict発生時:**
1. **即座停止**: 新しい並列Issueの作成を停止
2. **原因分析**: conflictの根本原因を特定
3. **解決策実行**: rebase, merge, 順序変更等
4. **予防策更新**: ツールやプロセスの改善

**CI失敗時:**
1. **影響範囲確認**: 他のPRへの影響を評価
2. **緊急度判定**: ブロッキング度合いの評価
3. **修正実行**: 迅速な修正とテスト
4. **再発防止**: CI設定やテストの改善

## ✅ Phase 6: 検証フェーズ

### 6.1 実装品質チェック

```bash
# PR作成時の自動チェック
./scripts/check-all-prs.sh --branch [PR-branch]

# 手動品質確認
npm run lint && npm run typecheck && npm test
```

**チェック項目:**
- [ ] TypeScript型チェック通過
- [ ] Lint rules通過
- [ ] Unit tests通過
- [ ] Integration tests通過
- [ ] Build成功

### 6.2 Integration確認

**確認観点:**
- 他のPRとの整合性
- Mainブランチとの互換性
- API契約の維持
- UIコンポーネントの連携

## 🔄 Phase 7: マージフェーズ

### 7.1 マージ準備

**事前チェック:**
- [ ] All checks passing
- [ ] Conflicts resolved
- [ ] Review approved
- [ ] Documentation updated

**マージ戦略:**
- **Squash merge**: 機能単位でのクリーンな履歴
- **Merge commit**: 複雑な機能の履歴保持
- **Rebase**: 線形履歴の維持

### 7.2 マージ後処理

```bash
# マージ後のクリーンアップ
git fetch origin
git checkout main
git pull origin main

# 関連ブランチの削除
git branch -d [merged-branch]
git push origin --delete [merged-branch]

# 次のフェーズ準備
./scripts/project-status-dashboard.sh --recommend-next
```

## 📊 継続的改善

### メトリクス収集

**効率性指標:**
- Issue作成からマージまでの平均時間
- Conflict発生率
- CI失敗率
- 並列実行成功率

**品質指標:**
- Code review iteration回数
- Post-merge bug発生率
- Technical debt積み残し

### プロセス改善

**定期レビュー:**
- **Weekly**: ワークフロー効率性レビュー
- **Monthly**: ツール改善とアップデート
- **Quarterly**: 戦略的プロセス見直し

**改善アクション:**
- ツールの機能拡張
- チェックリストの更新
- ドキュメントの改善
- 自動化の拡張

## 🛠️ ツールリファレンス

### 主要コマンド一覧

```bash
# 1. 全体状況確認
./scripts/project-status-dashboard.sh [--detailed] [--recommend-next]

# 2. 並列実行計画
./scripts/select-parallel-safe-issues.sh [--recommend] [--max-parallel N] [--focus AREA]

# 3. Conflict予防
./scripts/check-issue-conflicts.sh --files "path1,path2" [--existing-prs] [--analyze-deps]

# 4. 健全性チェック
./scripts/check-all-prs.sh [CHECK_FRONTEND=true] [CHECK_BACKEND=true]

# 5. GitHub CLI操作
gh issue list --state all
gh pr list --state open --json number,title,mergeable
gh pr create --title "Title" --body "Description"
```

### トラブルシューティング

**よくある問題と解決策:**

| 問題 | 原因 | 解決策 |
|------|------|--------|
| ツール実行エラー | 実行権限なし | `chmod +x scripts/*.sh` |
| GitHub CLI エラー | 認証問題 | `gh auth login` |
| Package conflicts | 依存関係の不整合 | `npm install` で再同期 |
| Git conflicts | 並列作業の競合 | rebase戦略で解決 |

## 📚 参考資料

- [CLAUDE.md - Conflict予防ガイドライン](../CLAUDE.md#conflict予防ガイドライン)
- [Tasks.md - 実装計画](../.kiro/specs/ai-trpg-platform/tasks.md)
- [GitHub Flow Documentation](https://docs.github.com/en/get-started/quickstart/github-flow)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

このワークフローにより、効率的で安全な並列開発が実現できます。定期的にプロセスを見直し、チームの成長と共に最適化していきましょう。