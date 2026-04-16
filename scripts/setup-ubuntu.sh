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
#   SUPERADMIN_LOGIN=superadmin   Portal bootstrap user (written to .credentials-portal.env)
#   SUPERADMIN_PASSWORD=...       If unset, a random hex password is generated for seed
#   VERBOSE=1                     Print each shell command (set -x) and slightly louder apt/npm
# =============================================================================
set -euo pipefail

VERBOSE="${VERBOSE:-0}"

log_step() {
  echo ""
  echo "========================================================================"
  echo " $*"
  echo "========================================================================"
}

log_info() {
  echo "[setup] $*"
}

[[ "$VERBOSE" == "1" ]] && set -x

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
SUPERADMIN_LOGIN="${SUPERADMIN_LOGIN:-superadmin}"
SUPERADMIN_PASSWORD="${SUPERADMIN_PASSWORD:-}"

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
  [[ "$SKIP_APT" == "1" ]] && {
    log_info "SKIP_APT=1 — skipping apt-get update and base packages."
    return 0
  }
  log_info "apt-get update (base packages: curl, ca-certificates, gnupg, git, openssl)…"
  if [[ "$VERBOSE" == "1" ]]; then
    $SUDO apt-get update
    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y curl ca-certificates gnupg git openssl
  else
    $SUDO apt-get update -qq
    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl ca-certificates gnupg git openssl
  fi
  log_info "Base apt packages installed."
}

apt_install() {
  [[ "$SKIP_APT" == "1" ]] && die "SKIP_APT=1 but a package install was required: $*"
  log_info "apt-get install -y $*"
  if [[ "$VERBOSE" == "1" ]]; then
    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y "$@"
  else
    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@"
  fi
}

install_node_nodesource() {
  if command -v node >/dev/null 2>&1; then
    local ver
    ver="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
    if [[ "${ver:-0}" -ge "${NODE_MAJOR}" ]]; then
      log_info "Node.js $(node -v) already satisfies major >= ${NODE_MAJOR}; skipping NodeSource install."
      return 0
    fi
  fi
  [[ "$SKIP_APT" == "1" ]] && die "Node.js ${NODE_MAJOR}+ is required but SKIP_APT=1. Install Node manually, then re-run."
  log_info "Installing Node.js ${NODE_MAJOR}.x via NodeSource (curl | bash setup script, then apt nodejs)…"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | $SUDO bash -
  apt_install nodejs
  log_info "Node.js installed: $(command -v node) → $(node -v)"
}

install_mariadb_server() {
  [[ "$INSTALL_MARIADB" != "1" ]] && {
    log_info "INSTALL_MARIADB!=1 — skipping MariaDB server install."
    return 0
  }
  log_info "Installing MariaDB server and client packages…"
  apt_install mariadb-server mariadb-client
  log_info "Enabling and starting MariaDB (mariadb or mysql service)…"
  $SUDO systemctl enable mariadb 2>/dev/null || $SUDO systemctl enable mysql
  $SUDO systemctl start mariadb 2>/dev/null || $SUDO systemctl start mysql
  log_info "MariaDB service is up."
}

install_nginx_server() {
  [[ "$INSTALL_NGINX" != "1" ]] && {
    log_info "INSTALL_NGINX!=1 — skipping nginx package install."
    return 0
  }
  log_info "Installing nginx…"
  apt_install nginx
  log_info "nginx package installed."
}

