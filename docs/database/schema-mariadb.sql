-- IT Department portal — MariaDB / MySQL schema (aligned with docs/database/schema.sql)
-- Target: MariaDB 10.6+ (Ubuntu 22.04+) with utf8mb4

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- Organization
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sites (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  company_id VARCHAR(36) NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_sites_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personnel (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_id VARCHAR(36) NOT NULL,
  site_id VARCHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_personnel_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
  CONSTRAINT fk_personnel_site FOREIGN KEY (site_id) REFERENCES sites (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_users (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  display_name TEXT NOT NULL,
  login VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NULL,
  personnel_id VARCHAR(36) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT uq_portal_users_login UNIQUE (login),
  CONSTRAINT uq_portal_users_subject UNIQUE (subject),
  CONSTRAINT fk_portal_users_personnel FOREIGN KEY (personnel_id) REFERENCES personnel (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_page_permissions (
  user_id VARCHAR(36) NOT NULL,
  page_key VARCHAR(64) NOT NULL,
  can_view TINYINT(1) NOT NULL DEFAULT 0,
  can_edit TINYINT(1) NOT NULL DEFAULT 0,
  can_delete TINYINT(1) NOT NULL DEFAULT 0,
  can_create TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, page_key),
  CONSTRAINT fk_user_page_permissions_user FOREIGN KEY (user_id) REFERENCES portal_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  sku VARCHAR(191) NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT products_sku_unique UNIQUE (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS storage_units (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  site_id VARCHAR(36) NOT NULL,
  code VARCHAR(255) NOT NULL,
  label TEXT NOT NULL,
  kind VARCHAR(64) NOT NULL,
  personnel_id VARCHAR(36) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_storage_units_site FOREIGN KEY (site_id) REFERENCES sites (id) ON DELETE RESTRICT,
  CONSTRAINT fk_storage_units_personnel FOREIGN KEY (personnel_id) REFERENCES personnel (id),
  CONSTRAINT storage_units_site_code_unique UNIQUE (site_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_positions (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  product_id VARCHAR(36) NOT NULL,
  storage_unit_id VARCHAR(36) NOT NULL,
  quantity INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Available',
  CONSTRAINT fk_stock_positions_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
  CONSTRAINT fk_stock_positions_storage FOREIGN KEY (storage_unit_id) REFERENCES storage_units (id) ON DELETE RESTRICT,
  CONSTRAINT stock_positions_product_storage_unique UNIQUE (product_id, storage_unit_id),
  CONSTRAINT chk_stock_positions_qty CHECK (quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  product_id VARCHAR(36) NOT NULL,
  occurred_at DATETIME(6) NOT NULL,
  delta INT NOT NULL,
  reason TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  ref_delivery_id VARCHAR(36) NULL,
  ref_stock_position_id VARCHAR(36) NULL,
  purchase_id VARCHAR(36) NULL,
  personnel_id VARCHAR(36) NULL,
  correlation_id VARCHAR(36) NULL,
  from_storage_label TEXT NULL,
  to_storage_label TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_inventory_movements_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_movements_personnel FOREIGN KEY (personnel_id) REFERENCES personnel (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_inventory_movements_product ON inventory_movements (product_id, occurred_at DESC);
CREATE INDEX idx_inventory_movements_correlation ON inventory_movements (correlation_id);

CREATE TABLE IF NOT EXISTS purchases (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  company_id VARCHAR(36) NOT NULL,
  bon_number VARCHAR(512) NOT NULL,
  supplier_invoice_ref TEXT NOT NULL DEFAULT '',
  supplier_id VARCHAR(36) NOT NULL,
  issued_by_personnel_id VARCHAR(36) NOT NULL,
  site_id VARCHAR(36) NOT NULL,
  ordered_at DATE NOT NULL,
  expected_at DATE NULL,
  received_at DATE NULL,
  status ENUM('draft', 'ordered', 'received', 'cancelled') NOT NULL DEFAULT 'draft',
  notes TEXT NOT NULL DEFAULT '',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_purchases_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchases_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchases_issuer FOREIGN KEY (issued_by_personnel_id) REFERENCES personnel (id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchases_site FOREIGN KEY (site_id) REFERENCES sites (id) ON DELETE RESTRICT,
  CONSTRAINT purchases_bon_unique_per_company UNIQUE (company_id, bon_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_lines (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  purchase_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(18, 4) NOT NULL,
  storage_unit_id VARCHAR(36) NOT NULL,
  CONSTRAINT fk_purchase_lines_purchase FOREIGN KEY (purchase_id) REFERENCES purchases (id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_lines_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_lines_storage FOREIGN KEY (storage_unit_id) REFERENCES storage_units (id) ON DELETE RESTRICT,
  CONSTRAINT chk_purchase_lines_qty CHECK (quantity >= 1),
  CONSTRAINT chk_purchase_lines_price CHECK (unit_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS deliveries (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  source ENUM('stock', 'external') NOT NULL,
  stock_position_id VARCHAR(36) NULL,
  quantity INT NOT NULL,
  item_received_date DATE NULL,
  item_description TEXT NOT NULL,
  delivered_to TEXT NOT NULL,
  site_label TEXT NOT NULL,
  date_delivered DATE NOT NULL,
  description TEXT NOT NULL,
  company_id VARCHAR(36) NOT NULL,
  site_id VARCHAR(36) NOT NULL,
  personnel_id VARCHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_deliveries_stock_pos FOREIGN KEY (stock_position_id) REFERENCES stock_positions (id),
  CONSTRAINT fk_deliveries_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
  CONSTRAINT fk_deliveries_site FOREIGN KEY (site_id) REFERENCES sites (id) ON DELETE RESTRICT,
  CONSTRAINT fk_deliveries_personnel FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE RESTRICT,
  CONSTRAINT chk_deliveries_qty CHECK (quantity >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_equipment (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  form_factor TEXT NOT NULL,
  brand TEXT NOT NULL,
  os_installed TEXT NOT NULL,
  specs TEXT NOT NULL,
  ip_addresses TEXT NOT NULL,
  mac_address TEXT NOT NULL,
  screen_accessories TEXT NOT NULL,
  printer_scanner_other TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS network_devices (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  type TEXT NOT NULL,
  details TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  location TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_report_rows (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  product_id VARCHAR(36) NOT NULL,
  period TEXT NOT NULL,
  metric TEXT NOT NULL,
  value DECIMAL(18, 4) NOT NULL,
  CONSTRAINT fk_product_report_rows_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  actor_user_id VARCHAR(36) NULL,
  action TEXT NOT NULL,
  entity_type VARCHAR(128) NOT NULL,
  entity_id VARCHAR(36) NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  ip VARCHAR(45) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_audit_log_actor FOREIGN KEY (actor_user_id) REFERENCES portal_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id, created_at DESC);

SET FOREIGN_KEY_CHECKS = 1;
