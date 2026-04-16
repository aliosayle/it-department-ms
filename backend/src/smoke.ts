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
  const snap = (await br.json()) as { companies?: unknown[]; users?: Array<{ id: string }> }
  if (!Array.isArray(snap.companies)) throw new Error('bootstrap missing companies')
  if (!Array.isArray(snap.users) || !snap.users[0]?.id) throw new Error('bootstrap missing users')

  const roleRes = await fetch(`${base}/api/v1/roles`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `SmokeRole-${Date.now()}`,
      description: 'smoke',
      permissions: {
        dashboard: { view: true, edit: false, delete: false, create: false },
      },
    }),
  })
  if (!roleRes.ok) throw new Error(`role create ${roleRes.status} ${await roleRes.text()}`)

  const taskRes = await fetch(`${base}/api/v1/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `Smoke task ${Date.now()}`,
      description: 'smoke test',
      assignedToUserId: snap.users[0].id,
      reviewerUserId: snap.users[0].id,
    }),
  })
  if (!taskRes.ok) throw new Error(`task create ${taskRes.status} ${await taskRes.text()}`)
  console.log('smoke ok: health, login, bootstrap, roles, tasks')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
