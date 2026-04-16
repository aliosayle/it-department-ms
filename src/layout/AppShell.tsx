import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import SelectBox from 'devextreme-react/select-box'
import { NavIcon, type NavIconId } from '@/components/NavIcon'
import { ApiForbiddenBridge } from '@/api/ApiForbiddenBridge'
import { useAuth } from '@/auth/AuthContext'
import type { PageKey } from '@/mocks/domain/types'
import { getPageMeta } from '@/layout/pageMeta'
import './AppShell.css'

type NavItem = {
  to: string
  end?: boolean
  page: PageKey
  title: string
  icon: NavIconId
  label: string
}

const navItems: NavItem[] = [
  { to: '/', end: true, page: 'dashboard', title: 'Dashboard', icon: 'dashboard', label: 'Dashboard' },
  {
    to: '/service-desk',
    page: 'serviceDesk',
    title: 'Service desk',
    icon: 'serviceDesk',
    label: 'Service desk',
  },
  { to: '/assets', page: 'assets', title: 'Assets', icon: 'assets', label: 'Assets' },
  { to: '/stock', page: 'stock', title: 'Stock', icon: 'stock', label: 'Stock' },
  {
    to: '/stock/storage-units',
    page: 'storageUnits',
    title: 'Storage units',
    icon: 'storageUnits',
    label: 'Storage units',
  },
  { to: '/products', page: 'products', title: 'Products', icon: 'products', label: 'Products' },
  { to: '/purchases', page: 'purchases', title: 'Purchases', icon: 'purchases', label: 'Purchases' },
  { to: '/delivery', page: 'delivery', title: 'Deliveries', icon: 'delivery', label: 'Deliveries' },
  {
    to: '/master-data/suppliers',
    page: 'suppliers',
    title: 'Suppliers',
    icon: 'suppliers',
    label: 'Suppliers',
  },
  { to: '/master-data/companies', page: 'companies', title: 'Companies', icon: 'companies', label: 'Companies' },
  { to: '/master-data/sites', page: 'sites', title: 'Sites', icon: 'sites', label: 'Sites' },
  {
    to: '/master-data/personnel',
    page: 'personnel',
    title: 'Personnel',
    icon: 'personnel',
    label: 'Personnel',
  },
  {
    to: '/inventory/equipment',
    page: 'equipment',
    title: 'User equipment',
    icon: 'equipment',
    label: 'User equipment',
  },
  { to: '/inventory/network', page: 'network', title: 'Network', icon: 'network', label: 'Network' },
  { to: '/admin/users', page: 'users', title: 'Users', icon: 'users', label: 'Users' },
]

export function AppShell() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const { userId, setUserId, users, can } = useAuth()

  const meta = getPageMeta(location.pathname)

  useEffect(() => {
    document.title = `${meta.title} · IT Department`
  }, [meta.title])

  const userOptions = useMemo(
    () => users.map((u) => ({ value: u.id, text: `${u.displayName} (${u.login})` })),
    [users],
  )

  const visibleNav = useMemo(() => navItems.filter((item) => can(item.page, 'view')), [can])

  return (
    <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
      <ApiForbiddenBridge />
      <aside className="app-shell__sidebar" aria-label="Primary">
        <div className="app-shell__brand">
          <span className="app-shell__brand-mark" aria-hidden />
          {!collapsed && <span className="app-shell__brand-text">IT Portal</span>}
        </div>
        <nav className="app-shell__nav">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              className="app-shell__link"
              to={item.to}
              end={item.end}
              title={item.title}
            >
              <span className="app-shell__link-icon">
                <NavIcon id={item.icon} />
              </span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          className="app-shell__collapse"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? '⟩' : '⟨'}
        </button>
      </aside>

      <div className="app-shell__main">
        <header className="app-shell__topbar">
          <div className="app-shell__topbar-inner">
            <div>
              <h1 className="app-shell__title">{meta.title}</h1>
              {meta.subtitle ? (
                <p className="app-shell__subtitle">{meta.subtitle}</p>
              ) : null}
            </div>
            <div className="app-shell__topbar-actions">
              {import.meta.env.DEV ? (
                <span className="app-shell__badge" title="Non-production build">
                  Development
                </span>
              ) : null}
              <SelectBox
                className="app-shell__user-select"
                dataSource={userOptions}
                displayExpr="text"
                valueExpr="value"
                value={userId}
                width={280}
                showClearButton={false}
                label="Signed-in profile"
                labelMode="outside"
                onValueChanged={(e) => setUserId(String(e.value))}
                aria-label="Select signed-in user profile"
              />
            </div>
          </div>
        </header>

        <main className="app-shell__content">
          <div className="app-shell__content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
