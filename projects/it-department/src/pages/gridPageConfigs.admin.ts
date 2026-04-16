import type { PortalGridPageConfig } from '@/components/grid/portalGridTypes'
import type { PortalUser } from '@/mocks/domain/types'

const empty = [] as unknown[]

export type UserListRow = Pick<PortalUser, 'id' | 'displayName' | 'login'>

export const portalUsersGridConfig: PortalGridPageConfig<UserListRow> = {
  dataSource: empty as UserListRow[],
  keyExpr: 'id',
  columns: [
    { dataField: 'login', caption: 'Login', width: 120 },
    { dataField: 'displayName', caption: 'Display name', minWidth: 180 },
  ],
}
