/** When unset in dev, mutations use the in-browser mock store. In production builds, defaults to same-origin `/api/v1` (nginx proxy). */

function resolvedApiBaseRaw(): string {
  const v = import.meta.env.VITE_API_BASE_URL
  if (typeof v === 'string' && v.trim().length > 0) return v.trim()
  if (import.meta.env.PROD) return '/api/v1'
  return ''
}

export function isLiveApi(): boolean {
  return resolvedApiBaseRaw().length > 0
}

export function apiBaseUrl(): string {
  const v = resolvedApiBaseRaw()
  if (!v) {
    throw new Error('VITE_API_BASE_URL is not set (required in dev; production defaults to /api/v1)')
  }
  return v.replace(/\/$/, '')
}
