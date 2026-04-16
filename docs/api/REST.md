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
| GET/POST | `/suppliers` | **POST** requires non-empty `name`; other fields optional strings |
| GET/POST | `/products` | **SKU unique** globally |
| GET/POST | `/storage-units` | FK `siteId`; custody bins require `personnelId` aligned to same site |

**POST bodies (implemented in Fastify):**

- **`POST /products`** — `{ "sku", "name", "brand"?, "category"?, "description"? }`. SKU is unique case-insensitively; **409** if duplicate.
- **`POST /storage-units`** — `{ "siteId", "code", "label", "kind"?, "personnelId"? }`. Default `kind` is `shelf`. For `kind: "custody"`, `personnelId` is required and that person must belong to `siteId`. **409** if `(siteId, code)` duplicate.

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
3. **Same site:** source and destination storage units must share the same `site_id` (cross-site transfers are rejected).
4. Decrement source position; remove row if quantity becomes 0.
5. Increment or insert destination `(same product_id, to_storage_unit_id)`.
6. Generate shared `correlation_id`; insert **two** movements: `transfer_out` (negative delta) and `transfer_in` (positive delta), both with same `correlation_id`, labels from/to storage.

---

### `POST /deliveries`

**Body** (maps to `CreateDeliveryInput`).

**Handler**

1. Validate company, site, personnel; personnel belongs to company and site.
2. If `source === "stock"`: require `stockPositionId`; validate quantity ≤ position; the stock position’s **storage unit** must have **`site_id` equal to the delivery `siteId`** (no cross-site issuance from warehouse bins). Resolve recipient **custody** `storage_unit` (`kind = custody`, `personnel_id` = recipient).
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
2. Validate supplier, site, each line product. **Issuer** (`issuedByPersonnelId`) must exist and their **`site_id` must equal the purchase `siteId`**. Each line’s **`storageUnitId`** must reference a storage unit whose **`site_id` equals the purchase `siteId`** (lines cannot target another site’s bins).
3. Insert `purchases` (`status` e.g. `ordered`) and `purchase_lines`.

---

### `POST /purchases/:id/receive`

Receive all lines into stock (idempotent).

**Handler** (single transaction)

1. Load purchase; only **`status === ordered`** may be received; if `received` or `cancelled` → **409**. (If `draft` exists in the schema, it is not receivable until promoted to `ordered`.)
2. Validate every line’s storage unit **`site_id` matches `purchases.site_id`** before posting (defensive; lines should already match from create).
3. For each line: apply the same logic as `POST /inventory/receive` with `purchaseId` set, quantity from line, target `storageUnitId` from line, reason `Purchase`, note including bon / invoice / purchase id.
4. Set purchase `status = received`, `received_at = current_date`.

**Permission:** `POST /purchases/:id/receive` requires **`purchases` `edit`** (not create-only).

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
