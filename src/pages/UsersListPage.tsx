import { Link, useNavigate } from 'react-router-dom'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { portalUsersGridConfig } from '@/pages/gridPageConfigs.admin'
import type { UserListRow } from '@/pages/gridPageConfigs.admin'
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

  return (
    <>
      <p className="form-page__hint" style={{ marginTop: 0 }}>
        Signed in as <strong>{user.displayName}</strong>. Use the header profile selector to preview
        access as another user.
      </p>
      {can.edit ? (
        <p className="form-page__hint">
          Click a row to open the access profile. Changes apply for this session until data is
          reloaded from source.
        </p>
      ) : null}
      <PortalGridPage config={portalUsersGridConfig} dataSource={rows} onRowClick={onRowClick} />
      {can.edit ? (
        <div className="list-toolbar" style={{ marginTop: 12 }}>
          <Link to={`/admin/users/${user.id}`}>
            <Button text="Edit my permissions" />
          </Link>
        </div>
      ) : null}
    </>
  )
}
