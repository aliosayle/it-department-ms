import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Button from 'devextreme-react/button'
import notify from 'devextreme/ui/notify'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { useCan } from '@/auth/AuthContext'
import { suppliersGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import type { Supplier } from '@/mocks/domain/types'
import { useMockStore } from '@/mocks/mockStore'
import './formPage.css'

export function SuppliersListPage() {
  const { suppliers } = useMockStore()
  const perm = useCan('suppliers')

  const rowActions = useMemo<PortalGridRowActions<Supplier>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      onView: (r) => {
        notify({
          message: `${r.name}\n${r.email} · ${r.phone}`,
          type: 'info',
          displayTime: 5000,
        })
      },
      onEdit: () => {
        notify({
          message: 'Supplier edit forms are not wired in this build — use Add supplier or the API.',
          type: 'warning',
          displayTime: 4000,
        })
      },
    }),
    [perm.view, perm.edit, perm.delete],
  )

  return (
    <>
      <div className="list-toolbar">
        <p className="form-page__hint" style={{ margin: 0 }}>
          Vendors used on purchases (bon / GRN).{' '}
          <Link to="/purchases">Purchases</Link>
        </p>
        {perm.create ? (
          <Link to="/master-data/suppliers/new">
            <Button text="Add supplier" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      {suppliers.length === 0 ? (
        <p className="form-page__hint form-page__hint--warn" style={{ marginTop: 8 }}>
          No suppliers yet. Add one before creating purchases that reference a vendor.{' '}
          {perm.create ? (
            <>
              <Link to="/master-data/suppliers/new">Add supplier</Link> ·{' '}
            </>
          ) : null}
          <Link to="/purchases">Purchases</Link>
        </p>
      ) : null}
      <PortalGridPage config={suppliersGridConfig} dataSource={suppliers} rowActions={rowActions} />
    </>
  )
}
