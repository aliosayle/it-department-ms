import { useNavigate } from 'react-router-dom'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { userEquipmentGridConfig } from '@/pages/gridPageConfigs.iter1'
import type { UserEquipment } from '@/mocks/domain/types'
import { useMockStore } from '@/mocks/mockStore'
import './formPage.css'

export function UserEquipmentListPage() {
  const navigate = useNavigate()
  const { userEquipment } = useMockStore()

  const onRowClick = (e: RowClickEvent<UserEquipment, string | number>) => {
    const id = e.data?.id
    if (id) navigate(`/inventory/equipment/${String(id)}`)
  }

  return (
    <>
      <p className="form-page__hint" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
        Click a row to open the identity card.
      </p>
      <PortalGridPage
        config={userEquipmentGridConfig}
        dataSource={userEquipment}
        onRowClick={onRowClick}
      />
    </>
  )
}
