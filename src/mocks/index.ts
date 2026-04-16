import assets from './assets.json'
import dashboard from './dashboard.json'
import tickets from './tickets.json'
import type { AssetRow, DashboardMock, Ticket } from './types'

export const dashboardMock = dashboard as DashboardMock
export const ticketsMock = tickets as Ticket[]
export const assetsMock = assets as AssetRow[]
