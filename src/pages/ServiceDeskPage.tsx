import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { serviceDeskGridPageConfig } from '@/pages/gridPageConfigs'

export function ServiceDeskPage() {
  return <PortalGridPage config={serviceDeskGridPageConfig} />
}
