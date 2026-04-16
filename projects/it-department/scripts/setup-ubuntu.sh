#!/usr/bin/env bash
# =============================================================================
# IT Department portal — Ubuntu setup (22.04 / 24.04+)
# Run after cloning the repo, from the repository root:
#   chmod +x scripts/setup-ubuntu.sh && ./scripts/setup-ubuntu.sh
#
# Environment overrides:
#   NODE_MAJOR=22          Node.js major version (NodeSource)
#   INSTALL_NGINX=1        Set to 0 to skip nginx (only build)
#   WEB_ROOT=/var/www/it-department-portal   Static files destination (nginx)
#   SKIP_APT=1           Skip apt update & package installs (if Node already OK)
# =============================================================================
set -euo pipefail

NODE_MAJOR="${NODE_MAJOR:-22}"
INSTALL_NGINX="${INSTALL_NGINX:-1}"
WEB_ROOT="${WEB_ROOT:-/var/www/it-department-portal}"
SKIP_APT="${SKIP_APT:-0}"

usage() {
  sed -n '1,20p' "$0" | tail -n +2
  exit 0
}

[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && usage

die() { echo "error: $*" >&2; exit 1; }

require_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing command: $1"; }

SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  require_cmd sudo
  SUDO="sudo"
fi

run_apt() {
  [[ "$SKIP_APT" == "1" ]] && return 0
  $SUDO apt-get update -qq
  $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl ca-certificates gnupg git
}

install_node_nodesource() {
  if command -v node >/dev/null 2>&1; then
    local ver
    ver="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
    if [[ "${ver:-0}" -ge "${NODE_MAJOR}" ]]; then
      echo "Node.js $(node -v) already satisfies major >= ${NODE_MAJOR}; skipping NodeSource install."
      return 0
    fi
  fi
  [[ "$SKIP_APT" == "1" ]] && die "Node.js ${NODE_MAJOR}+ is required but SKIP_APT=1 (skipping apt). Install Node manually, then re-run."
  echo "Installing Node.js ${NODE_MAJOR}.x (NodeSource)…"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | $SUDO bash -
  $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
}

find_repo_root() {
  local start="${1:-.}"
  local dir
  dir="$(cd "$start" && pwd)"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/package.json" ]] && [[ -d "$dir/src" ]] && [[ -f "$dir/vite.config.ts" ]]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
REPO_ROOT=""
if tmp="$(find_repo_root "$(pwd)")"; then
  REPO_ROOT="$tmp"
elif tmp="$(find_repo_root "$SCRIPT_DIR/..")"; then
  REPO_ROOT="$tmp"
else
  die "could not find repo root (vite project with package.json). Clone the repo, cd into it, then run: ./scripts/setup-ubuntu.sh"
fi

echo "Repository: $REPO_ROOT"
cd "$REPO_ROOT"

run_apt
install_node_nodesource
require_cmd npm

echo "Installing npm dependencies (ci)…"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "Building production bundle…"
npm run build

if [[ "$INSTALL_NGINX" != "1" ]]; then
  echo "Skipping nginx (INSTALL_NGINX!=1). Serve dist with:"
  echo "  cd \"$REPO_ROOT\" && npx vite preview --host 0.0.0.0 --port 4173"
  exit 0
fi

if [[ "$SKIP_APT" != "1" ]]; then
  echo "Installing nginx…"
  $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx
fi

echo "Deploying static files to $WEB_ROOT …"
$SUDO mkdir -p "$WEB_ROOT"
$SUDO rm -rf "${WEB_ROOT:?}/"*
$SUDO cp -a "$REPO_ROOT/dist/." "$WEB_ROOT/"
$SUDO chown -R www-data:www-data "$WEB_ROOT" 2>/dev/null || $SUDO chown -R nginx:nginx "$WEB_ROOT" 2>/dev/null || true

SITE_PATH="/etc/nginx/sites-available/it-department-portal.conf"
echo "Writing nginx site to $SITE_PATH …"
$SUDO tee "$SITE_PATH" >/dev/null <<'NGINX_CONF'
# IT Department portal — SPA fallback
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root WEB_ROOT_PLACEHOLDER;
    index index.html;

    # Cache hashed assets from Vite
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX_CONF

$SUDO sed -i "s|WEB_ROOT_PLACEHOLDER|$WEB_ROOT|g" "$SITE_PATH"

if [[ -d /etc/nginx/sites-enabled ]]; then
  $SUDO ln -sf "$SITE_PATH" /etc/nginx/sites-enabled/it-department-portal.conf
  # Avoid duplicate default on fresh Ubuntu: disable default site if our site is default_server
  if [[ -L /etc/nginx/sites-enabled/default ]]; then
    $SUDO rm -f /etc/nginx/sites-enabled/default
  fi
fi

$SUDO nginx -t
$SUDO systemctl enable nginx
$SUDO systemctl restart nginx

echo ""
echo "Setup complete."
echo "  Static root: $WEB_ROOT"
echo "  Open:      http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo THIS_SERVER)/"
echo ""
echo "Notes:"
echo "  - For HTTPS, add certbot (Let's Encrypt) and a server_name."
echo "  - DevExtreme: set a commercial key in src/config/license.ts and rebuild when not using evaluation."
echo "  - Optional API: set VITE_API_BASE_URL before build, or rebuild after adding .env.production."
