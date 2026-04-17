import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { storageUnitListGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import { useCan } from '@/auth/AuthContext'
import { usePortalBootstrap } from '@/api/usePortalBootstrap'
import { renderBootstrapGate } from '@/components/portal/BootstrapStatus'
import { buildStorageUnitListRowsFromState, type StorageUnitListRow } from '@/domain/inventoryView'

export function StorageUnitsListPage() {
  const b = usePortalBootstrap()
  const gate = renderBootstrapGate(b)
  const navigate = useNavigate()
  const perm = useCan('storageUnits')
  const rows = b.snapshot ? buildStorageUnitListRowsFromState(b.snapshot) : []

  const onRowClick = (e: RowClickEvent<StorageUnitListRow, string | number>) => {
    const id = e.data?.id
    if (id) navigate(`/stock/storage-units/${String(id)}`)
  }

  const rowActions = useMemo<PortalGridRowActions<StorageUnitListRow>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      getViewHref: (r) => `/stock/storage-units/${String(r.id)}`,
      getEditHref: (r) => `/stock/storage-units/${String(r.id)}`,
    }),
    [perm.view, perm.edit, perm.delete],
  )

  if (gate) return gate

  return (
    <>
      <div className="list-toolbar">
        <p className="form-page__hint" style={{ margin: 0 }}>
          Bins and shelves belong to a site; <strong>custody</strong> rows are tied to one person so assignments from
          stock can land in their custody bin (a bin is also created automatically on first stock assignment if none
          exists).
        </p>
        {perm.create ? (
          <Link to="/stock/storage-units/new">
            <Button text="New storage unit" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="form-page__hint form-page__hint--warn" style={{ marginTop: 8 }}>
          No storage units yet. <Link to="/stock/storage-units/new">New storage unit</Link>
        </p>
      ) : null}
      <PortalGridPage
        config={storageUnitListGridConfig}
        dataSource={rows}
        onRowClick={onRowClick}
        rowActions={rowActions}
      />
    </>
  )
}
