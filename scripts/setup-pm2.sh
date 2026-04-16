#!/usr/bin/env bash
# =============================================================================
# Full rebuild + PM2 (API + SPA preview) — Linux (macOS: set VITE_API_BASE_URL; no hostname -I)
#
# After: git reset --hard && git pull
#   chmod +x scripts/setup-pm2.sh
#   ./scripts/setup-pm2.sh
#
# Prerequisites: Node 20+, MariaDB running if you use migrate/seed.
#
# Env (optional):
#   SKIP_PM2_INSTALL=1     Do not run npm install -g pm2 when pm2 is missing
#   RUN_MIGRATE=0         Skip MariaDB bootstrap + npm run migrate (default is RUN_MIGRATE=1)
#   BOOTSTRAP_DB=0        With RUN_MIGRATE=1, skip CREATE DATABASE / USER (DB already exists)
#   BOOTSTRAP_DB=1        Only create DB+user, do not migrate (use with RUN_MIGRATE=0 if you want)
#   RUN_SEED=1            Seed portal superadmin (password: SEED_SUPERADMIN_PASSWORD, or .credentials-portal.env, or auto-generated into that file)
#   VITE_API_BASE_URL      SPA build API base; default: http://<first LAN IP>:4000/api/v1
#
# MariaDB app user password: backend/.env → DATABASE_PASSWORD (default from .env.example is changeme until you change it).
#
# Default: creates DB+user (sudo mysql), applies schema, builds, starts PM2. Seed is still opt-in:
#   RUN_SEED=1 ./scripts/setup-pm2.sh
#   RUN_SEED=1 SEED_SUPERADMIN_PASSWORD='…' ./scripts/setup-pm2.sh
# =============================================================================
set -euo pipefail

die() { echo "error: $*" >&2; exit 1; }
log() { echo "[pm2-setup] $*"; }

# Read KEY=value from .env (first match); value may contain '='.
env_get() {
  local key="$1" file="$2"
  [[ -f "$file" ]] || return 1
  grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2-
}

# Escape single quotes for use inside SQL single-quoted string.
sql_quote_literal() {
  printf '%s' "$1" | sed "s/'/''/g"
}

