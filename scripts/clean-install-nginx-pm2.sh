#!/usr/bin/env bash
# =============================================================================
# DESTRUCTIVE: removes systemd API unit (if any), wipes MariaDB app DB+user,
# reinstalls schema + seed, nginx for static SPA, PM2 for API only.
#
# Prerequisites: Linux, sudo, Node 20+, bash. MariaDB + nginx installed
# (or set WITH_APT=1 for a minimal apt install on Debian/Ubuntu).
#
# From repo root:
#   chmod +x scripts/clean-install-nginx-pm2.sh
#   ./scripts/clean-install-nginx-pm2.sh
#
# After install, deploy updates with:
#   ./scripts/update-pm2-app.sh
#
# Env (optional):
#   WEB_ROOT=/var/www/it-department-portal
#   DB_NAME=it_department
#   DB_USER=it_department_app
#   WITH_APT=1            Install nginx, mariadb-server, mariadb-client, curl (Node must exist)
#   SKIP_PM2_INSTALL=1    Do not npm install -g pm2 when pm2 missing
#
# Never run this script with sudo. If backend/.env is root-owned, the script
# will sudo chown the clone to you before writing.
# =============================================================================
set -euo pipefail

die() { echo "error: $*" >&2; exit 1; }
log() { echo "[clean-install] $*"; }

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

sql_quote_literal() {
  printf '%s' "$1" | sed "s/'/''/g"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd -P)"
REPO_ROOT=""
if tmp="$(find_repo_root "$(pwd)")"; then REPO_ROOT="$tmp"
elif tmp="$(find_repo_root "$SCRIPT_DIR/..")"; then REPO_ROOT="$tmp"
else die "cd into the repository clone first"
fi

SUDO=""
[[ "$(id -u)" -eq 0 ]] && die "do not run this script as root; use a normal user with sudo for nginx/mysql"

require_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing: $1"; }
require_cmd sudo
require_cmd node
require_cmd npm
require_cmd curl
require_cmd openssl

WITH_APT="${WITH_APT:-0}"
WEB_ROOT="${WEB_ROOT:-/var/www/it-department-portal}"
DB_NAME="${DB_NAME:-it_department}"
DB_USER="${DB_USER:-it_department_app}"
SKIP_PM2_INSTALL="${SKIP_PM2_INSTALL:-0}"

if [[ "$WITH_APT" == "1" ]]; then
  log "WITH_APT=1 — apt installing nginx, mariadb-server, mariadb-client…"
  sudo apt-get update -qq
  sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx mariadb-server mariadb-client
  sudo systemctl enable mariadb 2>/dev/null || sudo systemctl enable mysql
  sudo systemctl start mariadb 2>/dev/null || sudo systemctl start mysql
  sudo systemctl enable nginx
  sudo systemctl start nginx
fi

command -v nginx >/dev/null 2>&1 || die "nginx not installed (apt install nginx or WITH_APT=1)"

MYSQL_CLI="mysql"
command -v mysql >/dev/null 2>&1 || MYSQL_CLI="mariadb"
command -v "$MYSQL_CLI" >/dev/null 2>&1 || die "MariaDB client not found (apt install mariadb-client or WITH_APT=1)"

if ! sudo "$MYSQL_CLI" -e "SELECT 1" >/dev/null 2>&1; then
  die "sudo $MYSQL_CLI failed — fix MariaDB root auth or start the service"
fi

SCHEMA_SQL="$REPO_ROOT/docs/database/schema-mariadb.sql"
[[ -f "$SCHEMA_SQL" ]] || die "missing $SCHEMA_SQL"

cd "$REPO_ROOT"

# Root-owned files (e.g. sudo npm, setup-ubuntu copying api.env) break writes.
ensure_repo_writable_for_current_user() {
  local need=0
  if [[ ! -w . ]]; then need=1; fi
  if [[ -d backend ]] && [[ ! -w backend ]]; then need=1; fi
  if [[ -f backend/.env ]] && [[ ! -w backend/.env ]]; then need=1; fi
  if [[ -d backend/node_modules ]] && [[ ! -w backend/node_modules ]]; then need=1; fi
  if [[ -d node_modules ]] && [[ ! -w node_modules ]]; then need=1; fi
  if [[ -f .credentials-mariadb.env ]] && [[ ! -w .credentials-mariadb.env ]]; then need=1; fi
  if [[ -f .credentials-portal.env ]] && [[ ! -w .credentials-portal.env ]]; then need=1; fi
  if [[ "$need" == "1" ]]; then
    log "Fixing clone ownership for $(id -un) (unwritable files — often after sudo)…"
    sudo chown -R "$(id -un):$(id -gn)" "$REPO_ROOT"
  fi
}

