# Authentication and RBAC

## Goals

- Authenticate operators via **OIDC** (Microsoft Entra ID, Keycloak, …) or **JWT access tokens** issued by your API.
- Authorize every **mutating** HTTP route using the same matrix the SPA uses: `PageKey` × `{ view, edit, delete, create }` (`src/mocks/domain/types.ts`, `src/auth/pageKeys.ts`).
- Return **403** when the matrix denies an action so the UI can match `PageGuard` / access-denied messaging.

---

## Database model

Table `user_page_permissions` (see `docs/database/schema.sql`):

| Column | Type | Meaning |
|--------|------|--------|
| `user_id` | uuid | FK `portal_users` |
| `page_key` | text | One of `ALL_PAGE_KEYS` (e.g. `stockReceive`, `purchases`) |
| `can_view` | boolean | Read routes |
| `can_edit` | boolean | Updates / state changes not covered by create |
| `can_delete` | boolean | Deletes |
| `can_create` | boolean | Creates and **receive-style** actions that add ledger rows |

Primary key `(user_id, page_key)`.

On login, resolve `portal_users` by `sub` (OIDC) or `login` (legacy). Load all rows for that user into a permission map; default missing keys to **deny all** (`mergeFromPartial` behavior in `pageKeys.ts`).

---

## JWT / OIDC claims (suggested)

Short-lived access token custom claims (example):

```json
{
  "sub": "uuid-or-oidc-subject",
  "permissions": {
    "stockReceive": { "view": true, "edit": false, "delete": false, "create": true },
    "purchases": { "view": true, "edit": true, "delete": false, "create": true }
  }
}
```

Alternatively, omit the bulky claim and load permissions from DB on each request (cached per user). Refresh when admin updates `user_page_permissions` via `PATCH /users/:id/permissions` (admin-only `users` page with `edit`).

---

## Route → PageKey → required action

| HTTP | Example route | PageKey | Required flag |
|------|----------------|----------|----------------|
| POST | `/inventory/receive` | `stockReceive` | `create` |
| POST | `/inventory/transfer` | `stockTransfer` | `create` |
| POST | `/deliveries` | `delivery` | `create` |
| POST | `/purchases` | `purchases` | `create` |
| POST | `/purchases/:id/receive` | `purchases` | `create` |
| GET | `/stock/overview` | `stock` | `view` |
| PATCH | `/users/:id/permissions` | `users` | `edit` |

**Rule:** every handler that changes data must call `assertPermission(pageKey, 'create' | 'edit' | 'delete')` before opening a transaction. Read endpoints use `view`.

---

## SPA alignment

- **Route guard:** `PageGuard` hides pages when `view` is false (`src/auth/PageGuard.tsx`).
- **API guard:** server returns **403** for the same matrix; `notifyApiForbidden` + `ApiForbiddenBridge` navigate to `/access-denied` with `state.reason === 'api'` (see `src/api/ApiForbiddenBridge.tsx`, `src/api/http.ts`).
- Keep `ALL_PAGE_KEYS` in sync between client and server (shared package or OpenAPI-generated enum).

---

## Auditing

Log denials (403) and successful mutations to `audit_log` with actor, IP, entity, and optional before/after JSON.
