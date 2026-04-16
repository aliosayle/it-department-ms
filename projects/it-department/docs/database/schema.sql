-- IT Department portal — PostgreSQL schema (aligned with src/mocks/domain/types.ts)
-- Extensions optional: gen_random_uuid() requires pgcrypto or use uuid_generate_v4()

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------

CREATE TYPE purchase_status AS ENUM ('draft', 'ordered', 'received', 'cancelled');

CREATE TYPE delivery_source AS ENUM ('stock', 'external');

-- Free-text reasons also exist in the app; extend with CHECK or lookup table if needed.
CREATE TYPE receive_stock_reason AS ENUM (
  'Purchase',
  'Return',
  'Transfer',
  'Adjustment',
  'Other'
);

-- ---------------------------------------------------------------------------
-- Organization
-- ---------------------------------------------------------------------------

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- People & auth
-- ---------------------------------------------------------------------------

CREATE TABLE personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  company_id uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  site_id uuid NOT NULL REFERENCES sites (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  login text NOT NULL UNIQUE,
  subject text UNIQUE, -- OIDC sub or external auth key
  personnel_id uuid REFERENCES personnel (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Mirrors PageKey + PageCrud in the SPA (see src/auth/pageKeys.ts).
CREATE TABLE user_page_permissions (
  user_id uuid NOT NULL REFERENCES portal_users (id) ON DELETE CASCADE,
  page_key text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, page_key)
);

-- ---------------------------------------------------------------------------
-- Master data
-- ---------------------------------------------------------------------------

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_sku_unique UNIQUE (sku)
);

CREATE TABLE storage_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites (id) ON DELETE RESTRICT,
  code text NOT NULL,
  label text NOT NULL,
  kind text NOT NULL, -- e.g. warehouse, custody
  personnel_id uuid REFERENCES personnel (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storage_units_site_code_unique UNIQUE (site_id, code)
);

-- ---------------------------------------------------------------------------
-- Inventory positions & ledger
-- ---------------------------------------------------------------------------

CREATE TABLE stock_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  storage_unit_id uuid NOT NULL REFERENCES storage_units (id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity >= 0),
  status text NOT NULL DEFAULT 'Available',
  CONSTRAINT stock_positions_product_storage_unique UNIQUE (product_id, storage_unit_id)
);

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  note text NOT NULL DEFAULT '',
  ref_delivery_id uuid,
  ref_stock_position_id uuid,
  purchase_id uuid,
  personnel_id uuid REFERENCES personnel (id),
  correlation_id uuid, -- transfer pair legs
  from_storage_label text,
  to_storage_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_movements_product ON inventory_movements (product_id, occurred_at DESC);
CREATE INDEX idx_inventory_movements_correlation ON inventory_movements (correlation_id);

-- ---------------------------------------------------------------------------
-- Procurement
-- ---------------------------------------------------------------------------

CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  bon_number text NOT NULL,
  supplier_invoice_ref text NOT NULL DEFAULT '',
  supplier_id uuid NOT NULL REFERENCES suppliers (id) ON DELETE RESTRICT,
  issued_by_personnel_id uuid NOT NULL REFERENCES personnel (id) ON DELETE RESTRICT,
  site_id uuid NOT NULL REFERENCES sites (id) ON DELETE RESTRICT,
  ordered_at date NOT NULL,
  expected_at date,
  received_at date,
  status purchase_status NOT NULL DEFAULT 'draft',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  -- API must ensure sites.company_id = purchases.company_id for receipt context.
  CONSTRAINT purchases_bon_unique_per_company UNIQUE (company_id, bon_number)
);

CREATE TABLE purchase_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity >= 1),
  unit_price numeric(18, 4) NOT NULL CHECK (unit_price >= 0),
  storage_unit_id uuid NOT NULL REFERENCES storage_units (id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------------
-- Deliveries
-- ---------------------------------------------------------------------------

CREATE TABLE deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source delivery_source NOT NULL,
  stock_position_id uuid REFERENCES stock_positions (id),
  quantity integer NOT NULL CHECK (quantity >= 1),
  item_received_date date,
  item_description text NOT NULL DEFAULT '',
  delivered_to text NOT NULL DEFAULT '',
  site_label text NOT NULL DEFAULT '',
  date_delivered date NOT NULL,
  description text NOT NULL DEFAULT '',
  company_id uuid NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  site_id uuid NOT NULL REFERENCES sites (id) ON DELETE RESTRICT,
  personnel_id uuid NOT NULL REFERENCES personnel (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Assets (as in current seeds)
-- ---------------------------------------------------------------------------

CREATE TABLE user_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text NOT NULL DEFAULT '',
  form_factor text NOT NULL,
  brand text NOT NULL DEFAULT '',
  os_installed text NOT NULL DEFAULT '',
  specs text NOT NULL DEFAULT '',
  ip_addresses text NOT NULL DEFAULT '',
  mac_address text NOT NULL DEFAULT '',
  screen_accessories text NOT NULL DEFAULT '',
  printer_scanner_other text NOT NULL DEFAULT ''
);

CREATE TABLE network_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  details text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  serial_number text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT ''
);

-- ---------------------------------------------------------------------------
-- Reporting (mock analytics)
-- ---------------------------------------------------------------------------

CREATE TABLE product_report_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  period text NOT NULL,
  metric text NOT NULL,
  value numeric NOT NULL
);

-- ---------------------------------------------------------------------------
-- Auditing (corporate)
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES portal_users (id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id, created_at DESC);
