import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { isLiveApi } from '@/api/config'
import {
  PORTAL_AUTH_CHANGED_EVENT,
  clearSession,
  fetchCurrentUser,
  getAccessToken,
} from '@/api/session'
import type { CrudAction, PageKey, PortalUser } from '@/mocks/domain/types'
import { useMockStore } from '@/mocks/mockStore'
import { denyAllPermissions } from '@/auth/pageKeys'

type AuthContextValue = {
  user: PortalUser
  userId: string
  users: PortalUser[]
  can: (page: PageKey, action: CrudAction) => boolean
  /** False until `GET /me` succeeds (JWT session). */
  sessionReady: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function emptyUser(): PortalUser {
  return {
    id: '',
    displayName: '…',
    login: '',
    permissions: denyAllPermissions(),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const snap = useMockStore()
  const users = snap.users
  const [authEpoch, setAuthEpoch] = useState(0)

  useEffect(() => {
    const onAuth = () => setAuthEpoch((e) => e + 1)
    window.addEventListener(PORTAL_AUTH_CHANGED_EVENT, onAuth)
    return () => window.removeEventListener(PORTAL_AUTH_CHANGED_EVENT, onAuth)
  }, [])

  useEffect(() => {
    if (getAccessToken() && !isLiveApi()) clearSession()
  }, [])

  const hasToken = !!getAccessToken()
  const live = isLiveApi()

  const meQuery = useQuery({
    queryKey: ['me', authEpoch],
    queryFn: fetchCurrentUser,
    enabled: hasToken && live,
    retry: false,
  })

  useEffect(() => {
    if (!hasToken || !live) return
    if (!meQuery.isError) return
    clearSession()
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
  }, [hasToken, live, meQuery.isError])

  const user = useMemo((): PortalUser => {
    if (!hasToken || !live) return emptyUser()
    if (meQuery.data) return meQuery.data
    return emptyUser()
  }, [hasToken, live, meQuery.data])

  const sessionReady = !hasToken || (live && meQuery.isSuccess)

  const userId = user.id

  const can = useCallback(
    (page: PageKey, action: CrudAction) => {
      return user.permissions[page]?.[action] ?? false
    },
    [user],
  )

  const logout = useCallback(() => {
    clearSession()
    window.location.assign('/login')
  }, [])

  const value = useMemo(
    () => ({
      user,
      userId,
      users,
      can,
      sessionReady,
      logout,
    }),
    [user, userId, users, can, sessionReady, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useCan(page: PageKey) {
  const { can } = useAuth()
  return {
    view: can(page, 'view'),
    edit: can(page, 'edit'),
    delete: can(page, 'delete'),
    create: can(page, 'create'),
  }
}
