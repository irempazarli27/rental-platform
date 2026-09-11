#!/bin/bash
# Daily production DB backup: dumps rental-prod-postgres-1 to a gzip file,
# keeping the last 14 days. Reads credentials from .env.production so
# nothing is hardcoded here.
set -euo pipefail

cd "$(dirname "$0")/.."
set -a
source .env.production
set +a

BACKUP_DIR="$(pwd)/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="${BACKUP_DIR}/rental_platform_prod-${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

docker exec rental-prod-postgres-1 pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT_FILE"

echo "Backup written: $OUT_FILE"

# Keep only the last 14 backups
ls -1t "$BACKUP_DIR"/rental_platform_prod-*.sql.gz | tail -n +15 | xargs -r rm --
