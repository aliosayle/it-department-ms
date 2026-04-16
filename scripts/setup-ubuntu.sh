#!/usr/bin/env bash
# =============================================================================
# IT Department portal — Ubuntu setup (22.04 / 24.04+), clean install
#
# From the repository root (after git clone):
#   chmod +x scripts/setup-ubuntu.sh && ./scripts/setup-ubuntu.sh
#
# Environment overrides:
#   NODE_MAJOR=22              Node.js major (NodeSource)
#   INSTALL_NGINX=1            Set 0 to skip nginx static deploy
#   INSTALL_MARIADB=1          Set 0 to skip MariaDB install + DB bootstrap
#   WEB_ROOT=/var/www/it-department-portal
#   DB_NAME=it_department
#   DB_USER=it_department_app
#   DB_APP_PASSWORD=secret     If unset, a random hex password is generated (avoid ' in the value)
#   DB_HOST=localhost          Written to credentials file (app use)
#   DB_RESET=0                 Set 1 to DROP DATABASE (destructive) then recreate
#   SKIP_APT=1               Skip apt (you must pre-install deps yourself)
# =============================================================================
set -euo pipefail

NODE_MAJOR="${NODE_MAJOR:-22}"
INSTALL_NGINX="${INSTALL_NGINX:-1}"
INSTALL_MARIADB="${INSTALL_MARIADB:-1}"
WEB_ROOT="${WEB_ROOT:-/var/www/it-department-portal}"
SKIP_APT="${SKIP_APT:-0}"
DB_RESET="${DB_RESET:-0}"

DB_NAME="${DB_NAME:-it_department}"
DB_USER="${DB_USER:-it_department_app}"
DB_HOST="${DB_HOST:-localhost}"
DB_APP_PASSWORD="${DB_APP_PASSWORD:-}"

