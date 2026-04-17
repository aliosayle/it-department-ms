import { useEffect, useState, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiBaseUrl, isLiveApi } from '@/api/config'
import { PORTAL_AUTH_CHANGED_EVENT, getAccessToken } from '@/api/session'
import { queryClient } from '@/lib/queryClient'
import {
  emptyStore,
  getMockStoreSnapshot,
  normalizeBootstrapState,
  setLiveSnapshot,
  subscribeMockStore,
  type StoreState,
} from './mockStore'

const emptySnapshot: StoreState = emptyStore()

async function fetchBootstrap(): Promise<StoreState> {
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

/** Subscribes to in-memory mock store, or to API bootstrap when `VITE_API_BASE_URL` is set. */
export function useMockStore(): StoreState {
  const live = isLiveApi()
  const [authEpoch, setAuthEpoch] = useState(0)
  useEffect(() => {
    const fn = () => setAuthEpoch((n) => n + 1)
    window.addEventListener(PORTAL_AUTH_CHANGED_EVENT, fn)
    return () => window.removeEventListener(PORTAL_AUTH_CHANGED_EVENT, fn)
  }, [])
  const tokenPresent = !live || !!getAccessToken()
  const q = useQuery({
    queryKey: ['bootstrap', authEpoch],
    queryFn: fetchBootstrap,
    enabled: live && tokenPresent,
  })

  useEffect(() => {
    if (live && tokenPresent && q.data) setLiveSnapshot(q.data)
    if (!live || !tokenPresent) setLiveSnapshot(null)
    return () => {
      if (!live) setLiveSnapshot(null)
    }
  }, [live, tokenPresent, q.data])

  const mockSnap = useSyncExternalStore(subscribeMockStore, getMockStoreSnapshot, getMockStoreSnapshot)

  if (!live) return mockSnap
  if (q.data) return q.data
  if (q.isError) return emptySnapshot
  return emptySnapshot
}

export function invalidateBootstrap(): void {
  void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
}
