/**
 * Write operations: POST/PATCH to the REST API when `VITE_API_BASE_URL` is set.
 * The portal is locked behind API auth — configure the API URL to use mutations.
 */

import { apiPatchJson, apiPostJson } from '@/api/http'
import { isLiveApi } from '@/api/config'
import { isPortalApiError } from '@/api/errors'
import { queryClient } from '@/lib/queryClient'
import type {
  Assignment,
  Company,
  CreateAssignmentInput,
  CreatePurchaseInput,
  PageCrud,
  PageKey,
  Product,
  Purchase,
  ReceiveStockInput,
  StorageUnit,
  Supplier,
  TransferStockInput,
} from '@/mocks/domain/types'
import type { AssetRow, Ticket } from '@/mocks/types'
import type { CreateAssignmentResult, CreatePurchaseResult, ReceivePurchaseResult } from '@/mocks/mockStore'
import {
  mockAddTaskAttachment,
  mockCreateTask,
  mockReviewTask,
  updateCompany,
  updateInventoryAsset,
  updateNetworkDevice,
  updateServiceDeskTicket,
  updateSite,
  updateSupplier,
} from '@/mocks/mockStore'

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

export async function portalCreateAssignment(input: CreateAssignmentInput): Promise<CreateAssignmentResult> {
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    const assignment = await apiPostJson<Assignment>('/assignments', input)
    if (!assignment?.id) return { ok: false, error: 'Invalid response from server.' }
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true, assignment }
  } catch (e) {
    return mapLiveFailure(e) as CreateAssignmentResult
  }
}

export async function portalReceiveSerialized(input: {
  productId: string
  storageUnitId: string
  identifiers: string[]
  reason: string
  note: string
  purchaseId?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    await apiPostJson('/inventory/receive-serialized', input)
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true }
  } catch (e) {
    return mapLiveFailure(e)
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

export type CreatedPortalUser = { id: string; login: string; displayName: string }

export async function portalCreatePortalUser(input: {
  login: string
  displayName: string
  password: string
}): Promise<{ ok: true; user: CreatedPortalUser } | { ok: false; error: string }> {
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    const user = await apiPostJson<CreatedPortalUser>('/users', input)
    if (!user?.id) return { ok: false, error: 'Invalid response from server.' }
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true, user }
  } catch (e) {
    return mapLiveFailure(e) as { ok: false; error: string }
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

export async function portalAddProduct(input: {
  reference: string
  sku?: string
  name: string
  brand?: string
  category?: string
  description?: string
  trackingMode?: 'quantity' | 'serialized'
}): Promise<{ ok: true; product: Product } | { ok: false; error: string }> {
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    const product = await apiPostJson<Product>('/products', {
      ...input,
      trackingMode: input.trackingMode ?? 'quantity',
    })
    if (!product?.id) return { ok: false, error: 'Invalid response from server.' }
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true, product }
  } catch (e) {
    return mapLiveFailure(e) as { ok: false; error: string }
  }
}

export async function portalUpdateProduct(
  productId: string,
  input: {
    reference?: string
    sku?: string | null
    name?: string
    brand?: string
    category?: string
    description?: string
    trackingMode?: 'quantity' | 'serialized'
  },
): Promise<{ ok: true; product: Product } | { ok: false; error: string }> {
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    const product = await apiPatchJson<Product>(`/products/${encodeURIComponent(productId)}`, input)
    if (!product?.id) return { ok: false, error: 'Invalid response from server.' }
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true, product }
  } catch (e) {
    return mapLiveFailure(e) as { ok: false; error: string }
  }
}

export async function portalAddStorageUnit(input: {
  siteId: string
  code: string
  label: string
  kind: string
  personnelId?: string | null
}): Promise<{ ok: true; storageUnit: StorageUnit } | { ok: false; error: string }> {
  if (!isLiveApi()) return { ok: false, error: NEED_API }
  try {
    const storageUnit = await apiPostJson<StorageUnit>('/storage-units', input)
    if (!storageUnit?.id) return { ok: false, error: 'Invalid response from server.' }
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true, storageUnit }
  } catch (e) {
    return mapLiveFailure(e) as { ok: false; error: string }
  }
}

