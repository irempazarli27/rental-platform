#!/usr/bin/env bash
# Nightly backup, run on the server by paylasimlik-backup.timer (installed by
# bootstrap-server.sh). Dumps the database and the uploads volume into
# /opt/paylasimlik-backups, keeping the last 14 dumps and 3 upload archives.
# These live on the same disk as the data: they protect against a bad deploy
# or accidental deletion, not against losing the instance.
set -euo pipefail

APP_DIR=/opt/paylasimlik
BACKUP_DIR=/opt/paylasimlik-backups
STAMP="$(date +%Y%m%d-%H%M%S)"
COMPOSE=(docker compose -f "$APP_DIR/docker-compose.aws.yml" --env-file "$APP_DIR/.env.aws")

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Dump to a temp name first so a failed run never leaves a truncated file that
# looks like a valid backup.
"${COMPOSE[@]}" exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$BACKUP_DIR/.db.tmp"
mv "$BACKUP_DIR/.db.tmp" "$BACKUP_DIR/db-$STAMP.sql.gz"

"${COMPOSE[@]}" exec -T backend tar -C /app -cf - uploads | gzip > "$BACKUP_DIR/.uploads.tmp"
mv "$BACKUP_DIR/.uploads.tmp" "$BACKUP_DIR/uploads-$STAMP.tar.gz"

ls -1t "$BACKUP_DIR"/db-*.sql.gz | tail -n +15 | xargs -r rm --
ls -1t "$BACKUP_DIR"/uploads-*.tar.gz | tail -n +4 | xargs -r rm --

echo "Backup written: db-$STAMP.sql.gz ($(du -h "$BACKUP_DIR/db-$STAMP.sql.gz" | cut -f1)), uploads-$STAMP.tar.gz ($(du -h "$BACKUP_DIR/uploads-$STAMP.tar.gz" | cut -f1))"
