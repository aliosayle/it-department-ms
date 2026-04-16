# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] — 2026-04-16

### Added

- **MariaDB v1 schema** in `docs/database/schema-mariadb.sql` (VARCHAR(64) string IDs, `portal_users.password_hash`).
- **Node API** under `backend/`: Fastify, JWT login/refresh/me, RBAC from `user_page_permissions`, bootstrap snapshot and transactional writes aligned with `docs/api/REST.md` and `src/mocks/mockStore.ts`.
- **Migrations and seed**: `npm run migrate` / `npm run seed` (JSON seeds from `src/mocks/*.seed.json`, default portal password `changeme` unless `SEED_DEFAULT_PASSWORD` is set).
- **SPA data layer**: React Query bootstrap when `VITE_API_BASE_URL` is set; mutations invalidate `bootstrap` instead of full reload.
- **Auth UI**: `/login`, token storage, session gate, **Sign out** in the shell; mock-only user switcher when the API URL is unset.
- **Deploy**: nginx `/api/` proxy in `scripts/setup-ubuntu.sh`, `deploy/it-department-api.service`, and `docs/deploy/PRODUCTION.md`.

### Changed

- **DevExtreme license** can be supplied at build time via `VITE_DEVEXTREME_LICENSE_KEY` (`src/config/license.ts`).