echo ""
echo "This will:"
echo "  - stop and REMOVE systemd unit it-department-api (if present)"
echo "  - delete PM2 apps it-department-api / it-department-spa (if present)"
echo "  - DROP database '$DB_NAME' and SQL user '$DB_USER' (all data gone)"
echo "  - reinstall schema, seed ONE portal user (you will enter login + password)"
echo "  - deploy SPA to $WEB_ROOT and configure nginx on port 80"
echo "  - run the API under PM2 on port 4000 (no systemd)"
echo ""
read -r -p "Type YES to continue: " confirm
[[ "$confirm" == "YES" ]] || die "aborted"

echo ""
read -r -p "Portal login (username): " PORTAL_LOGIN
[[ -n "${PORTAL_LOGIN// }" ]] || die "login cannot be empty"

while true; do
  read -r -s -p "Portal password: " PORTAL_PW
  echo ""
  read -r -s -p "Portal password (again): " PORTAL_PW2
  echo ""
  [[ "$PORTAL_PW" == "$PORTAL_PW2" ]] || { echo "Passwords did not match."; continue; }
  [[ "${#PORTAL_PW}" -ge 10 ]] || { echo "Password must be at least 10 characters."; continue; }
  break
done

DB_APP_PASSWORD="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -hex 32)"
pw_esc="$(sql_quote_literal "$DB_APP_PASSWORD")"

# --- Remove old API orchestration -------------------------------------------
# Never delete with npx pm2 then start with global pm2 (two different PM2 daemons).
log "Stopping PM2 apps (if any)…"
if ! command -v pm2 >/dev/null 2>&1; then
  if [[ "$SKIP_PM2_INSTALL" != "1" ]]; then
    log "Installing pm2 globally (same binary for delete + start)…"
    npm install -g pm2
    hash -r 2>/dev/null || true
  fi
fi
if command -v pm2 >/dev/null 2>&1; then
  PM2_CMD=("$(command -v pm2)")
else
  PM2_CMD=(npx --yes pm2)
fi

# Stop+delete on both npx and global PM2 (covers mixed installs and stale names).
pm2_nuke_app() {
  local name="$1"
  npx --yes pm2 stop "$name" 2>/dev/null || true
  npx --yes pm2 delete "$name" 2>/dev/null || true
  if command -v pm2 >/dev/null 2>&1; then
    "$(command -v pm2)" stop "$name" 2>/dev/null || true
    "$(command -v pm2)" delete "$name" 2>/dev/null || true
  fi
}
pm2_nuke_app it-department-api
pm2_nuke_app it-department-spa

if [[ -f /etc/systemd/system/it-department-api.service ]]; then
  log "Removing systemd it-department-api.service…"
  sudo systemctl disable --now it-department-api 2>/dev/null || true
  sudo rm -f /etc/systemd/system/it-department-api.service
  sudo systemctl daemon-reload
fi
sudo rm -f /etc/it-department/api.env 2>/dev/null || true

