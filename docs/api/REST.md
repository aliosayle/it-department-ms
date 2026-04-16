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
| GET/POST | `/products` | **Reference** unique globally; **SKU** optional; **trackingMode** `quantity` \| `serialized` |
| GET/POST | `/storage-units` | FK `siteId`; custody bins require `personnelId` aligned to same site |

**POST bodies (implemented in Fastify):**

- **`POST /products`** — `{ "reference" (required), "sku"?, "name", "brand"?, "category"?, "description"?, "trackingMode"? }`.
  - `reference` is trimmed, required, and **unique** case-insensitively (**409** if duplicate).
  - `sku` is optional; when provided (non-empty after trim), it must be **unique** among rows with a non-null SKU (**409** if duplicate).
  - `trackingMode` defaults to `quantity`. Serialized products cannot use integer bulk receive on `POST /inventory/receive`; use `POST /inventory/receive-serialized` (or purchase receive, which generates placeholder identifiers per unit — see below).
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

Manual inbound receive for **quantity-tracked** products only.

**Body** (maps to `ReceiveStockInput`):

- `productId`, `storageUnitId`, `quantity` (≥ 1), `status`, `reason`, `note`
- Optional `purchaseId` — when set, movements must carry `purchase_id` for traceability

**Handler**

1. Validate product and storage exist; **reject** if product `tracking_mode` is `serialized` (use receive-serialized instead).
2. Upsert `stock_positions` for `(product_id, storage_unit_id)` (increment quantity; merge status rules as in product policy).
3. Insert `inventory_movements` row: positive `delta`, `reason`, `note`, optional `purchase_id`.

---

### `POST /inventory/receive-serialized`

Receive **serialized** units (MAC / serial) as rows in `serialized_assets` (no aggregate `stock_positions` row for that product at that bin).

**Body**

- `productId`, `storageUnitId`
- `identifiers`: string array (one asset per non-empty trimmed entry; duplicates rejected)
- `reason`, `note`
- Optional `purchaseId` for traceability

**Handler**

1. Validate product exists and `tracking_mode === serialized`; validate storage unit.
2. For each identifier: insert `serialized_assets` with global-unique `identifier`; insert `inventory_movements` with positive `delta`, `ref_asset_id`, optional `purchase_id`.

Returns **204** on success.

---

### `POST /inventory/transfer`

**Body** (maps to `TransferStockInput`):

- `fromStockPositionId`, `toStorageUnitId`, `quantity`, `note`

**Handler** (single transaction)

1. Load source position; ensure `quantity` ≤ on-hand; destination storage exists.
2. Reject if source storage unit equals destination storage unit.
3. Reject if the product is **serialized** (bulk transfer does not apply).
4. **Same site:** source and destination storage units must share the same `site_id` (cross-site transfers are rejected).
5. Decrement source position; remove row if quantity becomes 0.
6. Increment or insert destination `(same product_id, to_storage_unit_id)`.
7. Generate shared `correlation_id`; insert **two** movements: `transfer_out` (negative delta) and `transfer_in` (positive delta), both with same `correlation_id`, labels from/to storage.

---

### `POST /assignments`

Issue stock or a serialized asset to personnel (custody). Replaces the former `POST /deliveries` contract.

**Body** (maps to `CreateAssignmentInput`):

- `source`: `"stock"` \| `"external"`
- When `source === "stock"` (exactly one path):
  - **Quantity product:** `stockPositionId`, `quantity` (≥ 1), `serializedAssetId` null.
  - **Serialized product:** `serializedAssetId`, `quantity` must be **1**, `stockPositionId` null.
- `itemReceivedDate`, `itemDescription`, `deliveredTo`, `site`, `dateDelivered`, `description`
- `companyId`, `siteId`, `personnelId`

**Handler**

