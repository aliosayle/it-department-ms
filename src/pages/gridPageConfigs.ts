import type { PortalGridPageConfig } from '@/components/grid/portalGridTypes'
import type { AssetRow, Ticket } from '@/mocks/types'
import { assetsMock, ticketsMock } from '@/mocks'

/** Service desk — edit columns here only. */
export const serviceDeskGridPageConfig: PortalGridPageConfig<Ticket> = {
  dataSource: ticketsMock,
  keyExpr: 'id',
  columns: [
    { dataField: 'id', caption: 'ID', width: 120 },
    { dataField: 'title', caption: 'Title', minWidth: 200 },
    { dataField: 'priority', caption: 'Priority', width: 90 },
    { dataField: 'status', caption: 'Status', width: 140 },
    { dataField: 'assignee', caption: 'Assignee', width: 140 },
    {
      dataField: 'updatedAt',
      caption: 'Updated',
      dataType: 'datetime',
      format: 'yyyy-MM-dd HH:mm',
    },
  ],
}

/** Asset register — edit columns here only. */
export const assetsGridPageConfig: PortalGridPageConfig<AssetRow> = {
  dataSource: assetsMock,
  keyExpr: 'id',
  columns: [
    { dataField: 'id', caption: 'Asset ID', width: 120 },
    { dataField: 'hostname', caption: 'Hostname', minWidth: 220 },
    { dataField: 'owner', caption: 'Owner', minWidth: 160 },
    { dataField: 'location', caption: 'Location', minWidth: 140 },
    { dataField: 'status', caption: 'Status', width: 110 },
  ],
}
