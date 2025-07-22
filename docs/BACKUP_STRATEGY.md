# 📋 バックアップ戦略

AI-TRPGプラットフォームの本番環境における包括的なバックアップ・復旧戦略です。

## 🎯 バックアップ目標

### RTO (Recovery Time Objective)
- **緊急時**: 4時間以内
- **通常障害**: 2時間以内
- **データ破損**: 1時間以内

### RPO (Recovery Point Objective)
- **クリティカルデータ**: 15分以内
- **ユーザーデータ**: 1時間以内
- **ログデータ**: 24時間以内

## 🗃️ データ分類

### Tier 1: クリティカルデータ (毎時バックアップ)
- ユーザーアカウント情報
- アクティブなゲームセッション
- チャットログ
- AI生成コンテンツ

### Tier 2: 重要データ (日次バックアップ)
- キャンペーン設定
- ユーザー設定
- システム設定

### Tier 3: 一般データ (週次バックアップ)
- ログファイル
- メトリクスデータ
- アーカイブデータ

## 💾 バックアップ方法

### 1. データベースバックアップ

#### Supabaseの場合

```bash
#!/bin/bash
# 自動バックアップスクリプト

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups/supabase"
DB_URL=$DATABASE_URL

# フルバックアップ
pg_dump "$DB_URL" > "$BACKUP_DIR/full_backup_$TIMESTAMP.sql"

# 圧縮
gzip "$BACKUP_DIR/full_backup_$TIMESTAMP.sql"

# 7日より古いバックアップを削除
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: full_backup_$TIMESTAMP.sql.gz"
```

#### Neon.techの場合

```bash
#!/bin/bash
# Neon.tech バックアップスクリプト

# Neon CLIを使用
neon backup create --project-id $NEON_PROJECT_ID --branch main

# または pg_dumpを使用
pg_dump $DATABASE_URL --format=custom --file=backup_$(date +%Y%m%d_%H%M%S).dump
```

### 2. アプリケーションファイルバックアップ

#### ユーザーアップロードファイル

```bash
#!/bin/bash
# S3/クラウドストレージのバックアップ

# AWS S3の例
aws s3 sync s3://your-bucket/uploads s3://your-backup-bucket/uploads-$(date +%Y%m%d)/

# ローカルストレージの例（非推奨）
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz /app/uploads/
```

#### 設定ファイル

```bash
#!/bin/bash
# アプリケーション設定のバックアップ

# 環境変数設定（秘匿情報は除く）
echo "PORT=$PORT" > config_backup_$(date +%Y%m%d).env
echo "NODE_ENV=$NODE_ENV" >> config_backup_$(date +%Y%m%d).env
# APIキーなどの秘匿情報は含めない
```

## 🕐 バックアップスケジュール

### 自動バックアップ (cron設定)

```crontab
# 毎時バックアップ (Tier 1データ)
0 * * * * /scripts/hourly_backup.sh

# 日次バックアップ (全データ)
0 2 * * * /scripts/daily_backup.sh

# 週次フルバックアップ
0 1 * * 0 /scripts/weekly_backup.sh

# 月次アーカイブバックアップ
0 0 1 * * /scripts/monthly_backup.sh
```

### GitHub Actionsでの自動化

```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *' # 毎日午前2時
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Create Database Backup
        run: |
          pg_dump ${{ secrets.DATABASE_URL }} > backup_$(date +%Y%m%d).sql
          
      - name: Upload to S3
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2
          
      - name: Sync to S3
        run: |
          aws s3 cp backup_$(date +%Y%m%d).sql s3://your-backup-bucket/daily/
```

## 🔄 復旧手順

### 1. データベース復旧

#### 完全復旧

```bash
#!/bin/bash
# データベース完全復旧

# 1. 現在のデータベースをバックアップ（安全のため）
pg_dump $DATABASE_URL > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. データベースを停止（必要な場合）
# kubectl scale deployment app-backend --replicas=0

# 3. バックアップから復元
psql $DATABASE_URL < backup_20240122_020000.sql

# 4. データ整合性確認
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM campaigns;"

# 5. アプリケーション再開
# kubectl scale deployment app-backend --replicas=3
```

#### Point-in-Time復旧

```bash
#!/bin/bash
# 特定時点への復旧

RESTORE_TIME="2024-01-22 14:30:00"

# Supabaseの場合
supabase db reset --restore-time "$RESTORE_TIME"

# Neon.techの場合
neon branch restore --project-id $NEON_PROJECT_ID --timestamp "$RESTORE_TIME"
```

