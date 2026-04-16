import type { PageKey } from '@/mocks/domain/types'
import { AccessDeniedPage } from '@/auth/AccessDeniedPage'
import { useAuth } from '@/auth/AuthContext'

type PageGuardProps = {
  page: PageKey
  children: React.ReactNode
}

/** Client-side route guard (`view`). Live API 403 responses use `/access-denied` via `ApiForbiddenBridge`. */
export function PageGuard({ page, children }: PageGuardProps) {
  const { can } = useAuth()
  if (!can(page, 'view')) {
    return <AccessDeniedPage />
  }
  return children
}
