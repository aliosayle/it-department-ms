/**
 * Write operations: POST/PATCH to the REST API when `VITE_API_BASE_URL` is set.
 * The portal is locked behind API auth — configure the API URL to use mutations.
 */

import { apiPatchJson, apiPostJson } from '@/api/http'
import { isLiveApi } from '@/api/config'
import { isPortalApiError } from '@/api/errors'
import { queryClient } from '@/lib/queryClient'
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

const NEED_API = 'Set VITE_API_BASE_URL and sign in to use this action.'

function mapLiveFailure(e: unknown): { ok: false; error: string } {
  if (isPortalApiError(e)) return { ok: false, error: e.message }
  if (e instanceof Error) return { ok: false, error: e.message }
  return { ok: false, error: 'Request failed.' }
}

export async function portalReceiveStock(
  input: ReceiveStockInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    await apiPostJson('/inventory/receive', input)
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalTransferStock(
  input: TransferStockInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    await apiPostJson('/inventory/transfer', input)
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalCreateDelivery(input: CreateDeliveryInput): Promise<CreateDeliveryResult> {
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    const delivery = await apiPostJson<Delivery>('/deliveries', input)
    if (!delivery?.id) return { ok: false, error: 'Invalid response from server.' }
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true, delivery }
  } catch (e) {
    return mapLiveFailure(e) as CreateDeliveryResult
  }
}

export async function portalCreatePurchase(input: CreatePurchaseInput): Promise<CreatePurchaseResult> {
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    const purchase = await apiPostJson<Purchase>('/purchases', input)
    if (!purchase?.id) return { ok: false, error: 'Invalid response from server.' }
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true, purchase }
  } catch (e) {
    return mapLiveFailure(e) as CreatePurchaseResult
  }
}

export async function portalReceivePurchase(purchaseId: string): Promise<ReceivePurchaseResult> {
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    await apiPostJson(`/purchases/${encodeURIComponent(purchaseId)}/receive`, {})
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true }
  } catch (e) {
    return mapLiveFailure(e) as ReceivePurchaseResult
  }
}

export async function portalUpdatePortalUser(
  userId: string,
  permissions: Record<PageKey, PageCrud>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    await apiPatchJson(`/users/${encodeURIComponent(userId)}/permissions`, { permissions })
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalAddCompany(name: string, notes = ''): Promise<Company> {
  if (!isLiveApi()) throw new Error(NEED_API)
  const row = await apiPostJson<Company>('/companies', { name, notes })
  if (!row?.id) throw new Error('Invalid response from server.')
  void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
  return row
}

export async function portalAddSite(
  companyId: string,
  name: string,
  location: string,
): Promise<{ ok: true; site: import('@/mocks/domain/types').Site } | { ok: false; error: string }> {
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    const site = await apiPostJson<import('@/mocks/domain/types').Site>('/sites', { companyId, name, location })
    if (!site?.id) return { ok: false, error: 'Invalid response from server.' }
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
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
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    const personnel = await apiPostJson<import('@/mocks/domain/types').Personnel>('/personnel', {
      fullName,
      email,
      companyId,
      siteId,
    })
    if (!personnel?.id) return { ok: false, error: 'Invalid response from server.' }
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
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
  if (!isLiveApi()) throw new Error(NEED_API)
  const row = await apiPostJson<Supplier>('/suppliers', {
    name,
    contactName,
    email,
    phone,
    address,
    notes,
  })
  if (!row?.id) throw new Error('Invalid response from server.')
  void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
  return row
}
