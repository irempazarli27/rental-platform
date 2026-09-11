#!/bin/bash
# Cloudflare "quick tunnels" can get stuck in an infinite reconnect loop
# without the process actually exiting, so systemd's Restart=always never
# kicks in. This checks whether the last URL cloudflared logged is actually
# serving traffic, and force-restarts the service (which registers a fresh
# tunnel) if not.
set -euo pipefail

LOG_FILE="/home/irem/rental-platform/cloudflared.log"
URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG_FILE" | tail -n 1 || true)

if [ -z "$URL" ]; then
  systemctl restart cloudflared-tunnel.service
  exit 0
fi

if ! wget -q -T 10 -O /dev/null "$URL/health" 2>&1; then
  echo "$(date -Iseconds) tunnel unresponsive ($URL), restarting" >> "$LOG_FILE"
  systemctl restart cloudflared-tunnel.service
fi
