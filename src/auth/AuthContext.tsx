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
import { denyAllPermissions, fullPermissionsMap } from '@/auth/pageKeys'

const LS_MOCK_USER_ID = 'it-portal-current-user-id'

type AuthContextValue = {
  user: PortalUser
  userId: string
  setUserId: (id: string) => void
  users: PortalUser[]
  can: (page: PageKey, action: CrudAction) => boolean
  /** False while live session loads `/me` (shell should wait). */
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

  const live = isLiveApi()
  const hasToken = live && !!getAccessToken()

  const meQuery = useQuery({
    queryKey: ['me', authEpoch],
    queryFn: fetchCurrentUser,
    enabled: hasToken,
    retry: false,
  })

  useEffect(() => {
    if (!hasToken) return
    if (!meQuery.isError) return
    clearSession()
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
  }, [hasToken, meQuery.isError])

  const [mockUserId, setMockUserId] = useState(() => localStorage.getItem(LS_MOCK_USER_ID) ?? 'u-ali')

  const resolvedMockUserId = useMemo(() => {
    if (live) return mockUserId
    if (users.length === 0) return mockUserId
    return users.some((u) => u.id === mockUserId) ? mockUserId : users[0]!.id
  }, [live, users, mockUserId])

  useEffect(() => {
    if (live) return
    localStorage.setItem(LS_MOCK_USER_ID, resolvedMockUserId)
  }, [live, resolvedMockUserId])

  const user = useMemo((): PortalUser => {
    if (live) {
      if (meQuery.data) return meQuery.data
      return emptyUser()
    }
    const u = users.find((x) => x.id === resolvedMockUserId) ?? users[0]
    if (!u) {
      return {
        id: '',
        displayName: '—',
        login: '',
        permissions: fullPermissionsMap(),
      }
    }
    return u
  }, [live, users, resolvedMockUserId, meQuery.data])

  const sessionReady = !live || !hasToken || meQuery.isSuccess

  const setUserId = useCallback(
    (id: string) => {
      if (live) return
      setMockUserId(id)
    },
    [live],
  )

  const userId = live ? user.id : resolvedMockUserId

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
      setUserId,
      users,
      can,
      sessionReady,
      logout,
    }),
    [user, userId, users, can, sessionReady, logout, setUserId],
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
