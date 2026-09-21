#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 24.04 EC2 instance. Safe to re-run.
# Usage (on the server):  sudo bash bootstrap-server.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y docker.io docker-compose-v2 rsync unattended-upgrades

systemctl enable --now docker

# The Next.js build is memory-hungry; swap keeps a small instance from being
# OOM-killed mid-build.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Let the default login user run docker without sudo (takes effect on next login).
if id ubuntu >/dev/null 2>&1; then
  usermod -aG docker ubuntu
fi

mkdir -p /opt/paylasimlik
chown -R "${SUDO_USER:-ubuntu}":"${SUDO_USER:-ubuntu}" /opt/paylasimlik

echo "Done. Docker: $(docker --version) | $(docker compose version)"
echo "Log out and back in once so the docker group applies."
