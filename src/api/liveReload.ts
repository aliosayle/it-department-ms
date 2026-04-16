import { isLiveApi } from '@/api/config'

/**
 * Read endpoints are still served from the mock store until the SPA moves to React Query + GET routes.
 * After a successful live mutation, reload so lists reflect server state.
 */
export function reloadPortalAfterLiveMutation(): void {
  if (isLiveApi()) window.location.reload()
}
