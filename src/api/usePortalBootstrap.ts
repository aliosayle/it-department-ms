import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiBaseUrl, isLiveApi } from '@/api/config'
import { PORTAL_AUTH_CHANGED_EVENT, getAccessToken } from '@/api/session'
import { normalizeBootstrapState, type StoreState } from '@/mocks/mockStore'

export async function fetchBootstrap(): Promise<StoreState> {
  const base = apiBaseUrl()
  const token = getAccessToken()
  const res = await fetch(`${base}/bootstrap`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || res.statusText)
  }
  const raw = (await res.json()) as Partial<StoreState>
  return normalizeBootstrapState(raw)
}

export type PortalBootstrapResult = {
  isLive: boolean
  /** When live and fetch succeeded */
  snapshot: StoreState | undefined
  isPending: boolean
  isFetching: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  /** Live API configured but user not signed in — query idle */
  isIdleAuth: boolean
}

/** Shared bootstrap query (deduped by React Query). Used by useMockStore and usePortalBootstrap. */
export function useBootstrapQuery() {
  const live = isLiveApi()
  const [authEpoch, setAuthEpoch] = useState(0)
  useEffect(() => {
    const fn = () => setAuthEpoch((n) => n + 1)
    window.addEventListener(PORTAL_AUTH_CHANGED_EVENT, fn)
    return () => window.removeEventListener(PORTAL_AUTH_CHANGED_EVENT, fn)
  }, [])

  const tokenPresent = !!getAccessToken()
  const enabled = live && tokenPresent

  const q = useQuery({
    queryKey: ['bootstrap', authEpoch],
    queryFn: fetchBootstrap,
    enabled,
  })

  return { live, tokenPresent, enabled, ...q }
}

/**
 * Bootstrap snapshot from the API with explicit loading/error state.
 * Use on product/stock pages instead of useMockStore when you need UX boundaries.
 */
export function usePortalBootstrap(): PortalBootstrapResult {
  const { live, tokenPresent, enabled, data, isSuccess, isPending, isFetching, isError, error, refetch } =
    useBootstrapQuery()

  return {
    isLive: live,
    snapshot: live && isSuccess && data ? data : undefined,
    /** True only for initial load (no cached data yet). */
    isPending: Boolean(enabled && isPending && !data),
    isFetching: Boolean(enabled && isFetching),
    isError: Boolean(enabled && isError),
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
    refetch: () => void refetch(),
    isIdleAuth: live && !tokenPresent,
  }
}
