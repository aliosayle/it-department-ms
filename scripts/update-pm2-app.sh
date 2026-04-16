#!/usr/bin/env bash
# Rebuild SPA + API, restart PM2 API, sync static files to nginx WEB_ROOT.
# Run from repo clone as the same user that owns the PM2 process (not root).
#
#   export WEB_ROOT=/var/www/it-department-portal   # optional; this is the default
#   ./scripts/update-pm2-app.sh
#
set -euo pipefail

die() { echo "error: $*" >&2; exit 1; }

find_repo_root() {
  local start="${1:-.}" dir
  dir="$(cd "$start" && pwd -P)"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/package.json" ]] && [[ -d "$dir/src" ]] && [[ -f "$dir/vite.config.ts" ]]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd -P)"
REPO_ROOT=""
if tmp="$(find_repo_root "$(pwd)")"; then REPO_ROOT="$tmp"
elif tmp="$(find_repo_root "$SCRIPT_DIR/..")"; then REPO_ROOT="$tmp"
else die "run from the repository root (package.json + vite.config.ts)"
fi

WEB_ROOT="${WEB_ROOT:-/var/www/it-department-portal}"
SUDO=""
[[ "$(id -u)" -eq 0 ]] || SUDO="sudo"

cd "$REPO_ROOT"

command -v node >/dev/null 2>&1 || die "node not on PATH"
command -v npm >/dev/null 2>&1 || die "npm not on PATH"

PM2_CMD=(npx --yes pm2)
command -v pm2 >/dev/null 2>&1 && PM2_CMD=(pm2)

if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api/v1}"
npm run build

if [[ -f backend/package-lock.json ]]; then (cd backend && npm ci); else (cd backend && npm install); fi
(cd backend && npm run build)

[[ -f backend/dist/index.js ]] || die "backend build missing: backend/dist/index.js"

ECO="$REPO_ROOT/ecosystem.api-only.cjs"
[[ -f "$ECO" ]] || die "missing $ECO"

if "${PM2_CMD[@]}" describe it-department-api >/dev/null 2>&1; then
  "${PM2_CMD[@]}" restart it-department-api --update-env
else
  "${PM2_CMD[@]}" start "$ECO"
fi

$SUDO mkdir -p "$WEB_ROOT"
$SUDO rsync -a --delete "$REPO_ROOT/dist/" "$WEB_ROOT/"
$SUDO chown -R www-data:www-data "$WEB_ROOT" 2>/dev/null || $SUDO chown -R nginx:nginx "$WEB_ROOT" 2>/dev/null || true

if command -v nginx >/dev/null 2>&1; then
  $SUDO nginx -t
  $SUDO systemctl reload nginx 2>/dev/null || $SUDO systemctl restart nginx
fi

echo "[update-pm2-app] done. API: pm2 logs it-department-api --lines 50"
