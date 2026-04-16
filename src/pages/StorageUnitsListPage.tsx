import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { storageUnitListGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import { useCan } from '@/auth/AuthContext'
import { buildStorageUnitListRows, useMockStore } from '@/mocks/mockStore'
import type { StorageUnitListRow } from '@/mocks/mockStore'

export function StorageUnitsListPage() {
  useMockStore()
  const navigate = useNavigate()
  const perm = useCan('storageUnits')
  const rows = buildStorageUnitListRows()

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

  return (
    <>
      <div className="list-toolbar">
        <p className="form-page__hint" style={{ margin: 0 }}>
          Bins and shelves belong to a site; <strong>custody</strong> rows are tied to one person for deliveries from
          stock.
        </p>
        {perm.create ? (
          <Link to="/stock/storage-units/new">
            <Button text="New storage unit" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      <PortalGridPage
        config={storageUnitListGridConfig}
        dataSource={rows}
        onRowClick={onRowClick}
        rowActions={rowActions}
      />
    </>
  )
}
