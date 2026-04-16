import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import bcrypt from 'bcrypt'
import type { RowDataPacket } from 'mysql2/promise'
import { config } from './config.js'
import { pool } from './db.js'
import { signAccess, signRefresh, verifyToken } from './authJwt.js'
import { loadBootstrapSnapshot, getUserPermissions, assertPermission } from './bootstrapRepo.js'
import type { PageCrud, PageKey } from './pageKeys.js'
import { receiveSerializedTx, receiveStockTx, transferStockTx } from './inventoryWrites.js'
import { createAssignmentTx, createPurchaseTx, receivePurchaseTx } from './procurementWrites.js'
import {
  insertCompany,
  insertPersonnel,
  insertPortalUser,
  insertProduct,
  insertSite,
  insertStorageUnit,
  insertSupplier,
  replaceUserPermissions,
} from './masterDataWrites.js'

type AuthContext = { userId: string; login: string; perms: Record<PageKey, PageCrud> }

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext
  }
}

async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'unauthorized', message: 'Missing token' })
  }
  try {
    const p = verifyToken(h.slice(7))
    if (p.typ !== 'access') {
      return reply.code(401).send({ error: 'unauthorized', message: 'Invalid token type' })
    }
    const perms = await getUserPermissions(p.sub)
    req.auth = { userId: p.sub, login: p.login, perms }
  } catch {
    return reply.code(401).send({ error: 'unauthorized', message: 'Invalid token' })
  }
}

