import { apiBaseUrl, isLiveApi } from '@/api/config'
import { PortalApiError } from '@/api/errors'
import { notifyApiForbidden } from '@/api/forbiddenBus'

function joinUrl(path: string): string {
  const base = apiBaseUrl()
  if (path.startsWith('/')) return `${base}${path}`
  return `${base}/${path}`
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

/** POST JSON; returns parsed JSON or undefined for 204. */
export async function apiPostJson<T>(path: string, body: unknown): Promise<T | undefined> {
  if (!isLiveApi()) throw new Error('apiPostJson called without live API configured')
  const res = await fetch(joinUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 403) {
    notifyApiForbidden()
    throw new PortalApiError(await readErrorMessage(res), 403)
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
  const res = await fetch(joinUrl(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 403) {
    notifyApiForbidden()
    throw new PortalApiError(await readErrorMessage(res), 403)
  }
  if (!res.ok) {
    throw new PortalApiError(await readErrorMessage(res), res.status)
  }
  if (res.status === 204) return undefined
  const text = await res.text()
  if (!text) return undefined
  return JSON.parse(text) as T
}
