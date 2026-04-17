#!/usr/bin/env bash
# Copy Vite dist/ to nginx WEB_ROOT and reload nginx.
# Use after: git pull && npm run build   (when you did NOT run scripts/update-pm2-app.sh)
#
#   export WEB_ROOT=/var/www/it-department-portal   # optional; default below
#   ./scripts/sync-spa-to-nginx.sh
#
set -euo pipefail

die() { echo "error: $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
[[ -f "$REPO_ROOT/dist/index.html" ]] || die "missing $REPO_ROOT/dist/index.html — run npm run build in repo root first"

WEB_ROOT="${WEB_ROOT:-/var/www/it-department-portal}"
SUDO=""
[[ "$(id -u)" -eq 0 ]] || SUDO="sudo"

$SUDO mkdir -p "$WEB_ROOT"
$SUDO rsync -a --delete "$REPO_ROOT/dist/" "$WEB_ROOT/"
$SUDO chown -R www-data:www-data "$WEB_ROOT" 2>/dev/null || $SUDO chown -R nginx:nginx "$WEB_ROOT" 2>/dev/null || true

if command -v nginx >/dev/null 2>&1; then
  $SUDO nginx -t
  $SUDO systemctl reload nginx 2>/dev/null || $SUDO systemctl restart nginx 2>/dev/null || true
fi

echo "[sync-spa-to-nginx] deployed dist/ → $WEB_ROOT"
