/** When unset, all portal mutations use the in-browser mock store (synchronous rules). */

export function isLiveApi(): boolean {
  const v = import.meta.env.VITE_API_BASE_URL
  return typeof v === 'string' && v.trim().length > 0
}

export function apiBaseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL
  if (!v?.trim()) {
    throw new Error('VITE_API_BASE_URL is not set')
  }
  return v.replace(/\/$/, '')
}
