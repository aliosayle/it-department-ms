#!/usr/bin/env bash
# After `npm run build`, keep nginx's document root in sync with ./dist when files change.
#
# Requires: inotify-tools (`sudo apt install inotify-tools`)
# Usage (repo root):
#   export WEB_ROOT=/var/www/it-department-portal   # must match nginx root for the SPA
#   ./scripts/watch-dist-sync-nginx.sh
#
# Notes:
# - This does NOT rebuild the SPA; run `npm run build` separately or in another terminal.
# - Uses `nginx -t` + `systemctl reload nginx` (reload, not restart — keeps connections).
# - Run as a user that may use sudo for rsync into WEB_ROOT and nginx reload.
#
set -euo pipefail

die() { echo "error: $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
DIST="$REPO_ROOT/dist"
WEB_ROOT="${WEB_ROOT:-/var/www/it-department-portal}"
DEBOUNCE_SEC="${DEBOUNCE_SEC:-2}"

[[ -d "$DIST" ]] || die "missing $DIST — run npm run build first"

command -v inotifywait >/dev/null 2>&1 || die "install inotify-tools: sudo apt install inotify-tools"

SUDO=""
[[ "$(id -u)" -eq 0 ]] || SUDO="sudo"

sync_and_reload() {
  echo "[$(date -Is)] rsync dist/ → $WEB_ROOT/"
  $SUDO mkdir -p "$WEB_ROOT"
  $SUDO rsync -a --delete "$DIST/" "$WEB_ROOT/"
  $SUDO chown -R www-data:www-data "$WEB_ROOT" 2>/dev/null || $SUDO chown -R nginx:nginx "$WEB_ROOT" 2>/dev/null || true
  if command -v nginx >/dev/null 2>&1; then
    $SUDO nginx -t
    $SUDO systemctl reload nginx 2>/dev/null || $SUDO systemctl restart nginx 2>/dev/null || true
  fi
  echo "[$(date -Is)] done."
}

echo "Watching $DIST → $WEB_ROOT (debounce ${DEBOUNCE_SEC}s). Ctrl+C to stop."
echo "Tip: in another terminal run: npm run build -- --watch   # if your Vite setup supports watch build"

# Initial sync so WEB_ROOT matches current dist
sync_and_reload

while true; do
  # Wait for any change under dist/ (Vite build touches many files; we debounce once quiet)
  inotifywait -r -q -e close_write,moved_to,create,delete,move "$DIST" || true
  sleep "$DEBOUNCE_SEC"
  # Drain burst: if more events arrive quickly, wait again
  while inotifywait -r -q -t 1 -e close_write,moved_to,create,delete,move "$DIST" 2>/dev/null; do
    sleep 1
  done || true
  sync_and_reload
done
