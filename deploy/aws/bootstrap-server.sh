#!/usr/bin/env bash
# One-time setup for a fresh EC2 instance (Ubuntu 24.04 or Amazon Linux 2023).
# Safe to re-run.
# Usage (on the server):  sudo bash bootstrap-server.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y docker.io docker-compose-v2 rsync unattended-upgrades
else
  # Amazon Linux ships docker but not the compose/buildx CLI plugins.
  dnf install -y docker rsync dnf-automatic
  systemctl enable --now dnf-automatic-install.timer
  arch="$(uname -m)"
  case "$arch" in
    x86_64) barch=amd64 ;;
    aarch64) barch=arm64 ;;
    *) echo "Unsupported architecture: $arch" >&2; exit 1 ;;
  esac
  plugins=/usr/local/lib/docker/cli-plugins
  mkdir -p "$plugins"
  if [ ! -x "$plugins/docker-compose" ]; then
    curl -fsSL -o "$plugins/docker-compose" \
      "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${arch}"
    chmod +x "$plugins/docker-compose"
  fi
  if [ ! -x "$plugins/docker-buildx" ]; then
    ver="$(curl -fsSL https://api.github.com/repos/docker/buildx/releases/latest | grep -oE '"tag_name": *"[^"]+"' | cut -d'"' -f4)"
    curl -fsSL -o "$plugins/docker-buildx" \
      "https://github.com/docker/buildx/releases/download/${ver}/buildx-${ver}.linux-${barch}"
    chmod +x "$plugins/docker-buildx"
  fi
fi

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
for u in ubuntu ec2-user; do
  if id "$u" >/dev/null 2>&1; then
    usermod -aG docker "$u"
  fi
done

owner="${SUDO_USER:-$(id -un 1000 2>/dev/null || echo root)}"
mkdir -p /opt/paylasimlik
chown -R "$owner":"$owner" /opt/paylasimlik

echo "Done. Docker: $(docker --version) | $(docker compose version)"
echo "Log out and back in once so the docker group applies."
