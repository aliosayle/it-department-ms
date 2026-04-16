import { useEffect, useState, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isLiveApi } from '@/api/config'
import { PORTAL_AUTH_CHANGED_EVENT, getAccessToken } from '@/api/session'
import { queryClient } from '@/lib/queryClient'
import {
  getMockStoreSnapshot,
  setLiveSnapshot,
  subscribeMockStore,
  type StoreState,
} from './mockStore'

const emptySnapshot: StoreState = {
  companies: [],
  sites: [],
  personnel: [],
  storageUnits: [],
  products: [],
  stockPositions: [],
  productMovements: [],
  productReports: [],
  deliveries: [],
  userEquipment: [],
  networkDevices: [],
  users: [],
  suppliers: [],
  purchases: [],
  purchaseLines: [],
}

async function fetchBootstrap(): Promise<StoreState> {
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  if (!base) throw new Error('VITE_API_BASE_URL is not set')
  const token = getAccessToken()
  const res = await fetch(`${base}/bootstrap`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || res.statusText)
  }
  return res.json() as Promise<StoreState>
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
