import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Button from 'devextreme-react/button'
import notify from 'devextreme/ui/notify'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { useCan } from '@/auth/AuthContext'
import { assignmentsGridConfigV2 } from '@/pages/gridPageConfigs.stockDomain'
import type { Assignment } from '@/mocks/domain/types'
import { useMockStore } from '@/mocks/mockStore'

export function AssignmentListPage() {
  const { assignments } = useMockStore()
  const perm = useCan('assignment')

  const rowActions = useMemo<PortalGridRowActions<Assignment>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      onView: (r) => {
        notify({
          message: `Assignment ${r.id}\n${r.description || r.itemDescription || '—'}`,
          type: 'info',
          displayTime: 5000,
        })
      },
      getEditHref: () => '/assignments/new',
    }),
    [perm.view, perm.edit, perm.delete],
  )

  return (
    <>
      <div className="list-toolbar">
        {perm.create ? (
          <Link to="/assignments/new">
            <Button text="New assignment" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      <PortalGridPage config={assignmentsGridConfigV2} dataSource={assignments} rowActions={rowActions} />
    </>
  )
}
