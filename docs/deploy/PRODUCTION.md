# Production deployment (SPA + API + MariaDB)

This matches the v1 plan: **nginx** serves the Vite build and proxies **`/api/`** to the Node API; **MariaDB** holds data; **JWT** auth is enforced when the SPA is built with `VITE_API_BASE_URL` pointing at that API.

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

## 2. API (systemd)

1. Copy the application tree so **`backend/`** exists at **`/opt/it-department/backend`** (or change paths below).
2. Build: `npm ci && npm run build` inside `backend/`.
3. Install environment file **`/etc/it-department/api.env`** (mode `600`), mapping variables from `backend/.env.example` (use the same `DATABASE_*` and `JWT_SECRET` as runtime).
4. Install the unit file:

   ```bash
   sudo cp deploy/it-department-api.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now it-department-api
   ```

5. Confirm: `curl -sS http://127.0.0.1:4000/health`

The bundled unit uses **`WorkingDirectory=/opt/it-department/backend`** and **`ExecStart=/usr/bin/node dist/index.js`**. Adjust `User`/`WorkingDirectory` if your layout differs.

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

## 4. nginx

`scripts/setup-ubuntu.sh` writes a site that includes **`location /api/`** → **`http://127.0.0.1:4000`**. Ensure nothing else binds port **4000** except the API, or change both the unit’s implied port and nginx `proxy_pass`.

For HTTPS, set `server_name` and use certbot; keep the `/api/` block inside the TLS server.

## 5. Smoke check

With the API running:

```bash
cd backend && npm run smoke
```

With only the SPA: open the site, sign in on **`/login`**, and confirm grids load (bootstrap).