export async function portalUpsertRole(input: { id?: string; name: string; description?: string; permissions: Record<PageKey, PageCrud> }) {
  if (!isLiveApi()) return { ok: false as const, error: NEED_API }
  try {
    await apiPostJson('/roles', input)
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true as const }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalUpdateUserAccess(input: { userId: string; roleIds: string[]; overrides: Record<PageKey, PageCrud> }) {
  if (!isLiveApi()) return { ok: false as const, error: NEED_API }
  try {
    await apiPatchJson(`/users/${encodeURIComponent(input.userId)}/access`, {
      roleIds: input.roleIds,
      overrides: input.overrides,
    })
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true as const }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalCreateTask(input: {
  title: string
  description: string
  assignedToUserId: string
  reviewerUserId?: string | null
  dueDate?: string | null
  createdByUserId?: string
}) {
  if (!isLiveApi()) {
    const r = mockCreateTask({
      title: input.title,
      description: input.description,
      assignedToUserId: input.assignedToUserId,
      reviewerUserId: input.reviewerUserId ?? null,
      dueDate: input.dueDate ?? null,
      createdByUserId: input.createdByUserId ?? '',
    })
    return r.ok ? { ok: true as const } : { ok: false as const, error: r.error }
  }
  try {
    await apiPostJson('/tasks', input)
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true as const }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalUploadTaskAttachment(input: {
  taskId: string
  filename: string
  mimeType: string
  contentBase64: string
  uploadedByUserId?: string
}) {
  if (!isLiveApi()) {
    const uid = (input.uploadedByUserId || '').trim()
    if (!uid) return { ok: false as const, error: 'Uploader user id is required in offline mode.' }
    const r = mockAddTaskAttachment({
      taskId: input.taskId,
      uploadedByUserId: uid,
      filename: input.filename,
      mimeType: input.mimeType,
      contentBase64: input.contentBase64,
    })
    return r.ok ? { ok: true as const } : { ok: false as const, error: r.error }
  }
  try {
    await apiPostJson(`/tasks/${encodeURIComponent(input.taskId)}/attachments`, input)
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true as const }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalReviewTask(input: {
  taskId: string
  decision: 'approved' | 'changes_requested'
  comment?: string
  reviewerUserId?: string
}) {
  if (!isLiveApi()) {
    const rid = (input.reviewerUserId || '').trim()
    if (!rid) return { ok: false as const, error: 'Reviewer user id is required in offline mode.' }
    const r = mockReviewTask({
      taskId: input.taskId,
      reviewerUserId: rid,
      decision: input.decision,
      comment: input.comment,
    })
    return r.ok ? { ok: true as const } : { ok: false as const, error: r.error }
  }
  try {
    await apiPostJson(`/tasks/${encodeURIComponent(input.taskId)}/review`, {
      decision: input.decision,
      comment: input.comment,
    })
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true as const }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalUpdateCompany(
  id: string,
  body: { name: string; notes?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLiveApi()) {
    const r = updateCompany(id, body.name, body.notes ?? '')
    return r.ok ? { ok: true } : { ok: false, error: r.error }
  }
  try {
    await apiPatchJson(`/companies/${encodeURIComponent(id)}`, body)
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalUpdateSite(
  id: string,
  body: { companyId: string; name: string; location: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLiveApi()) {
    const r = updateSite(id, body)
    return r.ok ? { ok: true } : { ok: false, error: r.error }
  }
  try {
    await apiPatchJson(`/sites/${encodeURIComponent(id)}`, body)
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalUpdateSupplier(
  id: string,
  body: {
    name: string
    contactName: string
    email: string
    phone: string
    address: string
    notes: string
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLiveApi()) {
    const r = updateSupplier(id, body)
    return r.ok ? { ok: true } : { ok: false, error: r.error }
  }
  try {
    await apiPatchJson(`/suppliers/${encodeURIComponent(id)}`, body)
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalUpdateNetworkDevice(
  id: string,
  body: Partial<{
    type: string
    details: string
    brand: string
    model: string
    serialNumber: string
    location: string
  }>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLiveApi()) {
    const r = updateNetworkDevice(id, body)
    return r.ok ? { ok: true } : { ok: false, error: r.error }
  }
  try {
    await apiPatchJson(`/network-devices/${encodeURIComponent(id)}`, body)
    void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
    return { ok: true }
  } catch (e) {
    return mapLiveFailure(e)
  }
}

export async function portalUpdateServiceDeskTicket(
  id: string,
  patch: Partial<Ticket>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isLiveApi()) {
    return {
      ok: false,
      error: 'Service desk tickets are stored client-side only. Unset VITE_API_BASE_URL in dev to edit them.',
    }
  }
  const r = updateServiceDeskTicket(id, patch)
  return r.ok ? { ok: true } : { ok: false, error: r.error }
}

export async function portalUpdateInventoryAsset(
  id: string,
  patch: Partial<AssetRow>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isLiveApi()) {
    return {
      ok: false,
      error: 'IT assets are stored client-side only. Unset VITE_API_BASE_URL in dev to edit them.',
    }
  }
  const r = updateInventoryAsset(id, patch)
  return r.ok ? { ok: true } : { ok: false, error: r.error }
}
