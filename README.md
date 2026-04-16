# IT Department Portal

Internal operations portal: **Vite**, **React**, **TypeScript**, and **DevExtreme** (see [devextreme-template.md](./devextreme-template.md)). The UI is **locked behind JWT auth**: set **`VITE_API_BASE_URL`**, run the **backend** (`migrate` + `seed` with `SEED_SUPERADMIN_PASSWORD`), then sign in at **`/login`**. See [`.env.example`](./.env.example).

## Scripts

- `npm run dev` — local dev server (use `.env.example` → `.env.local` with `VITE_API_BASE_URL`; run **`backend`** on port 4000)
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — ESLint

**Backend** (`backend/`): `npm run dev`, `npm run migrate`, `npm run seed` (requires `SEED_SUPERADMIN_PASSWORD`; creates one superadmin user only). **`scripts/setup-ubuntu.sh`** writes **`.credentials-portal.env`** with the first superadmin password when MariaDB is installed.

## DevExtreme licensing (evaluation vs production)

- **Development / evaluation:** [`src/main.tsx`](src/main.tsx) calls `config({ licenseKey })` using [`src/config/license.ts`](src/config/license.ts) (defaults to the evaluation key unless `VITE_DEVEXTREME_LICENSE_KEY` is set). Optional evaluation UI mitigation runs via [`src/utils/hideDevExtremeWatermark.ts`](src/utils/hideDevExtremeWatermark.ts) and [`src/styles/devextreme-license-fix.css`](src/styles/devextreme-license-fix.css). Disable the runtime mitigation with `VITE_ENABLE_EVAL_WATERMARK_MITIGATION=false` (see below); remove the CSS import from `main.tsx` when it is no longer needed.
- **Production:** Purchase a **commercial DevExtreme** license and set **`VITE_DEVEXTREME_LICENSE_KEY`** at build time (see [DevExpress licensing documentation](https://js.devexpress.com/React/Documentation/Guide/Common/Licensing/)). Set **`VITE_ENABLE_EVAL_WATERMARK_MITIGATION=false`** and remove evaluation-only mitigation (CSS/JS above) when shipping a compliant bundle.

## Environment

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | When set (e.g. `http://127.0.0.1:4000/api/v1` or same-origin `/api/v1`), the SPA uses the REST API for bootstrap, mutations, and login. Omit for fully local mock data. |
| `VITE_DEVEXTREME_LICENSE_KEY` | Optional commercial DevExtreme license string for production builds (see [`src/config/license.ts`](src/config/license.ts)). |
| `VITE_ENABLE_EVAL_WATERMARK_MITIGATION` | If `false`, skips the runtime watermark helper in [`src/app/App.tsx`](src/app/App.tsx). Default is on (omit or any value except `false`). |

Local dev with the API: run `npm run dev` in the repo root and `npm run dev` in `backend/`; use `VITE_API_BASE_URL=/api/v1` — Vite proxies `/api` to port **4000** (see [`vite.config.ts`](vite.config.ts)).

Production with nginx: build with `VITE_API_BASE_URL=/api/v1` so the browser talks to the same host (see [`docs/deploy/PRODUCTION.md`](docs/deploy/PRODUCTION.md)).

Example `.env.production` when you are licensed and no longer need the helper:

```env
VITE_API_BASE_URL=/api/v1
VITE_DEVEXTREME_LICENSE_KEY=your-commercial-key-here
VITE_ENABLE_EVAL_WATERMARK_MITIGATION=false
```
