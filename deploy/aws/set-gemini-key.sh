#!/usr/bin/env bash
# Stores the Gemini API key both for local development (backend/.env) and on
# the server (.env.aws). Prompts for the key so it never lands in shell
# history. Re-running replaces the previous key.
# Usage:  deploy/aws/set-gemini-key.sh <user@host> <path-to-key>
set -euo pipefail

TARGET="${1:?Usage: $0 <user@host> <key>}"
KEY="${2:?Usage: $0 <user@host> <key>}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

read -r -s -p "Gemini API anahtari (yazarken gorunmez): " API_KEY
echo
API_KEY="${API_KEY// /}"
if [[ ! "$API_KEY" =~ ^[A-Za-z0-9_-]{30,}$ ]]; then
  echo "Bu bir Gemini API anahtarina benzemiyor (AIza... ile baslayan uzun bir metin olmali)." >&2
  exit 1
fi

LOCAL_ENV="$ROOT/backend/.env"
sed -i '/^GEMINI_API_KEY=/d' "$LOCAL_ENV"
echo "GEMINI_API_KEY=${API_KEY}" >> "$LOCAL_ENV"

ssh -i "$KEY" -o LogLevel=ERROR "$TARGET" "cd /opt/paylasimlik && sed -i '/^GEMINI_API_KEY=/d' .env.aws && cat >> .env.aws" <<ENV
GEMINI_API_KEY=${API_KEY}
ENV
echo "KAYDEDILDI (yerel backend/.env ve sunucu)"
