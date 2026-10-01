#!/usr/bin/env bash
# Pushes the current project to the AWS host and (re)builds the stack there.
# Usage:  deploy/aws/deploy.sh <user@host> <path-to-key.pem>
# Secrets (.env.aws), uploads and database volumes live only on the server and
# are never overwritten by this script.
set -euo pipefail

TARGET="${1:?Usage: $0 <user@host> <key.pem>}"
KEY="${2:?Usage: $0 <user@host> <key.pem>}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new)

rsync -az --delete \
  --exclude '.git' --exclude 'node_modules' --exclude '.next' --exclude 'dist' \
  --exclude 'backups' --exclude 'uploads' --exclude 'uploads-test' \
  --exclude '.env*' --exclude '*.log' --exclude 'test-results' --exclude 'playwright-report' \
  -e "${SSH[*]}" "$ROOT"/ "$TARGET":/opt/paylasimlik/

"${SSH[@]}" "$TARGET" 'cd /opt/paylasimlik && docker compose -f docker-compose.aws.yml --env-file .env.aws up -d --build && docker compose -f docker-compose.aws.yml --env-file .env.aws ps'
