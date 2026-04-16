import { config } from './config.js'

const base = `http://127.0.0.1:${config.port}`

async function main() {
  const h = await fetch(`${base}/health`)
  if (!h.ok) throw new Error(`health ${h.status}`)
  const login = process.env.SMOKE_LOGIN ?? 'superadmin'
  const password = process.env.SMOKE_PASSWORD
  if (!password) throw new Error('Set SMOKE_PASSWORD (same as SEED_SUPERADMIN_PASSWORD / .credentials-portal.env)')
  const lr = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  })
  if (!lr.ok) throw new Error(`login ${lr.status} ${await lr.text()}`)
  const { accessToken } = (await lr.json()) as { accessToken: string }
  const br = await fetch(`${base}/api/v1/bootstrap`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!br.ok) throw new Error(`bootstrap ${br.status} ${await br.text()}`)
  const snap = (await br.json()) as { companies?: unknown[] }
  if (!Array.isArray(snap.companies)) throw new Error('bootstrap missing companies')
  console.log('smoke ok: health, login, bootstrap')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
