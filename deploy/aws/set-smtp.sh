#!/usr/bin/env bash
# Stores Gmail SMTP credentials in the server's .env.aws so email verification
# codes are really sent. Prompts for the values, so the app password never
# lands in shell history. Re-running replaces the previous settings.
# Usage:  deploy/aws/set-smtp.sh <user@host> <path-to-key>
set -euo pipefail

TARGET="${1:?Usage: $0 <user@host> <key>}"
KEY="${2:?Usage: $0 <user@host> <key>}"

read -r -p "Gmail adresi: " MAIL_USER
read -r -s -p "Uygulama sifresi (yazarken gorunmez): " MAIL_PASS
echo
MAIL_PASS="${MAIL_PASS// /}"

if [[ ! "$MAIL_USER" =~ ^[^[:space:]@]+@[^[:space:]@]+$ ]]; then
  echo "Gecerli bir e-posta adresi degil: $MAIL_USER" >&2
  exit 1
fi
if [[ ! "$MAIL_PASS" =~ ^[a-zA-Z]{16}$ ]]; then
  echo "Uygulama sifresi 16 harf olmali (bosluklar sayilmaz)." >&2
  exit 1
fi

ssh -i "$KEY" -o LogLevel=ERROR "$TARGET" "cd /opt/paylasimlik && sed -i '/^SMTP_/d;/^MAIL_FROM/d' .env.aws && cat >> .env.aws" <<ENV
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=${MAIL_USER}
SMTP_PASS=${MAIL_PASS}
MAIL_FROM=Paylasimlik <${MAIL_USER}>
ENV
echo "KAYDEDILDI"
