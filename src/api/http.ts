import { apiBaseUrl, isLiveApi } from '@/api/config'
import { PortalApiError } from '@/api/errors'
import { notifyApiForbidden } from '@/api/forbiddenBus'
import { clearSession, getRefreshToken, refreshAccessToken } from '@/api/session'

function joinUrl(path: string): string {
  const base = apiBaseUrl()
  if (path.startsWith('/')) return `${base}${path}`
  return `${base}/${path}`
}

function authHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('portal_access_token') : null
  const h: Record<string, string> = { Accept: 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text()
  if (!text) return res.statusText || 'Request failed'
  try {
    const j = JSON.parse(text) as { message?: string; error?: string }
    return j.message ?? j.error ?? text
  } catch {
    return text
  }
}

async function fetchWithRefresh(
  path: string,
  init: RequestInit & { method: string },
): Promise<Response> {
  const url = joinUrl(path)
  const run = () =>
    fetch(url, {
      ...init,
      headers: { ...init.headers, ...authHeaders() },
    })
  let res = await run()
  if (res.status === 401 && getRefreshToken()) {
    const renewed = await refreshAccessToken()
    if (renewed) res = await run()
    else clearSession()
  }
  return res
}

/** POST JSON; returns parsed JSON or undefined for 204. */
export async function apiPostJson<T>(path: string, body: unknown): Promise<T | undefined> {
  if (!isLiveApi()) throw new Error('apiPostJson called without live API configured')
  const res = await fetchWithRefresh(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 403) {
    notifyApiForbidden()
    throw new PortalApiError(await readErrorMessage(res), 403)
  }
  if (res.status === 401) {
    throw new PortalApiError(await readErrorMessage(res), 401)
  }
  if (!res.ok) {
    throw new PortalApiError(await readErrorMessage(res), res.status)
  }
  if (res.status === 204) return undefined
  const text = await res.text()
  if (!text) return undefined
  return JSON.parse(text) as T
}

export async function apiPatchJson<T>(path: string, body: unknown): Promise<T | undefined> {
  if (!isLiveApi()) throw new Error('apiPatchJson called without live API configured')
  const res = await fetchWithRefresh(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 403) {
    notifyApiForbidden()
    throw new PortalApiError(await readErrorMessage(res), 403)
  }
  if (res.status === 401) {
    throw new PortalApiError(await readErrorMessage(res), 401)
  }
  if (!res.ok) {
    throw new PortalApiError(await readErrorMessage(res), res.status)
  }
  if (res.status === 204) return undefined
  const text = await res.text()
  if (!text) return undefined
  return JSON.parse(text) as T
}
