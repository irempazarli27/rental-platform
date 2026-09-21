#!/usr/bin/env bash
# Creates .env.aws with freshly generated secrets. Refuses to overwrite an
# existing file, so re-running can never rotate secrets under a live database.
# Usage (on the server, inside /opt/paylasimlik):  bash deploy/aws/make-env.sh app.example.com
set -euo pipefail

DOMAIN="${1:-}"
OUT="${2:-.env.aws}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain> [output-file]" >&2
  exit 1
fi
if [ -e "$OUT" ]; then
  echo "$OUT already exists — not overwriting." >&2
  exit 1
fi

umask 077
cat > "$OUT" <<ENV
DOMAIN=${DOMAIN}
POSTGRES_USER=rental_prod
POSTGRES_PASSWORD=$(openssl rand -hex 24)
POSTGRES_DB=rental_platform_prod
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
HIGH_RISK_MIN_TRUST=40
VERIFICATION_DEMO_MODE=true
ENV
echo "Wrote $OUT (permissions 600) for domain ${DOMAIN}."
