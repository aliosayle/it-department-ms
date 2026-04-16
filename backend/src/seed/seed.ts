import mysql from 'mysql2/promise'
import bcrypt from 'bcrypt'
import { config } from '../config.js'

const TABLES = [
  'user_page_permissions',
  'audit_log',
  'inventory_movements',
  'stock_positions',
  'purchase_lines',
  'purchases',
  'deliveries',
  'product_report_rows',
  'portal_users',
  'user_equipment',
  'network_devices',
  'storage_units',
  'personnel',
  'products',
  'suppliers',
  'sites',
  'companies',
] as const

const SUPER_ID = 'u-superadmin'

async function main() {
  const login = (process.env.SEED_SUPERADMIN_LOGIN ?? 'superadmin').trim()
  const password = process.env.SEED_SUPERADMIN_PASSWORD?.trim()
  if (!password) {
    console.error('SEED_SUPERADMIN_PASSWORD is required (no default in production).')
    process.exit(1)
  }
  if (login.length < 1) {
    console.error('SEED_SUPERADMIN_LOGIN must be non-empty.')
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 12)

  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  })

  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const t of TABLES) {
      await conn.query(`TRUNCATE TABLE \`${t}\``)
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1')

    await conn.query(
      'INSERT INTO portal_users (id, display_name, login, password_hash, subject, personnel_id) VALUES (?,?,?,?,NULL,NULL)',
      [SUPER_ID, 'Super administrator', login, hash],
    )

    console.log(`Seed complete: single portal user login="${login}" id=${SUPER_ID} (full access; no rows in user_page_permissions).`)
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
