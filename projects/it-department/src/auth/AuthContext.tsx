import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CrudAction, PageKey, PortalUser } from '@/mocks/domain/types'
import { useMockStore } from '@/mocks/mockStore'

const LS_KEY = 'it-portal-current-user-id'

type AuthContextValue = {
  user: PortalUser
  userId: string
  setUserId: (id: string) => void
  users: PortalUser[]
  can: (page: PageKey, action: CrudAction) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { users } = useMockStore()
  const [userId, setUserId] = useState(() => localStorage.getItem(LS_KEY) ?? 'u-ali')

  useEffect(() => {
    localStorage.setItem(LS_KEY, userId)
  }, [userId])

  useEffect(() => {
    if (users.length > 0 && !users.some((u) => u.id === userId)) {
      setUserId(users[0].id)
    }
  }, [users, userId])

  const user = useMemo(() => {
    return users.find((u) => u.id === userId) ?? users[0]!
  }, [users, userId])

  const can = useCallback(
    (page: PageKey, action: CrudAction) => {
      return user.permissions[page]?.[action] ?? false
    },
    [user],
  )

  const value = useMemo(
    () => ({
      user,
      userId,
      setUserId,
      users,
      can,
    }),
    [user, userId, users, can],
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
