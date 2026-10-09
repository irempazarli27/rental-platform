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
# Pasting can drag in invisible characters (spaces, carriage returns, the
# terminal's bracketed-paste markers); keep only printable non-space ones.
API_KEY="$(printf '%s' "$API_KEY" | sed 's/\x1b\[20[01]~//g' | tr -cd '[:graph:]')"
if [[ -z "$API_KEY" ]]; then
  echo "Anahtar bos geldi. Kopyaladiginizdan emin olup tekrar deneyin." >&2
  exit 1
fi

# Rather than guess at the key's format (it has changed before), ask Google.
echo "Anahtar Google'da deneniyor..."
if ! GEMINI_API_KEY="$API_KEY" node -e '
  fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", {
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY },
  })
    .then(async (r) => {
      if (r.ok) process.exit(0);
      const body = await r.json().catch(() => ({}));
      console.error("Google anahtari kabul etmedi (" + r.status + "): " + (body.error?.message ?? r.statusText));
      process.exit(1);
    })
    .catch((e) => { console.error("Google a ulasilamadi: " + e.message); process.exit(1); });
'; then
  exit 1
fi
echo "Anahtar gecerli (${#API_KEY} karakter)."

LOCAL_ENV="$ROOT/backend/.env"
sed -i '/^GEMINI_API_KEY=/d' "$LOCAL_ENV"
echo "GEMINI_API_KEY=${API_KEY}" >> "$LOCAL_ENV"

ssh -i "$KEY" -o LogLevel=ERROR "$TARGET" "cd /opt/paylasimlik && sed -i '/^GEMINI_API_KEY=/d' .env.aws && cat >> .env.aws" <<ENV
GEMINI_API_KEY=${API_KEY}
ENV
echo "KAYDEDILDI (yerel backend/.env ve sunucu)"
