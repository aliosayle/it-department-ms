import { matchPath } from 'react-router-dom'

export type PageMeta = { title: string; subtitle?: string }

const staticTitles: Record<string, PageMeta> = {
  '/': { title: 'Dashboard', subtitle: 'Operations snapshot' },
  '/service-desk': { title: 'Service desk', subtitle: 'Request and incident queue' },
  '/assets': { title: 'Asset register', subtitle: 'Configuration items' },
  '/stock': { title: 'Stock', subtitle: 'Totals by product across all storages' },
  '/stock/receive': { title: 'Receive stock', subtitle: 'Inbound to storage' },
  '/stock/transfer': { title: 'Transfer stock', subtitle: 'Between storage units' },
  '/stock/storage-units': { title: 'Storage units', subtitle: 'Bins, shelves, custody' },
  '/stock/storage-units/new': { title: 'New storage unit', subtitle: 'Site bin or custody holder' },
  '/admin/users': { title: 'Users', subtitle: 'Access profiles by application area' },
  '/admin/users/new': { title: 'New portal user', subtitle: 'Login and initial deny-all access' },
  '/admin/roles': { title: 'Roles', subtitle: 'Role-based permission templates' },
  '/assignments/review': { title: 'Task review', subtitle: 'Assignment review workflow and uploads' },
  '/assignments': { title: 'Assignments', subtitle: 'Issue stock or assets to personnel' },
  '/assignments/new': { title: 'New assignment', subtitle: 'Assign from stock or external receipt' },
  '/purchases': { title: 'Purchases', subtitle: 'Bons and inbound orders' },
  '/purchases/new': { title: 'New purchase', subtitle: 'Bon, supplier, lines' },
  '/master-data/suppliers': { title: 'Suppliers', subtitle: 'Vendor master data' },
  '/master-data/suppliers/new': { title: 'New supplier', subtitle: 'Vendor record' },
  '/products': { title: 'Products', subtitle: 'Catalog' },
  '/products/new': { title: 'New product', subtitle: 'SKU and description' },
  '/master-data/companies': { title: 'Companies', subtitle: 'Master data' },
  '/master-data/companies/new': { title: 'New company', subtitle: 'Master data' },
  '/master-data/sites': { title: 'Sites', subtitle: 'Master data' },
  '/master-data/sites/new': { title: 'New site', subtitle: 'Master data' },
  '/master-data/personnel': { title: 'Personnel', subtitle: 'Master data' },
  '/master-data/personnel/new': { title: 'New personnel', subtitle: 'Master data' },
  '/inventory/equipment': { title: 'User equipment', subtitle: 'Assigned devices' },
  '/inventory/network': { title: 'Network devices', subtitle: 'Infrastructure inventory' },
}

/** More specific paths first. */
const patternTitles: { pattern: string; meta: PageMeta }[] = [
  {
    pattern: '/products/:productId/reports',
    meta: { title: 'Product reports', subtitle: 'Summary metrics' },
  },
  {
    pattern: '/products/:productId/history',
    meta: { title: 'Product history', subtitle: 'Movement statement' },
  },
  {
    pattern: '/products/:productId/stock',
    meta: { title: 'Product stock', subtitle: 'Positions' },
  },
  {
    pattern: '/products/:productId/storage',
    meta: { title: 'Product storage', subtitle: 'Storage units' },
  },
  {
    pattern: '/products/:productId/purchases',
    meta: { title: 'Product purchases', subtitle: 'Bons including this SKU' },
  },
  {
    pattern: '/inventory/equipment/:id',
    meta: { title: 'Equipment detail', subtitle: 'Identity card' },
  },
  {
    pattern: '/products/:productId',
    meta: { title: 'Product', subtitle: 'Reports and inventory' },
  },
  {
    pattern: '/stock/storage-units/:storageUnitId',
    meta: { title: 'Storage unit', subtitle: 'Stock in this unit' },
  },
  {
    pattern: '/admin/users/:userId/access',
    meta: { title: 'User access', subtitle: 'Role mapping and overrides' },
  },
  {
    pattern: '/admin/users/:userId',
    meta: { title: 'User permissions', subtitle: 'Page-level access' },
  },
  {
    pattern: '/purchases/:purchaseId',
    meta: { title: 'Purchase detail', subtitle: 'Bon, supplier, receive into stock' },
  },
  {
    pattern: '/service-desk/:ticketId/edit',
    meta: { title: 'Edit ticket', subtitle: 'Service desk' },
  },
  {
    pattern: '/assets/:assetId/edit',
    meta: { title: 'Edit asset', subtitle: 'Asset register' },
  },
  {
    pattern: '/master-data/companies/:companyId/edit',
    meta: { title: 'Edit company', subtitle: 'Master data' },
  },
  {
    pattern: '/master-data/sites/:siteId/edit',
    meta: { title: 'Edit site', subtitle: 'Master data' },
  },
  {
    pattern: '/master-data/suppliers/:supplierId/edit',
    meta: { title: 'Edit supplier', subtitle: 'Master data' },
  },
  {
    pattern: '/inventory/network/:deviceId/edit',
    meta: { title: 'Edit network device', subtitle: 'Infrastructure inventory' },
  },
]

const notFoundMeta: PageMeta = {
  title: 'Not found',
  subtitle: 'The requested page is unavailable',
}

export function getPageMeta(pathname: string): PageMeta {
  const exact = staticTitles[pathname]
  if (exact) return exact
  for (const r of patternTitles) {
    if (matchPath({ path: r.pattern, end: true }, pathname)) return r.meta
  }
  return notFoundMeta
}
