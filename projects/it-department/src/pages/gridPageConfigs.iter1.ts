import type { PortalGridPageConfig } from '@/components/grid/portalGridTypes'
import type { NetworkDevice, UserEquipment } from '@/mocks/domain/types'

const empty = [] as unknown[]

export const userEquipmentGridConfig: PortalGridPageConfig<UserEquipment> = {
  dataSource: empty as UserEquipment[],
  keyExpr: 'id',
  columns: [
    { dataField: 'name', caption: 'Name', minWidth: 140 },
    { dataField: 'department', caption: 'Department', width: 130 },
    { dataField: 'formFactor', caption: 'Form', width: 110 },
    { dataField: 'brand', caption: 'Brand', width: 100 },
  ],
}

export const networkDevicesGridConfig: PortalGridPageConfig<NetworkDevice> = {
  dataSource: empty as NetworkDevice[],
  keyExpr: 'id',
  columns: [
    { dataField: 'type', caption: 'Type', width: 110 },
    { dataField: 'details', caption: 'Details', minWidth: 180 },
    { dataField: 'brand', caption: 'Brand', width: 100 },
    { dataField: 'model', caption: 'Model', minWidth: 120 },
    { dataField: 'serialNumber', caption: 'Serial', minWidth: 130 },
    { dataField: 'location', caption: 'Location', minWidth: 140 },
  ],
}
