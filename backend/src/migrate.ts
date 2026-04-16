import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { config } from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.join(__dirname, '..', '..', 'docs', 'database', 'schema-mariadb.sql')

/** Split canonical schema file into executable statements (avoids multi-statement batch quirks in some clients). */
function splitSchemaStatements(sql: string): string[] {
  const stripped = sql.replace(/^\s*--.*$/gm, '')
  return stripped
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

async function main() {
  const sql = fs.readFileSync(schemaPath, 'utf8')
  const statements = splitSchemaStatements(sql)
  if (statements.length === 0) {
    throw new Error(`No SQL statements parsed from ${schemaPath}`)
  }

  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: false,
  })
  try {
    let i = 0
    for (const raw of statements) {
      i += 1
      await conn.query(`${raw};`)
    }
    console.log('Migration applied:', schemaPath, `(${i} statements)`)

    const db = config.db.database
    const [rows] = await conn.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      [db, 'portal_users'],
    )
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(
        `Migration incomplete: table portal_users is missing in database "${db}" (check DATABASE_* in backend/.env and re-run: npm run migrate)`,
      )
    }
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