### 2. アプリケーション復旧

```bash
#!/bin/bash
# アプリケーション復旧手順

# 1. 最新のバックアップイメージにロールバック
docker pull your-registry/app-backend:backup-tag
docker stop app-backend
docker run -d --name app-backend-restored your-registry/app-backend:backup-tag

# 2. 設定ファイル復元
cp config_backup_20240122.env /app/.env

# 3. ファイルアップロード復元
aws s3 sync s3://your-backup-bucket/uploads-20240122/ /app/uploads/

# 4. ヘルスチェック
curl http://localhost:3000/api/health
```

## 📊 バックアップ監視

### バックアップ成功監視

```bash
#!/bin/bash
# バックアップ成功確認スクリプト

BACKUP_FILE="$1"
MIN_SIZE=1024  # 最小サイズ (KB)

if [ -f "$BACKUP_FILE" ] && [ $(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null) -gt $((MIN_SIZE * 1024)) ]; then
    echo "SUCCESS: Backup $BACKUP_FILE is valid"
    # 成功通知 (Slack, Discord, etc.)
    curl -X POST -H 'Content-type: application/json' \
         --data '{"text":"✅ Database backup completed successfully"}' \
         $SLACK_WEBHOOK_URL
    exit 0
else
    echo "ERROR: Backup $BACKUP_FILE is invalid or missing"
    # エラー通知
    curl -X POST -H 'Content-type: application/json' \
         --data '{"text":"❌ Database backup FAILED"}' \
         $SLACK_WEBHOOK_URL
    exit 1
fi
```

### 復旧テスト

```bash
#!/bin/bash
# 月次復旧テスト

# テスト用データベース作成
createdb test_restore_db

# バックアップから復元
psql test_restore_db < latest_backup.sql

# データ整合性確認
USERS_COUNT=$(psql test_restore_db -t -c "SELECT COUNT(*) FROM users;")
CAMPAIGNS_COUNT=$(psql test_restore_db -t -c "SELECT COUNT(*) FROM campaigns;")

echo "Restored data: $USERS_COUNT users, $CAMPAIGNS_COUNT campaigns"

# テストデータベース削除
dropdb test_restore_db

# 結果レポート
echo "Recovery test completed successfully at $(date)" >> /logs/recovery_tests.log
```

## 🗄️ バックアップ保存場所

### プライマリストレージ
- **本番バックアップ**: AWS S3 / Google Cloud Storage
- **保存期間**: 30日
- **冗長化**: Multi-AZ

### セカンダリストレージ
- **長期保管**: AWS Glacier / Google Cloud Archive
- **保存期間**: 7年
- **アクセス**: 12時間以内

### ローカルバックアップ (緊急用)
- **場所**: サーバーローカル
- **保存期間**: 7日
- **用途**: 即座の復旧用

## ⚠️ セキュリティ考慮事項

### バックアップデータの暗号化

```bash
#!/bin/bash
# 暗号化バックアップ

# GPG暗号化
pg_dump $DATABASE_URL | gpg --cipher-algo AES256 --compress-algo 1 \
  --symmetric --output backup_$(date +%Y%m%d).sql.gpg

# AWS KMS暗号化
aws s3 cp backup.sql s3://bucket/backup.sql \
  --sse aws:kms --sse-kms-key-id your-kms-key-id
```

### アクセス制御
- バックアップファイルへのアクセスはIAMで制限
- 復旧作業は複数人での承認制
- すべてのバックアップ・復旧作業をログ記録

## 📋 復旧チェックリスト

### 緊急時対応
- [ ] インシデント宣言
- [ ] 復旧チーム招集
- [ ] 影響範囲確認
- [ ] 復旧方法決定
- [ ] バックアップ検証
- [ ] 復旧実行
- [ ] 動作確認
- [ ] ユーザー通知
- [ ] 事後レポート作成

### 定期メンテナンス
- [ ] バックアップファイル確認（週次）
- [ ] 復旧テスト実行（月次）
- [ ] ストレージ使用量確認（月次）
- [ ] バックアップ戦略見直し（四半期）

## 📞 緊急連絡先

### 技術チーム
- **プライマリ**: [連絡先]
- **セカンダリ**: [連絡先]

### インフラプロバイダー
- **Supabase**: support@supabase.io
- **Neon.tech**: support@neon.tech
- **Render**: support@render.com
- **Vercel**: support@vercel.com

---

**注意**: このバックアップ戦略は定期的に見直し、システムの成長に応じて更新してください。