# Installs systemd unit + /etc/it-department/api.env so nginx is not left proxying to a dead :4000 (502).
install_api_systemd() {
  [[ "$INSTALL_NGINX" != "1" ]] && return 0
  [[ -f "$REPO_ROOT/backend/package.json" ]] || {
    log_info "No backend/package.json — skipping REST API systemd unit."
    return 0
  }
  [[ -f "$REPO_ROOT/backend/dist/index.js" ]] || {
    log_info "No backend/dist/index.js — skipping API service (expected after npm run build in backend/)."
    return 0
  }
  [[ -f "$REPO_ROOT/backend/.env" ]] || {
    log_info "No backend/.env — skipping API service install."
    return 0
  }

  require_cmd systemctl
  NODE_BIN="$(command -v node)"
  [[ -x "$NODE_BIN" ]] || die "node not executable: $NODE_BIN"

  API_USER="$(stat -c '%U' "$REPO_ROOT" 2>/dev/null || echo root)"
  API_GROUP="$(stat -c '%G' "$REPO_ROOT" 2>/dev/null || echo root)"
  # systemd rejects WorkingDirectory with ".." (not normalized); always use a resolved path.
  BACKEND_ABS="$(cd "$REPO_ROOT/backend" && pwd -P)"
  log_info "Installing REST API systemd unit (User=$API_USER, WorkingDirectory=$BACKEND_ABS)…"

  $SUDO mkdir -p /etc/it-department
  $SUDO install -m 600 -o root -g root "$REPO_ROOT/backend/.env" /etc/it-department/api.env
  log_info "Installed /etc/it-department/api.env (from backend/.env; root-readable for systemd only)."

  $SUDO tee /etc/systemd/system/it-department-api.service >/dev/null <<UNIT
[Unit]
Description=IT Department portal REST API (Fastify + MariaDB)
After=network-online.target mariadb.service mysql.service
Wants=network-online.target

[Service]
Type=simple
User=${API_USER}
Group=${API_GROUP}
WorkingDirectory=${BACKEND_ABS}
EnvironmentFile=/etc/it-department/api.env
ExecStart=${NODE_BIN} dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

  $SUDO systemctl daemon-reload
  $SUDO systemctl enable it-department-api.service
  $SUDO systemctl restart it-department-api.service
  log_info "systemd: it-department-api.service enabled and restarted."

  local ok=0
  for _ in {1..20}; do
    if curl -sfS --max-time 2 "http://127.0.0.1:4000/health" >/dev/null 2>&1; then
      ok=1
      break
    fi
    sleep 1
  done
  if [[ "$ok" != "1" ]]; then
    log_info "API health check failed after 20s. Diagnostics:"
    $SUDO systemctl --no-pager -l status it-department-api.service 2>&1 | tail -n 30 || true
    die "REST API did not respond on http://127.0.0.1:4000/health (nginx would return 502). Fix errors above, then: sudo systemctl restart it-department-api"
  fi
  log_info "REST API healthy on port 4000."
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

log_step "IT Department portal — Ubuntu setup"
log_info "Repository root: $REPO_ROOT"
log_info "Effective settings: NODE_MAJOR=$NODE_MAJOR INSTALL_MARIADB=$INSTALL_MARIADB INSTALL_NGINX=$INSTALL_NGINX SKIP_APT=$SKIP_APT DB_RESET=$DB_RESET WEB_ROOT=$WEB_ROOT"
if [[ -n "${DB_APP_PASSWORD:-}" ]]; then
  log_info "Database: DB_NAME=$DB_NAME DB_USER=$DB_USER DB_HOST=$DB_HOST (DB_APP_PASSWORD is set from env — value not shown)"
else
  log_info "Database: DB_NAME=$DB_NAME DB_USER=$DB_USER DB_HOST=$DB_HOST (DB_APP_PASSWORD will be auto-generated)"
fi
if [[ -n "${SUPERADMIN_PASSWORD:-}" ]]; then
  log_info "Portal seed: SUPERADMIN_LOGIN=$SUPERADMIN_LOGIN (SUPERADMIN_PASSWORD is set from env — value not shown)"
else
  log_info "Portal seed: SUPERADMIN_LOGIN=$SUPERADMIN_LOGIN (SUPERADMIN_PASSWORD will be auto-generated)"
fi
log_info "Verbose trace: VERBOSE=$VERBOSE (set VERBOSE=1 for set -x and louder apt)"
cd "$REPO_ROOT"

SCHEMA_SQL="$REPO_ROOT/docs/database/schema-mariadb.sql"
[[ -f "$SCHEMA_SQL" ]] || die "missing MariaDB schema: $SCHEMA_SQL"
log_info "Schema file: $SCHEMA_SQL"

log_step "Phase 1 — Base apt, MariaDB, Node.js"
run_apt_base
install_mariadb_server
install_node_nodesource
require_cmd npm
log_info "npm: $(npm -v), node: $(node -v)"

# --- MariaDB: database + user + schema --------------------------------------
CRED_FILE="$REPO_ROOT/.credentials-mariadb.env"

if [[ "$INSTALL_MARIADB" == "1" ]]; then
  log_step "Phase 2 — MariaDB database, schema, credentials"
  command -v mysql >/dev/null 2>&1 || command -v mariadb >/dev/null 2>&1 || die "MariaDB client (mysql) not found after install."
  MYSQL_CLI="mysql"
  command -v mysql >/dev/null 2>&1 || MYSQL_CLI="mariadb"
  log_info "Using SQL client: $MYSQL_CLI"
  local_pw="$DB_APP_PASSWORD"
  if [[ -z "$local_pw" ]]; then
    local_pw="$(openssl rand -hex 24)"
    log_info "Generated random DB app user password (written to $CRED_FILE only)."
  else
    log_info "Using DB app user password from DB_APP_PASSWORD env."
  fi

  log_info "Ensuring database exists: $DB_NAME"
  if [[ "$DB_RESET" == "1" ]]; then
    log_info "DB_RESET=1 — dropping database ${DB_NAME} (destructive)."
    $SUDO "$MYSQL_CLI" -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`;"
  fi

  log_info "CREATE DATABASE IF NOT EXISTS (utf8mb4)…"
  $SUDO "$MYSQL_CLI" -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

  log_info "Recreating SQL user ${DB_USER}@localhost and granting privileges on ${DB_NAME}…"
  $SUDO "$MYSQL_CLI" -e "DROP USER IF EXISTS '${DB_USER}'@'localhost';"
  $SUDO "$MYSQL_CLI" -e "CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${local_pw}';"
  $SUDO "$MYSQL_CLI" -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;"

  table_count="$($SUDO "$MYSQL_CLI" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';")"
  log_info "Tables already in ${DB_NAME}: ${table_count:-0}"
  if [[ "${table_count:-0}" -eq 0 ]]; then
    log_info "Importing schema from docs/database/schema-mariadb.sql (this may take a moment)…"
    $SUDO "$MYSQL_CLI" "$DB_NAME" <"$SCHEMA_SQL"
    log_info "Schema import finished."
  else
    log_info "Database '$DB_NAME' already has tables; skipping schema import."
    log_info "To wipe and re-import: DB_RESET=1 ./scripts/setup-ubuntu.sh (destructive)."
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
  log_info "Wrote MariaDB app credentials file: $CRED_FILE (password not echoed here)"

  PORTAL_CRED_FILE="$REPO_ROOT/.credentials-portal.env"
  if [[ -f "$REPO_ROOT/backend/package.json" ]]; then
    log_step "Phase 2b — Backend .env, migrate, superadmin seed"
    local_sa_pw="$SUPERADMIN_PASSWORD"
    if [[ -z "$local_sa_pw" ]]; then
      local_sa_pw="$(openssl rand -hex 16)"
      log_info "Generated random portal superadmin password (written to $PORTAL_CRED_FILE only)."
    else
      log_info "Using portal superadmin password from SUPERADMIN_PASSWORD env."
    fi
    log_info "Reading DB_* from $CRED_FILE into backend/.env …"
    DB_HOST_VAL="$(grep '^DB_HOST=' "$CRED_FILE" | head -1 | cut -d= -f2-)"
    DB_PORT_VAL="$(grep '^DB_PORT=' "$CRED_FILE" | head -1 | cut -d= -f2-)"
    DB_NAME_VAL="$(grep '^DB_NAME=' "$CRED_FILE" | head -1 | cut -d= -f2-)"
    DB_USER_VAL="$(grep '^DB_USER=' "$CRED_FILE" | head -1 | cut -d= -f2-)"
    DB_PASSWORD_VAL="$(grep '^DB_PASSWORD=' "$CRED_FILE" | head -1 | cut -d= -f2-)"
    JWT_SECRET_VAL="$(openssl rand -hex 32)"
    umask 077
    cat >"$REPO_ROOT/backend/.env" <<EOF
PORT=4000
NODE_ENV=production
DATABASE_HOST=${DB_HOST_VAL}
DATABASE_PORT=${DB_PORT_VAL}
DATABASE_NAME=${DB_NAME_VAL}
DATABASE_USER=${DB_USER_VAL}
DATABASE_PASSWORD=${DB_PASSWORD_VAL}
JWT_SECRET=${JWT_SECRET_VAL}
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=*
EOF
    chmod 600 "$REPO_ROOT/backend/.env" || true
    log_info "Wrote $REPO_ROOT/backend/.env (secrets not echoed)."
    umask 077
    {
      echo "# Generated by scripts/setup-ubuntu.sh — first portal sign-in"
      echo "PORTAL_SUPERADMIN_LOGIN=${SUPERADMIN_LOGIN}"
      echo "PORTAL_SUPERADMIN_PASSWORD=${local_sa_pw}"
    } >"$PORTAL_CRED_FILE"
    chmod 600 "$PORTAL_CRED_FILE" || true
    log_info "Running: (cd backend && npm ci && npm run migrate && npm run seed) …"
    (
      cd "$REPO_ROOT/backend" || exit 1
      if [[ "$VERBOSE" == "1" ]]; then
        npm ci --loglevel info
      else
        npm ci
      fi
      npm run migrate
      SEED_SUPERADMIN_LOGIN="${SUPERADMIN_LOGIN}" SEED_SUPERADMIN_PASSWORD="${local_sa_pw}" npm run seed
      log_info "Compiling backend for production (npm run build → dist/)…"
      npm run build
    )
    log_info "Portal superadmin credentials file: $PORTAL_CRED_FILE (login: ${SUPERADMIN_LOGIN}; open file for password)"
  else
    log_info "Skipping portal seed: $REPO_ROOT/backend/package.json not found."
  fi
else
  log_info "INSTALL_MARIADB!=1 — skipping Phase 2 (database, schema, portal seed)."
fi

# --- Node build --------------------------------------------------------------
log_step "Phase 3 — SPA npm install and production build"
log_info "Running npm in $REPO_ROOT (root package)…"
if [[ -f package-lock.json ]]; then
  if [[ "$VERBOSE" == "1" ]]; then
    npm ci --loglevel info
  else
    npm ci
  fi
else
  log_info "No package-lock.json — using npm install."
  npm install
fi

log_info "Running npm run build (Vite production bundle) with VITE_API_BASE_URL=/api/v1 (nginx proxy)…"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api/v1}"
npm run build
log_info "SPA build finished; artifacts in dist/."

# --- Nginx static ------------------------------------------------------------
if [[ "$INSTALL_NGINX" != "1" ]]; then
  log_step "Skipping nginx (INSTALL_NGINX!=1)"
  log_info "Static deploy skipped. Preview the SPA build with:"
  log_info "  cd \"$REPO_ROOT\" && npx vite preview --host 0.0.0.0 --port 4173"
  [[ "$INSTALL_MARIADB" == "1" ]] && log_info "MariaDB credentials: $CRED_FILE"
  exit 0
fi

log_step "Phase 4 — nginx package, static deploy, site config"
install_nginx_server
install_api_systemd

log_info "Deploying dist/ → $WEB_ROOT (clearing previous contents)…"
$SUDO mkdir -p "$WEB_ROOT"
$SUDO rm -rf "${WEB_ROOT:?}/"*
$SUDO cp -a "$REPO_ROOT/dist/." "$WEB_ROOT/"
$SUDO chown -R www-data:www-data "$WEB_ROOT" 2>/dev/null || $SUDO chown -R nginx:nginx "$WEB_ROOT" 2>/dev/null || true
log_info "Static files deployed."

SITE_PATH="/etc/nginx/sites-available/it-department-portal.conf"
log_info "Writing nginx site block to $SITE_PATH …"
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
log_info "Substituted WEB_ROOT in nginx config."

if [[ -d /etc/nginx/sites-enabled ]]; then
  log_info "Enabling site in sites-enabled…"
  $SUDO ln -sf "$SITE_PATH" /etc/nginx/sites-enabled/it-department-portal.conf
  if [[ -L /etc/nginx/sites-enabled/default ]]; then
    log_info "Removing default nginx site symlink."
    $SUDO rm -f /etc/nginx/sites-enabled/default
  fi
fi

log_info "Running nginx -t (syntax test)…"
$SUDO nginx -t
log_info "Enabling and restarting nginx…"
$SUDO systemctl enable nginx
$SUDO systemctl restart nginx
log_info "nginx is active."

log_step "Setup complete — summary"
log_info "Web root:    $WEB_ROOT"
log_info "App URL:     http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo THIS_SERVER)/"
if [[ "$INSTALL_MARIADB" == "1" ]]; then
  log_info "MariaDB:     database=$DB_NAME user=$DB_USER (localhost)"
  log_info "Credentials: $CRED_FILE"
fi
if [[ "$INSTALL_MARIADB" == "1" ]] && [[ -f "$REPO_ROOT/.credentials-portal.env" ]]; then
  log_info "Portal login: $REPO_ROOT/.credentials-portal.env (superadmin seed)"
fi
log_info "Notes:"
log_info "  - REST API: systemd unit it-department-api.service (port 4000); logs: journalctl -u it-department-api -f"
log_info "  - nginx proxies /api/ → 127.0.0.1:4000; SPA build uses VITE_API_BASE_URL=/api/v1 unless overridden."
log_info "  - Point the API at MariaDB using DATABASE_* variables (see backend/.env.example and $CRED_FILE)."
log_info "  - PostgreSQL reference DDL remains in docs/database/schema.sql if you prefer Postgres later."
log_info "  - HTTPS: use certbot and set server_name in nginx."
log_info "  - DevExtreme: commercial key in src/config/license.ts when not using evaluation."
log_info "  - Re-run with VERBOSE=1 to trace every command (set -x) and use louder apt/npm output."
