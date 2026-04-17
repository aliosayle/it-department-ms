# Production deployment (SPA + API + MariaDB)

This matches the v1 plan: **nginx** serves the Vite build and proxies **`/api/`** to the Node API; **MariaDB** holds data; **JWT** auth is enforced when the SPA is built with `VITE_API_BASE_URL` pointing at that API.

## nginx shows `404 Not Found` after `git pull` and `npm run build`

`npm run build` only writes files under **`dist/` inside your clone** (e.g. `~/it-department-ms/dist/`). Nginx is usually configured with **`root`** pointing at a **different** directory (default in our scripts: **`/var/www/it-department-portal`**). If you restart PM2 but never copy the new **`dist/`** into that **`root`**, the browser still sees an empty or stale tree and nginx returns **404** for `/` (no `index.html`).

**Fix (pick one):**

1. **Recommended after pull:** from the repo root, run **`./scripts/update-pm2-app.sh`** — it installs deps, builds SPA + API, **`pm2 restart`**, **`rsync`s `dist/` → `WEB_ROOT`**, and reloads nginx.

2. **If you already built manually** (`npm run build` + backend build + `pm2 restart all`): sync only the SPA:

   ```bash
   cd ~/it-department-ms
   chmod +x scripts/sync-spa-to-nginx.sh
   ./scripts/sync-spa-to-nginx.sh
   ```

   Optional: `export WEB_ROOT=/your/nginx/root` if it differs from `/var/www/it-department-portal`.

3. **One-off rsync** (same as the script):

   ```bash
   sudo mkdir -p /var/www/it-department-portal
   sudo rsync -a --delete ~/it-department-ms/dist/ /var/www/it-department-portal/
   sudo nginx -t && sudo systemctl reload nginx
   ```

**Verify:** `ls /var/www/it-department-portal/index.html` and `grep root /etc/nginx/sites-enabled/it-department-portal.conf` — the `root` path must contain that `index.html`.

## 1. Database and portal bootstrap user

`scripts/setup-ubuntu.sh` with **`INSTALL_MARIADB=1`** (default) will:

1. Create the MariaDB database and app user, apply `docs/database/schema-mariadb.sql`, and write **`.credentials-mariadb.env`**.
2. If **`backend/package.json`** exists: write **`backend/.env`**, run **`npm run migrate`** and **`npm run seed`**, and write **`.credentials-portal.env`** with **`PORTAL_SUPERADMIN_LOGIN`** / **`PORTAL_SUPERADMIN_PASSWORD`** (password random unless you set **`SUPERADMIN_PASSWORD`** before running the script).

The seed creates **only** one portal user (full access; no demo companies or stock). Sign in at **`/login`** with that login.

Manual seed (without the full Ubuntu script):

```bash
cd /opt/it-department/backend
cp .env.example .env
# Edit .env: DATABASE_*, JWT_SECRET, CORS_ORIGIN
npm ci
npm run migrate
SEED_SUPERADMIN_LOGIN=superadmin SEED_SUPERADMIN_PASSWORD='your-secure-password' npm run seed
```

## 2. API (systemd or PM2)

### PM2 (nginx static SPA, no systemd unit)

1. From the repo clone (as a non-root user with `sudo`): **`./scripts/clean-install-nginx-pm2.sh`** — wipes the app database, prompts for portal login/password, removes any **`it-department-api.service`** unit if present, configures nginx, starts **`it-department-api`** via PM2 (`ecosystem.api-only.cjs`).
2. After `git pull`: **`./scripts/update-pm2-app.sh`** (rebuilds, syncs `dist/` to **`WEB_ROOT`**, **`pm2 restart it-department-api`**).
3. Persist PM2 across reboots once: **`pm2 save`** then **`pm2 startup`** (run the command it prints).

### systemd (default Ubuntu script)

With **`INSTALL_NGINX=1`** (default), **`scripts/setup-ubuntu.sh`** already runs **`npm run build`** in **`backend/`**, copies **`backend/.env`** to **`/etc/it-department/api.env`**, installs **`it-department-api.service`** ( **`User`/`Group`** = owner of the repo tree so a clone under `/home/...` works), enables it, and checks **`http://127.0.0.1:4000/health`**. If nginx returns **502**, the usual cause is the API not running: **`sudo systemctl status it-department-api`** and **`journalctl -u it-department-api -n 80 --no-pager`**.

**systemd:** `WorkingDirectory=` must be a **normalized absolute path** (no **`..`** segment). Values like `/home/you/repo/backend/..` make **`systemctl`** report *Unit has a bad unit file setting*. Use e.g. **`BACKEND="$(cd /path/to/repo/backend && pwd -P)"`** when writing the unit by hand.

