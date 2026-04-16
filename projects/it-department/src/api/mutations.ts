/**
 * Write operations: in-memory mock by default; when `VITE_API_BASE_URL` is set, POST to the REST API
 * described in `docs/api/REST.md`. Successful live calls reload the page until read paths use the same API.
 */

import { apiPatchJson, apiPostJson } from '@/api/http'
import { isLiveApi } from '@/api/config'
import { isPortalApiError } from '@/api/errors'
import { reloadPortalAfterLiveMutation } from '@/api/liveReload'
import type {
  Company,
  CreateDeliveryInput,
  CreatePurchaseInput,
  Delivery,
  PageCrud,
  PageKey,
  Purchase,
  ReceiveStockInput,
  Supplier,
  TransferStockInput,
} from '@/mocks/domain/types'
import type { CreateDeliveryResult, CreatePurchaseResult, ReceivePurchaseResult } from '@/mocks/mockStore'
import {
  addCompany,
  addPersonnel,
  addSite,
  addSupplier,
  createDelivery,
  createPurchase,
  receivePurchase,
  receiveStock,
  transferStock,
  updatePortalUser,
} from '@/mocks/mockStore'

function mapLiveFailure(e: unknown): { ok: false; error: string } {
  if (isPortalApiError(e)) return { ok: false, error: e.message }
  if (e instanceof Error) return { ok: false, error: e.message }
  return { ok: false, error: 'Request failed.' }
}

export async function portalReceiveStock(
  input: ReceiveStockInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLiveApi()) return receiveStock(input)
  try {
    await apiPostJson('/inventory/receive', input)
    reloadPortalAfterLiveMutation()
    return { ok: true }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalTransferStock(
  input: TransferStockInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLiveApi()) return transferStock(input)
  try {
    await apiPostJson('/inventory/transfer', input)
    reloadPortalAfterLiveMutation()
    return { ok: true }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalCreateDelivery(input: CreateDeliveryInput): Promise<CreateDeliveryResult> {
  if (!isLiveApi()) return createDelivery(input)
  try {
    const delivery = await apiPostJson<Delivery>('/deliveries', input)
    if (!delivery?.id) return { ok: false, error: 'Invalid response from server.' }
    reloadPortalAfterLiveMutation()
    return { ok: true, delivery }
  } catch (e) {
    return mapLiveFailure(e) as CreateDeliveryResult
  }
}

export async function portalCreatePurchase(input: CreatePurchaseInput): Promise<CreatePurchaseResult> {
  if (!isLiveApi()) return createPurchase(input)
  try {
    const purchase = await apiPostJson<Purchase>('/purchases', input)
    if (!purchase?.id) return { ok: false, error: 'Invalid response from server.' }
    reloadPortalAfterLiveMutation()
    return { ok: true, purchase }
  } catch (e) {
    return mapLiveFailure(e) as CreatePurchaseResult
  }
}

export async function portalReceivePurchase(purchaseId: string): Promise<ReceivePurchaseResult> {
  if (!isLiveApi()) return receivePurchase(purchaseId)
  try {
    await apiPostJson(`/purchases/${encodeURIComponent(purchaseId)}/receive`, {})
    reloadPortalAfterLiveMutation()
    return { ok: true }
  } catch (e) {
    return mapLiveFailure(e) as ReceivePurchaseResult
  }
}

export async function portalUpdatePortalUser(
  userId: string,
  permissions: Record<PageKey, PageCrud>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLiveApi()) return updatePortalUser(userId, permissions)
  try {
    await apiPatchJson(`/users/${encodeURIComponent(userId)}/permissions`, { permissions })
    reloadPortalAfterLiveMutation()
    return { ok: true }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalAddCompany(name: string, notes = ''): Promise<Company> {
  if (!isLiveApi()) return addCompany(name, notes)
  const row = await apiPostJson<Company>('/companies', { name, notes })
  if (!row?.id) throw new Error('Invalid response from server.')
  reloadPortalAfterLiveMutation()
  return row
}

export async function portalAddSite(
  companyId: string,
  name: string,
  location: string,
): Promise<{ ok: true; site: import('@/mocks/domain/types').Site } | { ok: false; error: string }> {
  if (!isLiveApi()) return addSite(companyId, name, location)
  try {
    const site = await apiPostJson<import('@/mocks/domain/types').Site>('/sites', { companyId, name, location })
    if (!site?.id) return { ok: false, error: 'Invalid response from server.' }
    reloadPortalAfterLiveMutation()
    return { ok: true, site }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalAddPersonnel(
  fullName: string,
  email: string,
  companyId: string,
  siteId: string,
): Promise<
  { ok: true; personnel: import('@/mocks/domain/types').Personnel } | { ok: false; error: string }
> {
  if (!isLiveApi()) return addPersonnel(fullName, email, companyId, siteId)
  try {
    const personnel = await apiPostJson<import('@/mocks/domain/types').Personnel>('/personnel', {
      fullName,
      email,
      companyId,
      siteId,
    })
    if (!personnel?.id) return { ok: false, error: 'Invalid response from server.' }
    reloadPortalAfterLiveMutation()
    return { ok: true, personnel }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalAddSupplier(
  name: string,
  contactName: string,
  email: string,
  phone: string,
  address: string,
  notes: string,
): Promise<Supplier> {
  if (!isLiveApi()) return addSupplier(name, contactName, email, phone, address, notes)
  const row = await apiPostJson<Supplier>('/suppliers', {
    name,
    contactName,
    email,
    phone,
    address,
    notes,
  })
  if (!row?.id) throw new Error('Invalid response from server.')
  reloadPortalAfterLiveMutation()
  return row
}