export async function buildApp() {
  const app = Fastify({ logger: true })

  const corsRaw = config.corsOrigin.trim()
  const corsOriginOpt: boolean | string[] =
    corsRaw === '*' ? true : corsRaw.split(',').map((s) => s.trim()).filter((s) => s.length > 0)

  await app.register(cors, {
    origin: corsOriginOpt,
    credentials: true,
  })

  app.setErrorHandler((err, _req, reply) => {
    const e = err instanceof Error ? err : new Error(String(err))
    const status = (e as Error & { statusCode?: number }).statusCode ?? 500
    const code = status === 403 ? 'forbidden' : status === 400 ? 'bad_request' : 'error'
    if (status >= 500) app.log.error(e)
    return reply.code(status).send({ error: code, message: e.message || 'Server error' })
  })

  app.get('/health', async () => ({ ok: true }))

  app.register(
    async (r) => {
      r.post('/auth/login', async (req, reply) => {
        const body = req.body as { login?: string; password?: string }
        const login = (body?.login ?? '').trim()
        const password = body?.password ?? ''
        if (!login || !password) {
          return reply.code(400).send({ error: 'bad_request', message: 'login and password required' })
        }
        const [rows] = await pool.query<RowDataPacket[]>('SELECT id, login, display_name, password_hash FROM portal_users WHERE login = ?', [
          login,
        ])
        const u = rows[0] as RowDataPacket | undefined
        const hash = u?.password_hash != null ? String(u.password_hash) : ''
        if (!u || !hash) {
          return reply.code(401).send({ error: 'unauthorized', message: 'Invalid credentials' })
        }
        const ok = await bcrypt.compare(password, hash)
        if (!ok) return reply.code(401).send({ error: 'unauthorized', message: 'Invalid credentials' })
        const uid = String(u.id)
        const ulogin = String(u.login)
        const permissions = await getUserPermissions(uid)
        const accessToken = signAccess({ sub: uid, login: ulogin })
        const refreshToken = signRefresh({ sub: uid, login: ulogin })
        return {
          accessToken,
          refreshToken,
          user: {
            id: uid,
            login: ulogin,
            displayName: String(u.display_name ?? ''),
            permissions,
          },
        }
      })

      r.post('/auth/refresh', async (req, reply) => {
        const body = req.body as { refreshToken?: string }
        const token = body?.refreshToken
        if (!token) {
          return reply.code(400).send({ error: 'bad_request', message: 'refreshToken required' })
        }
        try {
          const p = verifyToken(token)
          if (p.typ !== 'refresh') {
            return reply.code(401).send({ error: 'unauthorized', message: 'Invalid token type' })
          }
          const accessToken = signAccess({ sub: p.sub, login: p.login })
          return { accessToken }
        } catch {
          return reply.code(401).send({ error: 'unauthorized', message: 'Invalid refresh token' })
        }
      })

      r.get('/me', { preHandler: requireAuth }, async (req) => {
        const [urows] = await pool.query<RowDataPacket[]>('SELECT display_name, login FROM portal_users WHERE id = ?', [
          req.auth!.userId,
        ])
        const r = urows[0] as RowDataPacket | undefined
        return {
          user: {
            id: req.auth!.userId,
            login: r?.login != null ? String(r.login) : req.auth!.login,
            displayName: r?.display_name != null ? String(r.display_name) : '',
            permissions: req.auth!.perms,
          },
        }
      })

      r.get('/bootstrap', { preHandler: requireAuth }, async () => loadBootstrapSnapshot())

      r.post('/inventory/receive', { preHandler: requireAuth }, async (req, reply) => {
        assertPermission(req.auth!.perms, 'stockReceive', 'create')
        const b = req.body as Record<string, unknown>
        const result = await receiveStockTx(pool, {
          productId: String(b.productId ?? ''),
          storageUnitId: String(b.storageUnitId ?? ''),
          quantity: Number(b.quantity),
          status: String(b.status ?? 'Available'),
          reason: String(b.reason ?? ''),
          note: String(b.note ?? ''),
          purchaseId: (b.purchaseId as string | null | undefined) ?? null,
        })
        if (!result.ok) return reply.code(400).send({ error: 'bad_request', message: result.error })
        return reply.code(204).send()
      })

      r.post('/inventory/receive-serialized', { preHandler: requireAuth }, async (req, reply) => {
        assertPermission(req.auth!.perms, 'stockReceive', 'create')
        const b = req.body as Record<string, unknown>
        const ids = Array.isArray(b.identifiers) ? (b.identifiers as unknown[]).map((x) => String(x ?? '')) : []
        const result = await receiveSerializedTx(pool, {
          productId: String(b.productId ?? ''),
          storageUnitId: String(b.storageUnitId ?? ''),
          identifiers: ids,
          reason: String(b.reason ?? 'Other'),
          note: String(b.note ?? ''),
          purchaseId: (b.purchaseId as string | null | undefined) ?? null,
        })
        if (!result.ok) return reply.code(400).send({ error: 'bad_request', message: result.error })
        return reply.code(204).send()
      })

      r.post('/inventory/transfer', { preHandler: requireAuth }, async (req, reply) => {
        assertPermission(req.auth!.perms, 'stockTransfer', 'create')
        const b = req.body as Record<string, unknown>
        const result = await transferStockTx(pool, {
          fromStockPositionId: String(b.fromStockPositionId ?? ''),
          toStorageUnitId: String(b.toStorageUnitId ?? ''),
          quantity: Number(b.quantity),
          note: String(b.note ?? ''),
        })
        if (!result.ok) return reply.code(400).send({ error: 'bad_request', message: result.error })
        return reply.code(204).send()
      })

      r.post('/assignments', { preHandler: requireAuth }, async (req, reply) => {
        assertPermission(req.auth!.perms, 'assignment', 'create')
        const b = req.body as Record<string, unknown>
        const result = await createAssignmentTx(pool, {
          source: b.source === 'external' ? 'external' : 'stock',
          stockPositionId: (b.stockPositionId as string | null) ?? null,
          serializedAssetId: (b.serializedAssetId as string | null) ?? null,
          quantity: Number(b.quantity),
          itemReceivedDate: (b.itemReceivedDate as string | null) ?? null,
          itemDescription: String(b.itemDescription ?? ''),
          deliveredTo: String(b.deliveredTo ?? ''),
          site: String(b.site ?? ''),
          dateDelivered: String(b.dateDelivered ?? ''),
          description: String(b.description ?? ''),
          companyId: String(b.companyId ?? ''),
          siteId: String(b.siteId ?? ''),
          personnelId: String(b.personnelId ?? ''),
        })
        if (!result.ok) return reply.code(400).send({ error: 'bad_request', message: result.error })
        return result.assignment
      })

      r.post('/purchases', { preHandler: requireAuth }, async (req, reply) => {
        assertPermission(req.auth!.perms, 'purchases', 'create')
        const b = req.body as Record<string, unknown>
        const lines = Array.isArray(b.lines) ? b.lines : []
        const result = await createPurchaseTx(pool, {
          bonNumber: String(b.bonNumber ?? ''),
          supplierInvoiceRef: String(b.supplierInvoiceRef ?? ''),
          supplierId: String(b.supplierId ?? ''),
          issuedByPersonnelId: String(b.issuedByPersonnelId ?? ''),
          siteId: String(b.siteId ?? ''),
          orderedAt: String(b.orderedAt ?? ''),
          expectedAt: (b.expectedAt as string | null) ?? null,
          notes: String(b.notes ?? ''),
          lines: lines.map((l) => {
            const x = l as Record<string, unknown>
            return {
              productId: String(x.productId ?? ''),
              quantity: Number(x.quantity),
              unitPrice: Number(x.unitPrice),
              storageUnitId: String(x.storageUnitId ?? ''),
            }
          }),
        })
        if (!result.ok) return reply.code(400).send({ error: 'bad_request', message: result.error })
        return result.purchase
      })

      r.post<{ Params: { id: string } }>('/purchases/:id/receive', { preHandler: requireAuth }, async (req, reply) => {
        assertPermission(req.auth!.perms, 'purchases', 'edit')
        const result = await receivePurchaseTx(pool, req.params.id)
        if (!result.ok) {
          const msg = result.error
          const code = msg.includes('already received') ? 409 : 400
          return reply.code(code).send({ error: code === 409 ? 'conflict' : 'bad_request', message: msg })
        }
        return reply.code(204).send()
      })

      r.post('/companies', { preHandler: requireAuth }, async (req) => {
        assertPermission(req.auth!.perms, 'companies', 'create')
        const b = req.body as { name?: string; notes?: string }
        return insertCompany(pool, String(b.name ?? ''), String(b.notes ?? ''))
      })

      r.post('/sites', { preHandler: requireAuth }, async (req, reply) => {
        assertPermission(req.auth!.perms, 'sites', 'create')
        const b = req.body as { companyId?: string; name?: string; location?: string }
        try {
          return await insertSite(pool, String(b.companyId ?? ''), String(b.name ?? ''), String(b.location ?? ''))
        } catch (e) {
          const err = e as Error & { statusCode?: number }
          return reply.code(err.statusCode ?? 500).send({ error: 'bad_request', message: err.message })
        }
      })

      r.post('/personnel', { preHandler: requireAuth }, async (req, reply) => {
        assertPermission(req.auth!.perms, 'personnel', 'create')
        const b = req.body as { fullName?: string; email?: string; companyId?: string; siteId?: string }
        try {
          return await insertPersonnel(
            pool,
            String(b.fullName ?? ''),
            String(b.email ?? ''),
            String(b.companyId ?? ''),
            String(b.siteId ?? ''),
          )
        } catch (e) {
          const err = e as Error & { statusCode?: number }
          return reply.code(err.statusCode ?? 500).send({ error: 'bad_request', message: err.message })
        }
      })

      r.post('/suppliers', { preHandler: requireAuth }, async (req, reply) => {
        assertPermission(req.auth!.perms, 'suppliers', 'create')
        const b = req.body as Record<string, string | undefined>
        try {
          return await insertSupplier(pool, {
            name: String(b.name ?? ''),
            contactName: String(b.contactName ?? ''),
            email: String(b.email ?? ''),
            phone: String(b.phone ?? ''),
            address: String(b.address ?? ''),
            notes: String(b.notes ?? ''),
          })
        } catch (e) {
          const err = e as Error & { statusCode?: number }
          const code = err.statusCode === 409 ? 409 : 400
          return reply.code(code).send({ error: code === 409 ? 'conflict' : 'bad_request', message: err.message })
        }
      })

      r.post('/products', { preHandler: requireAuth }, async (req, reply) => {
        assertPermission(req.auth!.perms, 'products', 'create')
        const b = req.body as Record<string, string | undefined>
        try {
          return await insertProduct(pool, {
            reference: String(b.reference ?? ''),
            sku: String(b.sku ?? ''),
            name: String(b.name ?? ''),
            brand: String(b.brand ?? ''),
            category: String(b.category ?? ''),
            description: String(b.description ?? ''),
            trackingMode: String(b.trackingMode ?? 'quantity') === 'serialized' ? 'serialized' : 'quantity',
          })
        } catch (e) {
          const err = e as Error & { statusCode?: number }
          const code = err.statusCode === 409 ? 409 : 400
          return reply.code(code).send({ error: code === 409 ? 'conflict' : 'bad_request', message: err.message })
        }
      })

      r.post('/storage-units', { preHandler: requireAuth }, async (req, reply) => {
        assertPermission(req.auth!.perms, 'storageUnits', 'create')
        const b = req.body as Record<string, string | undefined>
        try {
          return await insertStorageUnit(pool, {
            siteId: String(b.siteId ?? ''),
            code: String(b.code ?? ''),
            label: String(b.label ?? ''),
            kind: String(b.kind ?? 'shelf'),
            personnelId: b.personnelId != null && b.personnelId !== '' ? String(b.personnelId) : null,
          })
        } catch (e) {
          const err = e as Error & { statusCode?: number }
          const code = err.statusCode === 409 ? 409 : 400
          return reply.code(code).send({ error: code === 409 ? 'conflict' : 'bad_request', message: err.message })
        }
      })

      r.post('/users', { preHandler: requireAuth }, async (req, reply) => {
        assertPermission(req.auth!.perms, 'users', 'create')
        const b = req.body as { login?: string; displayName?: string; password?: string }
        try {
          const row = await insertPortalUser(pool, {
            login: String(b.login ?? ''),
            displayName: String(b.displayName ?? ''),
            password: String(b.password ?? ''),
          })
          return reply.code(201).send(row)
        } catch (e) {
          const err = e as Error & { statusCode?: number }
          const code = err.statusCode === 409 ? 409 : 400
          return reply.code(code).send({ error: code === 409 ? 'conflict' : 'bad_request', message: err.message })
        }
      })

      r.patch<{ Params: { id: string } }>('/users/:id/permissions', { preHandler: requireAuth }, async (req, reply) => {
        assertPermission(req.auth!.perms, 'users', 'edit')
        if (req.params.id === req.auth!.userId) {
          return reply.code(403).send({
            error: 'forbidden',
            message: 'You cannot change your own permissions. Ask another administrator.',
          })
        }
        const b = req.body as { permissions?: Record<string, PageCrud> }
        if (!b.permissions) {
          return reply.code(400).send({ error: 'bad_request', message: 'permissions object required' })
        }
        try {
          await replaceUserPermissions(pool, req.params.id, b.permissions)
        } catch (e) {
          const err = e as Error & { statusCode?: number }
          return reply.code(err.statusCode ?? 500).send({ error: 'bad_request', message: err.message })
        }
        return reply.code(204).send()
      })
    },
    { prefix: '/api/v1' },
  )

  return app
}