usage() {
  sed -n '1,25p' "$0" | tail -n +2
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

run_apt_base() {
  [[ "$SKIP_APT" == "1" ]] && return 0
  $SUDO apt-get update -qq
  $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl ca-certificates gnupg git openssl
}

apt_install() {
  [[ "$SKIP_APT" == "1" ]] && die "SKIP_APT=1 but a package install was required: $*"
  $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@"
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
  [[ "$SKIP_APT" == "1" ]] && die "Node.js ${NODE_MAJOR}+ is required but SKIP_APT=1. Install Node manually, then re-run."
  echo "Installing Node.js ${NODE_MAJOR}.x (NodeSource)…"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | $SUDO bash -
  apt_install nodejs
}

install_mariadb_server() {
  [[ "$INSTALL_MARIADB" != "1" ]] && return 0
  echo "Installing MariaDB server…"
  apt_install mariadb-server mariadb-client
  $SUDO systemctl enable mariadb 2>/dev/null || $SUDO systemctl enable mysql
  $SUDO systemctl start mariadb 2>/dev/null || $SUDO systemctl start mysql
}

install_nginx_server() {
  [[ "$INSTALL_NGINX" != "1" ]] && return 0
  echo "Installing nginx…"
  apt_install nginx
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
  die "could not find repo root. Clone the repo, cd into it, then run: ./scripts/setup-ubuntu.sh"
fi

echo "Repository: $REPO_ROOT"
cd "$REPO_ROOT"

SCHEMA_SQL="$REPO_ROOT/docs/database/schema-mariadb.sql"
[[ -f "$SCHEMA_SQL" ]] || die "missing MariaDB schema: $SCHEMA_SQL"

run_apt_base
install_mariadb_server
install_node_nodesource
require_cmd npm

# --- MariaDB: database + user + schema --------------------------------------
CRED_FILE="$REPO_ROOT/.credentials-mariadb.env"

if [[ "$INSTALL_MARIADB" == "1" ]]; then
  command -v mysql >/dev/null 2>&1 || command -v mariadb >/dev/null 2>&1 || die "MariaDB client (mysql) not found after install."
  MYSQL_CLI="mysql"
  command -v mysql >/dev/null 2>&1 || MYSQL_CLI="mariadb"
  local_pw="$DB_APP_PASSWORD"
  if [[ -z "$local_pw" ]]; then
    local_pw="$(openssl rand -hex 24)"
  fi

  echo "Configuring MariaDB database '$DB_NAME' and user '$DB_USER'…"

  if [[ "$DB_RESET" == "1" ]]; then
    $SUDO "$MYSQL_CLI" -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`;"
  fi

  $SUDO "$MYSQL_CLI" -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

  # MariaDB: drop user if exists for clean password reset on re-run
  $SUDO "$MYSQL_CLI" -e "DROP USER IF EXISTS '${DB_USER}'@'localhost';"
  $SUDO "$MYSQL_CLI" -e "CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${local_pw}';"
  $SUDO "$MYSQL_CLI" -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;"

  table_count="$($SUDO "$MYSQL_CLI" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';")"
  if [[ "${table_count:-0}" -eq 0 ]]; then
    echo "Applying schema from docs/database/schema-mariadb.sql …"
    $SUDO "$MYSQL_CLI" "$DB_NAME" <"$SCHEMA_SQL"
  else
    echo "Database '$DB_NAME' already has tables; skipping schema import."
    echo "To wipe and re-import: DB_RESET=1 ./scripts/setup-ubuntu.sh (destructive)."
  fi

  umask 077
  {
    echo "# Generated by scripts/setup-ubuntu.sh — keep secret; not committed if .gitignore is set."
    echo "DB_HOST=${DB_HOST}"
    echo "DB_PORT=3306"
    echo "DB_NAME=${DB_NAME}"
    echo "DB_USER=${DB_USER}"
    echo "DB_PASSWORD=${local_pw}"
  } >"$CRED_FILE"
  chmod 600 "$CRED_FILE" || true
  echo "Database credentials: $CRED_FILE"
fi

# --- Node build --------------------------------------------------------------
echo "Installing npm dependencies (ci)…"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "Building production bundle…"
npm run build

# --- Nginx static ------------------------------------------------------------
if [[ "$INSTALL_NGINX" != "1" ]]; then
  echo ""
  echo "Skipping nginx (INSTALL_NGINX!=1). Preview build:"
  echo "  cd \"$REPO_ROOT\" && npx vite preview --host 0.0.0.0 --port 4173"
  echo ""
  [[ "$INSTALL_MARIADB" == "1" ]] && echo "MariaDB: see $CRED_FILE"
  exit 0
fi

install_nginx_server

echo "Deploying static files to $WEB_ROOT …"
$SUDO mkdir -p "$WEB_ROOT"
$SUDO rm -rf "${WEB_ROOT:?}/"*
$SUDO cp -a "$REPO_ROOT/dist/." "$WEB_ROOT/"
$SUDO chown -R www-data:www-data "$WEB_ROOT" 2>/dev/null || $SUDO chown -R nginx:nginx "$WEB_ROOT" 2>/dev/null || true

SITE_PATH="/etc/nginx/sites-available/it-department-portal.conf"
echo "Writing nginx site to $SITE_PATH …"
$SUDO tee "$SITE_PATH" >/dev/null <<'NGINX_CONF'
# IT Department portal — SPA + API reverse proxy
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

$SUDO sed -i "s|WEB_ROOT_PLACEHOLDER|$WEB_ROOT|g" "$SITE_PATH"

if [[ -d /etc/nginx/sites-enabled ]]; then
  $SUDO ln -sf "$SITE_PATH" /etc/nginx/sites-enabled/it-department-portal.conf
  if [[ -L /etc/nginx/sites-enabled/default ]]; then
    $SUDO rm -f /etc/nginx/sites-enabled/default
  fi
fi

$SUDO nginx -t
$SUDO systemctl enable nginx
$SUDO systemctl restart nginx

echo ""
echo "Setup complete."
echo "  Web root:    $WEB_ROOT"
echo "  App URL:     http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo THIS_SERVER)/"
if [[ "$INSTALL_MARIADB" == "1" ]]; then
  echo "  MariaDB:     database=$DB_NAME user=$DB_USER (localhost)"
  echo "  Credentials: $CRED_FILE"
fi
echo ""
echo "Notes:"
echo "  - API: install Node API under backend/ (see docs/deploy/PRODUCTION.md), systemd unit deploy/it-department-api.service, then systemctl start it-department-api."
echo "  - nginx proxies /api/ → 127.0.0.1:4000; set VITE_API_BASE_URL=/api/v1 at SPA build time for same-origin calls."
echo "  - Point the API at MariaDB using DATABASE_* variables (see backend/.env.example and $CRED_FILE)."
echo "  - PostgreSQL reference DDL remains in docs/database/schema.sql if you prefer Postgres later."
echo "  - HTTPS: use certbot and set server_name in nginx."
echo "  - DevExtreme: commercial key in src/config/license.ts when not using evaluation."