1. Validate company, site, personnel; personnel belongs to company and site.
2. If `source === "stock"` and **bulk**: require `stockPositionId`; validate quantity ≤ position; product must be quantity-tracked; stock position’s storage unit **`site_id`** must equal assignment `siteId`. Resolve recipient **custody** `storage_unit`.
3. If `source === "stock"` and **serialized**: require `serializedAssetId`; asset’s product must be serialized; asset must sit in non-custody storage at the same site; move asset row to custody storage; quantity forced to 1.
4. Insert `assignments` row (`stock_position_id` and/or `serialized_asset_id` as applicable).
5. Insert `inventory_movements` with `ref_assignment_id` (and `ref_asset_id` when serialized), e.g. `assignment_out` / `custody_in` legs for stock path.

Returns the created **assignment** JSON, including `assignedByUserId` (portal user who performed the assignment) so user-vs-employee responsibility stays explicit.

---

### `POST /purchases`

**Body** (maps to `CreatePurchaseInput`): header fields + `lines[]` with `productId`, `quantity`, `unitPrice`, `storageUnitId`.

**Handler**

1. Normalize `bonNumber`; enforce **unique (`company_id`, `bon_number`)** for the site’s company.
2. Validate supplier, site, each line product. **Issuer** (`issuedByPersonnelId`) must exist and their **`site_id` must equal the purchase `siteId`**. Each line’s **`storageUnitId`** must reference a storage unit whose **`site_id` equals the purchase `siteId`** (lines cannot target another site’s bins).
3. Insert `purchases` (`status` e.g. `ordered`) and `purchase_lines`.

---

### `POST /purchases/:id/receive`

Receive all lines (idempotent).

**Handler** (single transaction)

1. Load purchase; only **`status === ordered`** may be received; if `received` or `cancelled` → **409**.
2. Validate every line’s storage unit **`site_id` matches `purchases.site_id`** before posting.
3. For each line:
   - If product **`tracking_mode` is `serialized`**: create one serialized asset per unit via the same path as `receive-serialized`. Current implementation uses generated identifiers `PO-{purchaseLineId}-{n}` for each unit (MVP); replace with explicit identifiers in a future API if needed.
   - Else: same logic as `POST /inventory/receive` with `purchaseId` set, quantity from line, target `storageUnitId` from line, reason `Purchase`, note including bon / invoice / purchase id.
4. Set purchase `status = received`, `received_at = current_date`.

**Permission:** `POST /purchases/:id/receive` requires **`purchases` `edit`** (not create-only).

---

## Session and permissions

| Method | Path | Notes |
|--------|------|--------|
| GET | `/me` | Current user and effective `PageKey` permission map |
| POST | `/users` | Body `{ "login", "displayName", "password" }` (password min 10 chars). Requires `users` **create**. Returns `{ id, login, displayName }` with **201**. New user gets **deny-all** `user_page_permissions` rows (no implicit full access). |
| PATCH | `/users/:id/permissions` | Body `{ "permissions": { "<pageKey>": { "view", "edit", "delete", "create" } } }`; requires `users` **edit**. **403** if `:id` is the **authenticated user’s own id** (cannot change your own permissions via the API). |
| POST | `/roles` | Create/update role and `role_page_permissions` matrix. |
| PATCH | `/users/:id/access` | Assign `roleIds[]` plus per-user override matrix in `user_page_permission_overrides`. |
| POST | `/tasks` | Create review task (`pending_review`) with assignee/reviewer/due date. |
| POST | `/tasks/:id/review` | Reviewer decision: `approved` or `changes_requested`; writes `task_reviews` and task status. |
| POST | `/tasks/:id/attachments` | Upload attachment via JSON body `{ filename, mimeType, contentBase64 }` (safe type/size checks, max 5MB). |

The SPA uses `portalCreatePortalUser` / `portalUpdatePortalUser` (`src/api/mutations.ts`) when `VITE_API_BASE_URL` is set.

---

## OpenAPI

Generate `openapi.yaml` from handlers when the server stack is chosen (NestJS, .NET, etc.); keep field names aligned with TypeScript domain types for client generation.
