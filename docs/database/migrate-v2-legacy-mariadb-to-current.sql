-- =============================================================================
-- Portal DB: migrate legacy MariaDB layout → current (assignments, products
-- reference/SKU/tracking, serialized_assets, movement columns).
--
-- Intended for databases that still have `deliveries`, `ref_delivery_id`,
-- products without `reference`/`tracking_mode`, etc. Safe with **empty**
-- tables; if you already have rows, review the products backfill block.
--
-- Run once (idempotent): mysql ... < migrate-v2-legacy-mariadb-to-current.sql
-- Or: SOURCE migrate-v2-legacy-mariadb-to-current.sql;
-- =============================================================================

SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS portal_migrate_v2_legacy;

DELIMITER $$

CREATE PROCEDURE portal_migrate_v2_legacy()
BEGIN
  DECLARE db_name VARCHAR(64);
  DECLARE v INT;
  DECLARE v_del INT;
  DECLARE v_asg INT;
  DECLARE chk_name VARCHAR(256);

  SET db_name = DATABASE();

  SET FOREIGN_KEY_CHECKS = 0;

  -- ---------------------------------------------------------------------------
  -- RBAC: delivery → assignment
  -- ---------------------------------------------------------------------------
  UPDATE user_page_permissions SET page_key = 'assignment' WHERE page_key = 'delivery';

  -- ---------------------------------------------------------------------------
  -- serialized_assets (required before assignments FK)
  -- ---------------------------------------------------------------------------
  SELECT COUNT(*) INTO v
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'serialized_assets';

  IF v = 0 THEN
    CREATE TABLE serialized_assets (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      product_id VARCHAR(64) NOT NULL,
      identifier VARCHAR(191) NOT NULL,
      site_id VARCHAR(64) NOT NULL,
      storage_unit_id VARCHAR(64) NOT NULL,
      status VARCHAR(64) NOT NULL DEFAULT 'Available',
      created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      CONSTRAINT fk_serialized_assets_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
      CONSTRAINT fk_serialized_assets_site FOREIGN KEY (site_id) REFERENCES sites (id) ON DELETE RESTRICT,
      CONSTRAINT fk_serialized_assets_storage FOREIGN KEY (storage_unit_id) REFERENCES storage_units (id) ON DELETE RESTRICT,
      CONSTRAINT uq_serialized_assets_identifier UNIQUE (identifier)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  END IF;

  -- ---------------------------------------------------------------------------
  -- products: reference, nullable sku, tracking_mode, indexes
  -- ---------------------------------------------------------------------------
  SELECT COUNT(*) INTO v
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'products' AND COLUMN_NAME = 'reference';

  IF v = 0 THEN
    ALTER TABLE products
      ADD COLUMN reference VARCHAR(191) NULL AFTER id,
      ADD COLUMN tracking_mode ENUM('quantity', 'serialized') NOT NULL DEFAULT 'quantity' AFTER description;

    UPDATE products SET reference = sku WHERE reference IS NULL OR TRIM(COALESCE(reference, '')) = '';

    ALTER TABLE products
      MODIFY COLUMN reference VARCHAR(191) NOT NULL,
      MODIFY COLUMN sku VARCHAR(191) NULL;
  ELSE
    -- Already has reference; ensure tracking_mode exists
    SELECT COUNT(*) INTO v
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'products' AND COLUMN_NAME = 'tracking_mode';

    IF v = 0 THEN
      ALTER TABLE products
        ADD COLUMN tracking_mode ENUM('quantity', 'serialized') NOT NULL DEFAULT 'quantity' AFTER description;
    END IF;
  END IF;

  -- Drop UNIQUE on sku if present (keep non-unique index for lookup)
  SELECT INDEX_NAME INTO @sku_uniq
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = db_name
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'sku'
    AND NON_UNIQUE = 0
  LIMIT 1;

  IF @sku_uniq IS NOT NULL THEN
    SET @drop_uq := CONCAT('ALTER TABLE products DROP INDEX `', REPLACE(@sku_uniq, '`', '``'), '`');
    PREPARE dsq FROM @drop_uq;
    EXECUTE dsq;
    DEALLOCATE PREPARE dsq;
  END IF;

  SELECT COUNT(*) INTO v
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'products' AND INDEX_NAME = 'products_reference_unique';

  IF v = 0 THEN
    ALTER TABLE products ADD CONSTRAINT products_reference_unique UNIQUE (reference);
  END IF;

  SELECT COUNT(*) INTO v
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'products' AND INDEX_NAME = 'idx_products_sku';

  IF v = 0 THEN
    ALTER TABLE products ADD KEY idx_products_sku (sku);
  END IF;

  -- ---------------------------------------------------------------------------
  -- inventory_movements: ref_delivery_id → ref_assignment_id, ref_asset_id
  -- ---------------------------------------------------------------------------
  SELECT COUNT(*) INTO v
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'inventory_movements' AND COLUMN_NAME = 'ref_delivery_id';

  IF v > 0 THEN
    ALTER TABLE inventory_movements
      CHANGE COLUMN ref_delivery_id ref_assignment_id VARCHAR(64) NULL;
  END IF;

  SELECT COUNT(*) INTO v
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'inventory_movements' AND COLUMN_NAME = 'ref_asset_id';

  IF v = 0 THEN
    ALTER TABLE inventory_movements ADD COLUMN ref_asset_id VARCHAR(64) NULL AFTER ref_assignment_id;
  END IF;

  -- ---------------------------------------------------------------------------
  -- deliveries → assignments + serialized_asset_id + FK + CHECKs
  -- ---------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_del FROM information_schema.TABLES WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'deliveries';
  SELECT COUNT(*) INTO v_asg FROM information_schema.TABLES WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'assignments';

  IF v_del > 0 AND v_asg = 0 THEN
    RENAME TABLE deliveries TO assignments;
  END IF;

  SELECT COUNT(*) INTO v
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'assignments' AND COLUMN_NAME = 'serialized_asset_id';

  IF v = 0 THEN
    SELECT COUNT(*) INTO v_asg FROM information_schema.TABLES WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'assignments';
    IF v_asg > 0 THEN
      ALTER TABLE assignments
        ADD COLUMN serialized_asset_id VARCHAR(64) NULL AFTER stock_position_id;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'assignments' AND CONSTRAINT_NAME = 'fk_assignments_serialized_asset';

  IF v = 0 THEN
    SELECT COUNT(*) INTO v_asg FROM information_schema.TABLES WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'assignments';
    IF v_asg > 0 THEN
      ALTER TABLE assignments
        ADD CONSTRAINT fk_assignments_serialized_asset FOREIGN KEY (serialized_asset_id) REFERENCES serialized_assets (id);
    END IF;
  END IF;

  -- Drop every CHECK on assignments (legacy names differ), then add canonical checks.
  SELECT COUNT(*) INTO v_asg FROM information_schema.TABLES WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'assignments';
  IF v_asg > 0 THEN
    chk_drop_loop: WHILE TRUE DO
      SELECT MIN(tc.CONSTRAINT_NAME) INTO chk_name
      FROM information_schema.TABLE_CONSTRAINTS tc
      WHERE tc.TABLE_SCHEMA = db_name
        AND tc.TABLE_NAME = 'assignments'
        AND tc.CONSTRAINT_TYPE = 'CHECK';
      IF chk_name IS NULL THEN
        LEAVE chk_drop_loop;
      END IF;
      SET @drop_chk := CONCAT(
        'ALTER TABLE assignments DROP CONSTRAINT `',
        REPLACE(chk_name, '`', '``'),
        '`'
      );
      PREPARE dck FROM @drop_chk;
      EXECUTE dck;
      DEALLOCATE PREPARE dck;
    END WHILE chk_drop_loop;
  END IF;

  SELECT COUNT(*) INTO v
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'assignments' AND CONSTRAINT_NAME = 'chk_assignments_qty';

  IF v = 0 THEN
    SELECT COUNT(*) INTO v_asg FROM information_schema.TABLES WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'assignments';
    IF v_asg > 0 THEN
      ALTER TABLE assignments ADD CONSTRAINT chk_assignments_qty CHECK (quantity >= 1);
    END IF;
  END IF;

  SELECT COUNT(*) INTO v
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'assignments' AND CONSTRAINT_NAME = 'chk_assignments_stock_source';

  IF v = 0 THEN
    SELECT COUNT(*) INTO v_asg FROM information_schema.TABLES WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'assignments';
    IF v_asg > 0 THEN
      ALTER TABLE assignments
        ADD CONSTRAINT chk_assignments_stock_source CHECK (
          (source = 'external' AND stock_position_id IS NULL AND serialized_asset_id IS NULL)
          OR (
            source = 'stock'
            AND (
              (stock_position_id IS NOT NULL AND serialized_asset_id IS NULL)
              OR (serialized_asset_id IS NOT NULL AND stock_position_id IS NULL)
            )
          )
        );
    END IF;
  END IF;

  SET FOREIGN_KEY_CHECKS = 1;
END$$

DELIMITER ;

CALL portal_migrate_v2_legacy();
DROP PROCEDURE IF EXISTS portal_migrate_v2_legacy;

-- Optional: align non-check constraints / indexes with canonical names (no-op if already match)
-- CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements (product_id, occurred_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_inventory_movements_correlation ON inventory_movements (correlation_id);
