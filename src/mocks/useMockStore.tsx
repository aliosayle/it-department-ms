import { useEffect, useSyncExternalStore } from 'react'
import { useBootstrapQuery, fetchBootstrap } from '@/api/usePortalBootstrap'
import { queryClient } from '@/lib/queryClient'
import {
  emptyStore,
  getMockStoreSnapshot,
  setLiveSnapshot,
  subscribeMockStore,
  type StoreState,
} from './mockStore'

export { fetchBootstrap }

/** Subscribes to in-memory mock store, or to API bootstrap when `VITE_API_BASE_URL` is set. */
export function useMockStore(): StoreState {
  const { live, tokenPresent, data, isSuccess, isError, isPending } = useBootstrapQuery()

  useEffect(() => {
    if (live && tokenPresent && data) setLiveSnapshot(data)
    if (!live || !tokenPresent) setLiveSnapshot(null)
    return () => {
      if (!live) setLiveSnapshot(null)
    }
  }, [live, tokenPresent, data])

  const mockSnap = useSyncExternalStore(subscribeMockStore, getMockStoreSnapshot, getMockStoreSnapshot)

  if (!live) return mockSnap
  if (data && isSuccess) return data
  if (isError || isPending) return emptySnapshot
  return emptySnapshot
}

export function invalidateBootstrap(): void {
  void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
}
