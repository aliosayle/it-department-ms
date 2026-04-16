import { Route, Routes } from 'react-router-dom'
import { PageGuard } from '@/auth/PageGuard'
import { AppShell } from '@/layout/AppShell'
import { AssetsPage } from '@/pages/AssetsPage'
import { CompaniesListPage } from '@/pages/CompaniesListPage'
import { CompanyNewPage } from '@/pages/CompanyNewPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DeliveryListPage } from '@/pages/DeliveryListPage'
import { DeliveryNewPage } from '@/pages/DeliveryNewPage'
import { NetworkDevicesPage } from '@/pages/NetworkDevicesPage'
import { AccessDeniedPage } from '@/auth/AccessDeniedPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PersonnelListPage } from '@/pages/PersonnelListPage'
import { PersonnelNewPage } from '@/pages/PersonnelNewPage'
import { ProductHistoryPage } from '@/pages/ProductHistoryPage'
import { ProductLayout } from '@/pages/ProductLayout'
import { ProductPurchasesPage } from '@/pages/ProductPurchasesPage'
import { ProductReportsPage } from '@/pages/ProductReportsPage'
import { ProductStockPage } from '@/pages/ProductStockPage'
import { ProductStoragePage } from '@/pages/ProductStoragePage'
import { ProductTabRedirect } from '@/pages/ProductTabRedirect'
import { ProductsListPage } from '@/pages/ProductsListPage'
import { PurchaseDetailPage } from '@/pages/PurchaseDetailPage'
import { PurchaseNewPage } from '@/pages/PurchaseNewPage'
import { PurchasesListPage } from '@/pages/PurchasesListPage'
import { ServiceDeskPage } from '@/pages/ServiceDeskPage'
import { SiteNewPage } from '@/pages/SiteNewPage'
import { SitesListPage } from '@/pages/SitesListPage'
import { SupplierNewPage } from '@/pages/SupplierNewPage'
import { SuppliersListPage } from '@/pages/SuppliersListPage'
import { StockListPage } from '@/pages/StockListPage'
import { StockReceivePage } from '@/pages/StockReceivePage'
import { StockTransferPage } from '@/pages/StockTransferPage'
import { StorageUnitDetailPage } from '@/pages/StorageUnitDetailPage'
import { StorageUnitsListPage } from '@/pages/StorageUnitsListPage'
import { UserEquipmentDetailPage } from '@/pages/UserEquipmentDetailPage'
import { UserEquipmentListPage } from '@/pages/UserEquipmentListPage'
import { UserPermissionsPage } from '@/pages/UserPermissionsPage'
import { UsersListPage } from '@/pages/UsersListPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <PageGuard page="dashboard">
              <DashboardPage />
            </PageGuard>
          }
        />
        <Route
          path="service-desk"
          element={
            <PageGuard page="serviceDesk">
              <ServiceDeskPage />
            </PageGuard>
          }
        />
        <Route
          path="assets"
          element={
            <PageGuard page="assets">
              <AssetsPage />
            </PageGuard>
          }
        />
        <Route
          path="stock"
          element={
            <PageGuard page="stock">
              <StockListPage />
            </PageGuard>
          }
        />
        <Route
          path="stock/receive"
          element={
            <PageGuard page="stockReceive">
              <StockReceivePage />
            </PageGuard>
          }
        />
        <Route
          path="stock/transfer"
          element={
            <PageGuard page="stockTransfer">
              <StockTransferPage />
            </PageGuard>
          }
        />
        <Route
          path="stock/storage-units"
          element={
            <PageGuard page="storageUnits">
              <StorageUnitsListPage />
            </PageGuard>
          }
        />
        <Route
          path="stock/storage-units/:storageUnitId"
          element={
            <PageGuard page="storageUnits">
              <StorageUnitDetailPage />
            </PageGuard>
          }
        />
        <Route
          path="delivery"
          element={
            <PageGuard page="delivery">
              <DeliveryListPage />
            </PageGuard>
          }
        />
        <Route
          path="delivery/new"
          element={
            <PageGuard page="delivery">
              <DeliveryNewPage />
            </PageGuard>
          }
        />
        <Route
          path="purchases"
          element={
            <PageGuard page="purchases">
              <PurchasesListPage />
            </PageGuard>
          }
        />
        <Route
          path="purchases/new"
          element={
            <PageGuard page="purchases">
              <PurchaseNewPage />
            </PageGuard>
          }
        />
        <Route
          path="purchases/:purchaseId"
          element={
            <PageGuard page="purchases">
              <PurchaseDetailPage />
            </PageGuard>
          }
        />
        <Route
          path="products"
          element={
            <PageGuard page="products">
              <ProductsListPage />
            </PageGuard>
          }
        />
        <Route
          path="products/:productId"
          element={
            <PageGuard page="products">
              <ProductLayout />
            </PageGuard>
          }
        >
          <Route index element={<ProductTabRedirect />} />
          <Route path="reports" element={<ProductReportsPage />} />
          <Route path="history" element={<ProductHistoryPage />} />
          <Route path="stock" element={<ProductStockPage />} />
          <Route path="storage" element={<ProductStoragePage />} />
          <Route path="purchases" element={<ProductPurchasesPage />} />
        </Route>
        <Route
          path="master-data/suppliers"
          element={
            <PageGuard page="suppliers">
              <SuppliersListPage />
            </PageGuard>
          }
        />
        <Route
          path="master-data/suppliers/new"
          element={
            <PageGuard page="suppliers">
              <SupplierNewPage />
            </PageGuard>
          }
        />
        <Route
          path="master-data/companies"
          element={
            <PageGuard page="companies">
              <CompaniesListPage />
            </PageGuard>
          }
        />
        <Route
          path="master-data/companies/new"
          element={
            <PageGuard page="companies">
              <CompanyNewPage />
            </PageGuard>
          }
        />
        <Route
          path="master-data/sites"
          element={
            <PageGuard page="sites">
              <SitesListPage />
            </PageGuard>
          }
        />
        <Route
          path="master-data/sites/new"
          element={
            <PageGuard page="sites">
              <SiteNewPage />
            </PageGuard>
          }
        />
        <Route
          path="master-data/personnel"
          element={
            <PageGuard page="personnel">
              <PersonnelListPage />
            </PageGuard>
          }
        />
        <Route
          path="master-data/personnel/new"
          element={
            <PageGuard page="personnel">
              <PersonnelNewPage />
            </PageGuard>
          }
        />
        <Route
          path="inventory/equipment"
          element={
            <PageGuard page="equipment">
              <UserEquipmentListPage />
            </PageGuard>
          }
        />
        <Route
          path="inventory/equipment/:id"
          element={
            <PageGuard page="equipment">
              <UserEquipmentDetailPage />
            </PageGuard>
          }
        />
        <Route
          path="inventory/network"
          element={
            <PageGuard page="network">
              <NetworkDevicesPage />
            </PageGuard>
          }
        />
        <Route
          path="admin/users"
          element={
            <PageGuard page="users">
              <UsersListPage />
            </PageGuard>
          }
        />
        <Route
          path="admin/users/:userId"
          element={
            <PageGuard page="users">
              <UserPermissionsPage />
            </PageGuard>
          }
        />
        <Route path="access-denied" element={<AccessDeniedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
