import test from 'node:test'
import assert from 'node:assert/strict'
import { denyAll, type PageCrud, type PageKey } from './pageKeys.js'

function merge(role: Record<PageKey, PageCrud>, legacy: Record<PageKey, PageCrud>, overrides: Record<PageKey, PageCrud>) {
  const out = denyAll()
  for (const k of Object.keys(out) as PageKey[]) out[k] = { ...out[k], ...role[k] }
  for (const k of Object.keys(out) as PageKey[]) out[k] = {
    view: out[k].view || legacy[k].view,
    edit: out[k].edit || legacy[k].edit,
    delete: out[k].delete || legacy[k].delete,
    create: out[k].create || legacy[k].create,
  }
  for (const k of Object.keys(out) as PageKey[]) out[k] = overrides[k] ?? out[k]
  return out
}

test('override beats role + legacy', () => {
  const role = denyAll(); role.users.view = true
  const legacy = denyAll(); legacy.users.edit = true
  const overrides = denyAll(); overrides.users = { view: false, edit: false, delete: false, create: false }
  const effective = merge(role, legacy, overrides)
  assert.equal(effective.users.view, false)
  assert.equal(effective.users.edit, false)
})
