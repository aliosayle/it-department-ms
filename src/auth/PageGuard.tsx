import type { CrudAction, PageKey } from '@/mocks/domain/types'
import { AccessDeniedPage } from '@/auth/AccessDeniedPage'
import { useAuth } from '@/auth/AuthContext'

type PageGuardProps = {
  page: PageKey
  children: React.ReactNode
  /** Defaults to `view`. Use e.g. `create` for “new …” routes. */
  require?: CrudAction
}

/** Client-side route guard. Live API 403 responses use `/access-denied` via `ApiForbiddenBridge`. */
export function PageGuard({ page, children, require = 'view' }: PageGuardProps) {
  const { can } = useAuth()
  if (!can(page, require)) {
    return <AccessDeniedPage />
  }
  return children
}
