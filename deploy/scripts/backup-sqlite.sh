#!/bin/bash
# Daily SQLite backup для Hondius Watch.
# Использует sqlite3 .backup (online consistent backup, не блокирует БД).
# Хранит последние 14 дней в /opt/hondius/backups, gzip-сжатые.
#
# Установка cron (раз):
#   chmod +x /opt/hondius/deploy/scripts/backup-sqlite.sh
#   crontab -e -u root
#   # Добавить:
#   0 3 * * * /opt/hondius/deploy/scripts/backup-sqlite.sh >> /var/log/hondius-backup.log 2>&1
#
# Ручной прогон:
#   /opt/hondius/deploy/scripts/backup-sqlite.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/hondius}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE="docker compose -f $APP_DIR/docker-compose.yml --project-directory $APP_DIR"

mkdir -p "$BACKUP_DIR"

DATE=$(date -u +%Y%m%d-%H%M%S)
TMP_IN_CONTAINER="/app/data/backup-$DATE.db"
OUT="$BACKUP_DIR/subscribers-$DATE.db"

echo "[$(date -u +%FT%TZ)] Starting backup → $OUT"

# better-sqlite3 в контейнере есть, sqlite3 CLI — нет (slim image).
# Используем Node + better-sqlite3.backup() для consistent online backup.
$COMPOSE exec -T hondius-tracker node -e "
const Database = require('better-sqlite3');
const db = new Database('/app/data/subscribers.db', { readonly: true });
db.backup('$TMP_IN_CONTAINER').then(() => {
  console.log('online backup written');
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
"

# Контейнерный путь /app/data примонтирован в named volume.
# Чтобы вытащить файл наружу — копируем через docker cp.
CID=$($COMPOSE ps -q hondius-tracker)
if [[ -z "$CID" ]]; then
  echo "ERROR: hondius-tracker container not running"
  exit 1
fi
docker cp "$CID:$TMP_IN_CONTAINER" "$OUT"
$COMPOSE exec -T hondius-tracker rm -f "$TMP_IN_CONTAINER"

# Sanity check — файл должен быть >0 байт.
if [[ ! -s "$OUT" ]]; then
  echo "ERROR: backup file is empty: $OUT"
  exit 1
fi

# Compress.
gzip -f "$OUT"
SIZE=$(stat -c%s "$OUT.gz" 2>/dev/null || stat -f%z "$OUT.gz")
echo "[$(date -u +%FT%TZ)] Backup OK: $OUT.gz ($SIZE bytes)"

# Rotate: keep last N days.
find "$BACKUP_DIR" -name "subscribers-*.db.gz" -mtime "+$RETENTION_DAYS" -print -delete

echo "[$(date -u +%FT%TZ)] Done. Current backups:"
ls -lh "$BACKUP_DIR"/subscribers-*.db.gz 2>/dev/null | tail -5 || echo "  (none yet)"