# Create DATABASE_NAME and DATABASE_USER@localhost + @127.0.0.1 (matches Node using DATABASE_HOST=127.0.0.1).
bootstrap_mariadb_from_env() {
  local envf="$REPO_ROOT/backend/.env"
  local db_name db_user db_pw pw_esc
  db_name="$(env_get DATABASE_NAME "$envf")"
  db_user="$(env_get DATABASE_USER "$envf")"
  db_pw="$(env_get DATABASE_PASSWORD "$envf")"
  [[ -n "$db_name" && -n "$db_user" ]] || die "bootstrap: DATABASE_NAME and DATABASE_USER must be set in backend/.env"
  [[ -n "$db_pw" ]] || die "bootstrap: DATABASE_PASSWORD must be set in backend/.env"
  [[ "$db_name" =~ ^[a-zA-Z0-9_]+$ ]] || die "bootstrap: DATABASE_NAME must be alphanumeric/underscore only"
  [[ "$db_user" =~ ^[a-zA-Z0-9_]+$ ]] || die "bootstrap: DATABASE_USER must be alphanumeric/underscore only"
  pw_esc="$(sql_quote_literal "$db_pw")"

  local MYSQL_CLI="mysql"
  command -v mysql >/dev/null 2>&1 || MYSQL_CLI="mariadb"
  command -v "$MYSQL_CLI" >/dev/null 2>&1 || die "bootstrap: install mariadb-client (mysql or mariadb CLI)"

  if ! command -v sudo >/dev/null 2>&1; then
    die "bootstrap: sudo is required to run ${MYSQL_CLI} as root for CREATE DATABASE / USER"
  fi
  if ! sudo "$MYSQL_CLI" -e "SELECT 1" >/dev/null 2>&1; then
    die "bootstrap: 'sudo $MYSQL_CLI' failed (install MariaDB, ensure root can auth via sudo). Or create DB manually and set BOOTSTRAP_DB=0 RUN_MIGRATE=1."
  fi

  log "Creating MariaDB database '$db_name' and user '$db_user' (localhost + 127.0.0.1)…"
  sudo "$MYSQL_CLI" <<SQL
CREATE DATABASE IF NOT EXISTS \`${db_name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
DROP USER IF EXISTS '${db_user}'@'localhost';
DROP USER IF EXISTS '${db_user}'@'127.0.0.1';
CREATE USER '${db_user}'@'localhost' IDENTIFIED BY '${pw_esc}';
CREATE USER '${db_user}'@'127.0.0.1' IDENTIFIED BY '${pw_esc}';
GRANT ALL PRIVILEGES ON \`${db_name}\`.* TO '${db_user}'@'localhost';
GRANT ALL PRIVILEGES ON \`${db_name}\`.* TO '${db_user}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
  log "MariaDB bootstrap finished."
}

find_repo_root() {
  local start="${1:-.}"
  local dir
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
if tmp="$(find_repo_root "$(pwd)")"; then
  REPO_ROOT="$tmp"
elif tmp="$(find_repo_root "$SCRIPT_DIR/..")"; then
  REPO_ROOT="$tmp"
else
  die "could not find repo root (package.json + src/ + vite.config.ts). cd into the clone and retry."
fi

cd "$REPO_ROOT"
log "Repository root: $REPO_ROOT"

command -v node >/dev/null 2>&1 || die "node is not on PATH"
command -v npm >/dev/null 2>&1 || die "npm is not on PATH"

PM2_CMD=(npx --yes pm2)
if command -v pm2 >/dev/null 2>&1; then
  PM2_CMD=(pm2)
elif [[ "${SKIP_PM2_INSTALL:-0}" != "1" ]]; then
  log "Installing pm2 globally (set SKIP_PM2_INSTALL=1 to skip and install pm2 yourself)…"
  npm install -g pm2
  PM2_CMD=(pm2)
else
  log "Using npx pm2 (install global pm2 for a cleaner PATH: npm i -g pm2)"
fi

# Default API URL for SPA build: same machine, LAN IP so other PCs can use the UI
LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
if [[ -z "${LAN_IP:-}" ]]; then
  LAN_IP="127.0.0.1"
fi
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://${LAN_IP}:4000/api/v1}"
log "VITE_API_BASE_URL for this build: $VITE_API_BASE_URL (override if needed)"

# --- Backend env ------------------------------------------------------------
if [[ ! -f "$REPO_ROOT/backend/.env" ]]; then
  if [[ -f "$REPO_ROOT/backend/.env.example" ]]; then
    cp "$REPO_ROOT/backend/.env.example" "$REPO_ROOT/backend/.env"
    log "Created backend/.env from .env.example — edit DATABASE_* and JWT_SECRET before RUN_MIGRATE=1."
  else
    die "missing backend/.env and backend/.env.example"
  fi
fi

# Default: migrate (and MariaDB bootstrap) so fresh MariaDB gets it_department without extra flags.
RUN_MIGRATE="${RUN_MIGRATE:-1}"

# --- Dependencies ------------------------------------------------------------
if [[ -f "$REPO_ROOT/package-lock.json" ]]; then
  log "npm ci (repo root)…"
  npm ci
else
  log "npm install (repo root, no lockfile)…"
  npm install
fi

if [[ -f "$REPO_ROOT/backend/package-lock.json" ]]; then
  log "npm ci (backend)…"
  (cd "$REPO_ROOT/backend" && npm ci)
else
  log "npm install (backend, no lockfile)…"
  (cd "$REPO_ROOT/backend" && npm install)
fi

# --- Optional MariaDB bootstrap + migrate / seed ----------------------------
if [[ "${BOOTSTRAP_DB:-0}" == "1" ]] || { [[ "${RUN_MIGRATE:-0}" == "1" ]] && [[ "${BOOTSTRAP_DB:-}" != "0" ]]; }; then
  bootstrap_mariadb_from_env
fi

if [[ "${RUN_MIGRATE:-0}" == "1" ]]; then
  log "RUN_MIGRATE=1 — npm run migrate in backend/…"
  (cd "$REPO_ROOT/backend" && npm run migrate)
  if [[ "${RUN_SEED:-0}" != "1" ]]; then
    log "Tip: without RUN_SEED=1 there is no portal user — /auth/login will return 401 until you seed (see .credentials-portal.env + RUN_SEED=1)."
  fi
fi

if [[ "${RUN_SEED:-0}" == "1" ]]; then
  SEED_LOGIN="${SEED_SUPERADMIN_LOGIN:-superadmin}"
  SEED_PW="${SEED_SUPERADMIN_PASSWORD:-}"
  if [[ -z "$SEED_PW" ]] && [[ -f "$REPO_ROOT/.credentials-portal.env" ]]; then
    SEED_PW="$(grep '^PORTAL_SUPERADMIN_PASSWORD=' "$REPO_ROOT/.credentials-portal.env" | cut -d= -f2- || true)"
  fi
  if [[ -z "$SEED_PW" ]]; then
    command -v openssl >/dev/null 2>&1 || die "RUN_SEED=1 needs SEED_SUPERADMIN_PASSWORD, .credentials-portal.env, or openssl to auto-generate a password"
    SEED_PW="$(openssl rand -hex 16)"
    umask 077
    {
      echo "# Generated by scripts/setup-pm2.sh — portal sign-in (gitignored)"
      echo "PORTAL_SUPERADMIN_LOGIN=${SEED_LOGIN}"
      echo "PORTAL_SUPERADMIN_PASSWORD=${SEED_PW}"
    } >"$REPO_ROOT/.credentials-portal.env"
    chmod 600 "$REPO_ROOT/.credentials-portal.env" || true
    log "RUN_SEED=1 — wrote new portal credentials to $REPO_ROOT/.credentials-portal.env (password not printed here)."
  fi
  log "RUN_SEED=1 — npm run seed (login=$SEED_LOGIN)…"
  (cd "$REPO_ROOT/backend" && SEED_SUPERADMIN_LOGIN="$SEED_LOGIN" SEED_SUPERADMIN_PASSWORD="$SEED_PW" npm run seed)
fi

# --- Builds -----------------------------------------------------------------
log "backend: npm run build…"
(cd "$REPO_ROOT/backend" && npm run build)

[[ -f "$REPO_ROOT/backend/dist/index.js" ]] || die "backend build missing dist/index.js"

log "frontend: npm run build…"
npm run build

[[ -f "$REPO_ROOT/dist/index.html" ]] || die "frontend build missing dist/index.html"

# --- PM2 --------------------------------------------------------------------
ECO="$REPO_ROOT/ecosystem.config.cjs"
[[ -f "$ECO" ]] || die "missing ecosystem.config.cjs at repo root"

"${PM2_CMD[@]}" delete it-department-api 2>/dev/null || true
"${PM2_CMD[@]}" delete it-department-spa 2>/dev/null || true

log "pm2 start $ECO …"
"${PM2_CMD[@]}" start "$ECO"

log "Done. URLs:"
log "  API (health):  http://${LAN_IP}:4000/health"
log "  SPA (preview): http://${LAN_IP}:4173/"
log "  MariaDB app user password: see DATABASE_PASSWORD in backend/.env"
log "  Portal sign-in: only after RUN_SEED=1 — login/password in .credentials-portal.env (or set SEED_SUPERADMIN_PASSWORD)"
log "  Ensure backend CORS allows this SPA origin (e.g. CORS_ORIGIN=* in backend/.env) if the browser blocks requests."
log "  pm2 logs | pm2 status | pm2 restart all | pm2 save && pm2 startup (boot persistence)"
