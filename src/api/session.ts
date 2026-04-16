import { apiBaseUrl, isLiveApi } from '@/api/config'
import type { PortalUser } from '@/mocks/domain/types'

export const ACCESS_TOKEN_KEY = 'portal_access_token'
export const REFRESH_TOKEN_KEY = 'portal_refresh_token'

export const PORTAL_AUTH_CHANGED_EVENT = 'portal-auth-changed'

export function getAccessToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setSessionTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  window.dispatchEvent(new Event(PORTAL_AUTH_CHANGED_EVENT))
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.dispatchEvent(new Event(PORTAL_AUTH_CHANGED_EVENT))
}

function joinUrl(path: string): string {
  const base = apiBaseUrl()
  if (path.startsWith('/')) return `${base}${path}`
  return `${base}/${path}`
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: PortalUser
}

export async function loginWithPassword(login: string, password: string): Promise<LoginResponse> {
  if (!isLiveApi()) throw new Error('loginWithPassword requires VITE_API_BASE_URL')
  const res = await fetch(joinUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login, password }),
  })
  const text = await res.text()
  if (!res.ok) {
    let msg = text || res.statusText
    try {
      const j = JSON.parse(text) as { message?: string }
      if (j.message) msg = j.message
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return JSON.parse(text) as LoginResponse
}

/** Returns new access token or null if refresh failed. */
export async function refreshAccessToken(): Promise<string | null> {
  if (!isLiveApi()) return null
  const refresh = getRefreshToken()
  if (!refresh) return null
  try {
    const res = await fetch(joinUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) return null
    const j = (await res.json()) as { accessToken?: string }
    if (!j.accessToken) return null
    localStorage.setItem(ACCESS_TOKEN_KEY, j.accessToken)
    window.dispatchEvent(new Event(PORTAL_AUTH_CHANGED_EVENT))
    return j.accessToken
  } catch {
    return null
  }
}

export async function fetchCurrentUser(): Promise<PortalUser> {
  if (!isLiveApi()) throw new Error('fetchCurrentUser requires live API')
  const token = getAccessToken()
  if (!token) throw new Error('Not signed in')
  const res = await fetch(joinUrl('/me'), {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || res.statusText)
  }
  const body = (await res.json()) as { user: PortalUser }
  return body.user
}
