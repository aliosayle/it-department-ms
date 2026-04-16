import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { portalUsersGridConfig } from '@/pages/gridPageConfigs.admin'
import type { UserListRow } from '@/pages/gridPageConfigs.admin'
import { isLiveApi } from '@/api/config'
import { useAuth, useCan } from '@/auth/AuthContext'
import { useMockStore } from '@/mocks/mockStore'

export function UsersListPage() {
  const { users } = useMockStore()
  const navigate = useNavigate()
  const { user } = useAuth()
  const can = useCan('users')

  const rows: UserListRow[] = users.map((u) => ({
    id: u.id,
    displayName: u.displayName,
    login: u.login,
  }))

  const onRowClick = (e: RowClickEvent<UserListRow, string | number>) => {
    const id = e.data?.id
    if (id && can.view) navigate(`/admin/users/${String(id)}`)
  }

  const rowActions = useMemo<PortalGridRowActions<UserListRow>>(
    () => ({
      canView: can.view,
      canEdit: can.edit,
      canDelete: false,
      getViewHref: (r) => `/admin/users/${String(r.id)}`,
      /** Own row: view permissions read-only; editing own matrix is blocked server- and client-side. */
      getEditHref: (r) => (r.id === user.id ? null : `/admin/users/${String(r.id)}`),
    }),
    [can.view, can.edit, user.id],
  )

  const live = isLiveApi()

  return (
    <>
      <p className="form-page__hint" style={{ marginTop: 0 }}>
        Signed in as <strong>{user.displayName}</strong>.
        {live
          ? ' Permissions are enforced by the server.'
          : ' Use the header profile selector to preview access as another user.'}
      </p>
      {can.edit ? (
        <p className="form-page__hint">
          Open a row to assign permissions. You cannot edit your own matrix — use another administrator.
          {live ? ' Changes are saved to the database.' : ' Without the API, permission edits are session-only.'}
        </p>
      ) : null}
      <div className="list-toolbar" style={{ marginBottom: 12 }}>
        {can.create ? (
          <Link to="/admin/users/new">
            <Button text="Create user" type="default" stylingMode="contained" />
          </Link>
        ) : null}
        <Link to={`/admin/users/${user.id}`}>
          <Button text="My access (read-only)" />
        </Link>
      </div>
      <PortalGridPage
        config={portalUsersGridConfig}
        dataSource={rows}
        onRowClick={onRowClick}
        rowActions={rowActions}
      />
    </>
  )
}
