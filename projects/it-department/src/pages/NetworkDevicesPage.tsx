import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { networkDevicesGridConfig } from '@/pages/gridPageConfigs.iter1'
import { useMockStore } from '@/mocks/mockStore'

export function NetworkDevicesPage() {
  const { networkDevices } = useMockStore()

  return <PortalGridPage config={networkDevicesGridConfig} dataSource={networkDevices} />
}