# --- MariaDB wipe + recreate -------------------------------------------------
log "Dropping database and app user…"
sudo "$MYSQL_CLI" <<SQL
DROP DATABASE IF EXISTS \`${DB_NAME}\`;
DROP USER IF EXISTS '${DB_USER}'@'localhost';
DROP USER IF EXISTS '${DB_USER}'@'127.0.0.1';
CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${pw_esc}';
CREATE USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${pw_esc}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

ensure_repo_writable_for_current_user

umask 077
CRED_DB="$REPO_ROOT/.credentials-mariadb.env"
{
  echo "# Generated by scripts/clean-install-nginx-pm2.sh"
  echo "DB_HOST=127.0.0.1"
  echo "DB_PORT=3306"
  echo "DB_NAME=${DB_NAME}"
  echo "DB_USER=${DB_USER}"
  echo "DB_PASSWORD=${DB_APP_PASSWORD}"
} >"$CRED_DB"
chmod 600 "$CRED_DB" || true

BACKEND_ENV="$REPO_ROOT/backend/.env"
umask 077
cat >"$BACKEND_ENV" <<EOF
PORT=4000
NODE_ENV=production
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_NAME=${DB_NAME}
DATABASE_USER=${DB_USER}
DATABASE_PASSWORD=${DB_APP_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=*
EOF
chmod 600 "$BACKEND_ENV" || true

PORTAL_CRED="$REPO_ROOT/.credentials-portal.env"
node -e "
const fs = require('fs');
const p = process.argv[1];
const login = process.argv[2];
const pw = process.argv[3];
fs.writeFileSync(p, '# Generated by scripts/clean-install-nginx-pm2.sh\\n' +
  'PORTAL_SUPERADMIN_LOGIN=' + login + '\\n' +
  'PORTAL_SUPERADMIN_PASSWORD=' + pw + '\\n', { mode: 0o600 });
" "$PORTAL_CRED" "$PORTAL_LOGIN" "$PORTAL_PW"
chmod 600 "$PORTAL_CRED" || true

log "Installing npm dependencies and running migrate + seed…"
if [[ -f "$REPO_ROOT/backend/package-lock.json ]]; then (cd "$REPO_ROOT/backend" && npm ci)
else (cd "$REPO_ROOT/backend" && npm install)
fi
(
  cd "$REPO_ROOT/backend"
  npm run migrate
  SEED_SUPERADMIN_LOGIN="$PORTAL_LOGIN" SEED_SUPERADMIN_PASSWORD="$PORTAL_PW" npm run seed
  npm run build
)

if [[ -f "$REPO_ROOT/package-lock.json ]]; then npm ci; else npm install; fi
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api/v1}"
log "SPA build VITE_API_BASE_URL=$VITE_API_BASE_URL"
npm run build

[[ -f "$REPO_ROOT/backend/dist/index.js" ]] || die "backend dist missing"
[[ -f "$REPO_ROOT/dist/index.html" ]] || die "frontend dist missing"

# --- nginx static ------------------------------------------------------------
log "Deploying dist/ → $WEB_ROOT …"
sudo mkdir -p "$WEB_ROOT"
sudo rm -rf "${WEB_ROOT:?}/"*
sudo cp -a "$REPO_ROOT/dist/." "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT" 2>/dev/null || sudo chown -R nginx:nginx "$WEB_ROOT" 2>/dev/null || true

SITE_PATH="/etc/nginx/sites-available/it-department-portal.conf"
log "Writing $SITE_PATH …"
sudo tee "$SITE_PATH" >/dev/null <<'NGINX_CONF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root WEB_ROOT_PLACEHOLDER;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX_CONF
sudo sed -i "s|WEB_ROOT_PLACEHOLDER|$WEB_ROOT|g" "$SITE_PATH"

if [[ -d /etc/nginx/sites-enabled ]]; then
  sudo ln -sf "$SITE_PATH" /etc/nginx/sites-enabled/it-department-portal.conf
  sudo rm -f /etc/nginx/sites-enabled/default
fi
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

# --- PM2 API ----------------------------------------------------------------
ECO="$REPO_ROOT/ecosystem.api-only.cjs"
[[ -f "$ECO" ]] || die "missing ecosystem.api-only.cjs"
log "Starting API with PM2…"
pm2_nuke_app it-department-api
pm2_nuke_app it-department-spa
# -f: PM2 otherwise errors "Script already launched" if the name survived in its dump.
"${PM2_CMD[@]}" start "$ECO" -f

ok=0
for _ in {1..30}; do
  if curl -sfS --max-time 2 "http://127.0.0.1:4000/health" >/dev/null 2>&1; then ok=1; break; fi
  sleep 1
done
[[ "$ok" == "1" ]] || die "API did not become healthy on :4000 — run: ${PM2_CMD[*]} logs it-department-api"

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
[[ -z "$LAN_IP" ]] && LAN_IP="127.0.0.1"

echo ""
log "Done."
echo "  Site:     http://${LAN_IP}/"
echo "  API:      http://127.0.0.1:4000/health (PM2: it-department-api)"
echo "  DB creds: $CRED_DB"
echo "  Portal:   login saved in $PORTAL_CRED"
echo ""
echo "  Updates:  ./scripts/update-pm2-app.sh"
echo "  Logs:     ${PM2_CMD[*]} logs it-department-api"
echo "  Boot:     ${PM2_CMD[*]} save && ${PM2_CMD[*]} startup   (run what it prints, once)"
echo ""
