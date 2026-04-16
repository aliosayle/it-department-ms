# REST API — inventory and procurement

Base path: `/api/v1` (example). All request and response bodies are JSON unless noted.

Authentication: `Authorization: Bearer <access_token>` (see [../auth/RBAC.md](../auth/RBAC.md)).

Errors: `{ "error": "code", "message": "Human-readable detail" }`. **403** means the caller lacks permission for the attempted action (aligns with `PageGuard` in the SPA).

---

## Master data

| Method | Path | Notes |
|--------|------|--------|
| GET/POST | `/companies` | List / create |
| GET/PATCH/DELETE | `/companies/:id` | |
| GET/POST | `/sites` | FK `companyId` |
| GET/POST | `/personnel` | FK `companyId`, `siteId` |
| GET/POST | `/suppliers` | |
| GET/POST | `/products` | **SKU unique** globally |
| GET/POST | `/storage-units` | FK `siteId`; custody bins require `personnelId` aligned to same site |

---

## Inventory reads

| Method | Path | Notes |
|--------|------|--------|
| GET | `/stock/overview` | Aggregated positions (grid) |
| GET | `/stock/positions` | Optional filters: `storageUnitId`, `productId` |
| GET | `/products/:id/movements` | Ledger for product |

---

## Transactional writes (must be DB transactions)

### `POST /inventory/receive`

Manual inbound receive (non-purchase or purchase-linked via body).

**Body** (maps to `ReceiveStockInput`):

- `productId`, `storageUnitId`, `quantity` (≥ 1), `status`, `reason`, `note`
- Optional `purchaseId` — when set, movements must carry `purchase_id` for traceability

**Handler**

1. Validate product and storage exist; quantity integer ≥ 1.
2. Upsert `stock_positions` for `(product_id, storage_unit_id)` (increment quantity; merge status rules as in product policy).
3. Insert `inventory_movements` row: positive `delta`, `reason`, `note`, optional `purchase_id`.

---

### `POST /inventory/transfer`

**Body** (maps to `TransferStockInput`):

- `fromStockPositionId`, `toStorageUnitId`, `quantity`, `note`

**Handler** (single transaction)

1. Load source position; ensure `quantity` ≤ on-hand; destination storage exists.
2. Reject if source storage unit equals destination storage unit.
3. Decrement source position; remove row if quantity becomes 0.
4. Increment or insert destination `(same product_id, to_storage_unit_id)`.
5. Generate shared `correlation_id`; insert **two** movements: `transfer_out` (negative delta) and `transfer_in` (positive delta), both with same `correlation_id`, labels from/to storage.

---

### `POST /deliveries`

**Body** (maps to `CreateDeliveryInput`).

**Handler**

1. Validate company, site, personnel; personnel belongs to company and site.
2. If `source === "stock"`: require `stockPositionId`; validate quantity ≤ position; resolve recipient **custody** `storage_unit` (`kind = custody`, `personnel_id` = recipient).
3. Insert `deliveries` row.
4. If `source === "stock"` in one transaction:
   - Decrement warehouse `stock_positions` row; strip if zero.
   - Increment or create custody `stock_positions` for same product (status e.g. `Issued`).
   - Insert movements: `delivery_out` (negative, `ref_delivery_id`, `ref_stock_position_id` = warehouse position) and `custody_in` (positive, custody position), timestamps ordered for statement sorting.

If `source === "external"`, no stock mutation; optional movements off-scope unless you model non-stock receipts separately.

---

### `POST /purchases`

**Body** (maps to `CreatePurchaseInput`): header fields + `lines[]` with `productId`, `quantity`, `unitPrice`, `storageUnitId`.

**Handler**

1. Normalize `bonNumber`; enforce **unique (`company_id`, `bon_number`)** for the site’s company.
2. Validate supplier, issuer personnel, site, each line product and storage.
3. Insert `purchases` (`status` e.g. `ordered`) and `purchase_lines`.

---

### `POST /purchases/:id/receive`

Receive all lines into stock (idempotent).

**Handler** (single transaction)

1. Load purchase; if `status === received` → **409 Conflict** or idempotent **204** (pick one policy; SPA today treats as error on second receive).
2. If `cancelled` → 409.
3. For each line: apply the same logic as `POST /inventory/receive` with `purchaseId` set, quantity from line, target `storageUnitId` from line, reason `Purchase`, note including bon / invoice / purchase id.
4. Set purchase `status = received`, `received_at = current_date`.

---

## Session and permissions

| Method | Path | Notes |
|--------|------|--------|
| GET | `/me` | Current user and effective `PageKey` permission map |
| POST | `/users` | Body `{ "login", "displayName", "password" }` (password min 10 chars). Requires `users` **create**. Returns `{ id, login, displayName }` with **201**. New user gets **deny-all** `user_page_permissions` rows (no implicit full access). |
| PATCH | `/users/:id/permissions` | Body `{ "permissions": { "<pageKey>": { "view", "edit", "delete", "create" } } }`; requires `users` **edit**. **403** if `:id` is the **authenticated user’s own id** (cannot change your own permissions via the API). |

The SPA uses `portalCreatePortalUser` / `portalUpdatePortalUser` (`src/api/mutations.ts`) when `VITE_API_BASE_URL` is set.

---

## OpenAPI

Generate `openapi.yaml` from handlers when the server stack is chosen (NestJS, .NET, etc.); keep field names aligned with TypeScript domain types for client generation.
