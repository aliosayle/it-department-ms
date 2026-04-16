export type KpiCard = {
  id: string
  label: string
  value: number
  hint: string
}

export type ActivityItem = {
  id: string
  time: string
  text: string
  type: 'incident' | 'change' | 'request' | 'asset'
}

export type DashboardMock = {
  kpis: KpiCard[]
  recentActivity: ActivityItem[]
}

export type Ticket = {
  id: string
  title: string
  priority: 'P1' | 'P2' | 'P3' | 'P4'
  status: string
  assignee: string
  updatedAt: string
}

export type AssetRow = {
  id: string
  hostname: string
  owner: string
  location: string
  status: 'In use' | 'Stock' | 'Retired' | 'Repair'
}