Manual install (e.g. **`/opt/it-department`** layout):

1. Build: `npm ci && npm run build` inside `backend/`.
2. Install **`/etc/it-department/api.env`** (mode `600`, root-owned) with the same variables as **`backend/.env`** (`DATABASE_*`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN`; use **`CORS_ORIGIN=*`** behind nginx so any browser `Origin` is allowed via reflection).
3. Copy **`deploy/it-department-api.service`** to **`/etc/systemd/system/`**, edit **`WorkingDirectory`**, **`User`**, and **`ExecStart`** (`which node`) to match your paths, then:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now it-department-api
   ```

4. Confirm: `curl -sS http://127.0.0.1:4000/health`

The template unit uses **`WorkingDirectory=/opt/it-department/backend`**. The Ubuntu setup script instead generates a unit with **`WorkingDirectory`** set to your actual clone path.

## 3. SPA build

Build the portal with the **same origin** API base so the browser calls `/api/v1/...` through nginx:

```bash
cd /opt/it-department
export VITE_API_BASE_URL=/api/v1
export VITE_ENABLE_EVAL_WATERMARK_MITIGATION=false   # when using a commercial DevExtreme key
export VITE_DEVEXTREME_LICENSE_KEY='your-commercial-key'   # optional; see README
npm ci
npm run build
```

Deploy `dist/` to the nginx web root (the Ubuntu script copies it to `WEB_ROOT`).

### Alternative: point nginx `root` at `dist/` in the clone

On a single machine where you build in place, you can set **`root`** to the **absolute** path of **`…/it-department-ms/dist`** instead of `/var/www/...`. Then **`npm run build`** updates what nginx serves with **no rsync and no reload** (static files are read from disk on each request).

1. Edit your site file under **`/etc/nginx/sites-available/`** (same `location /` / `try_files` pattern as the install scripts: SPA fallback **`try_files $uri $uri/ /index.html;`**, and a **`location /api/`** proxy to the API).
2. Set for example:

   ```nginx
   root /home/it-glpi/it-department-ms/dist;
   ```

3. Ensure **nginx can traverse the path**: every directory from `/` down to **`dist`** must be executable (`chmod o+x` or group `www-data`) and files under **`dist`** readable. Typical fix:

   ```bash
   chmod o+x /home/it-glpi /home/it-glpi/it-department-ms
   # or: sudo usermod -aG it-glpi www-data && newgrp  # if you prefer group access
   ```

4. **`sudo nginx -t && sudo systemctl reload nginx`**

Tradeoffs: the web server user can read everything nginx is allowed to follow under that path (keep permissions tight); moving the clone path requires editing nginx again. A dedicated **`WEB_ROOT`** under `/var/www` avoids exposing home-directory layout.

### Optional: auto-sync `dist/` when files change

Nginx does not need a restart for normal static file updates once the files on disk are updated. Production flow is still **`./scripts/update-pm2-app.sh`** after `git pull`. If you often rebuild locally on the server and want **`dist/`** mirrored to **`WEB_ROOT`** automatically, use inotify:

```bash
chmod +x scripts/watch-dist-sync-nginx.sh
export WEB_ROOT=/var/www/it-department-portal   # same as nginx root for the SPA
./scripts/watch-dist-sync-nginx.sh
```

Run **`npm run build`** (or a watch build) in another terminal; the script **rsyncs** `dist/` → `WEB_ROOT` and runs **`systemctl reload nginx`** after a short debounce. Install **`inotify-tools`** first (`sudo apt install inotify-tools`).

## 4. nginx

`scripts/setup-ubuntu.sh` writes a site that includes **`location /api/`** → **`http://127.0.0.1:4000`**. Ensure nothing else binds port **4000** except the API, or change both the unit’s implied port and nginx `proxy_pass`.

For HTTPS, set `server_name` and use certbot; keep the `/api/` block inside the TLS server.

## 5. Workflow + upload storage notes

- Task attachments are stored on disk under `backend/uploads/task-attachments/` (created automatically).
- Ensure the API service user has write permission to that directory.
- Include this directory in backup policy together with MariaDB dumps.
- Attachment policy (current): allowlist MIME (`pdf`, `png`, `jpeg`, `text/plain`), max payload 5MB, sanitized filenames, file mode `0600`.

## 6. Smoke check

With the API running:

```bash
cd backend && npm run smoke
```

With only the SPA: open the site, sign in on **`/login`**, and confirm grids load (bootstrap).
