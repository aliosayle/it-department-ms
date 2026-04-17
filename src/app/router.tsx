import { Route, Routes } from 'react-router-dom'
import { PageGuard } from '@/auth/PageGuard'
import { RequireAuth } from '@/auth/RequireAuth'
import { WaitForSession } from '@/auth/WaitForSession'
import { AppShell } from '@/layout/AppShell'
import { AssetEditPage } from '@/pages/AssetEditPage'
import { AssetsPage } from '@/pages/AssetsPage'
import { CompaniesListPage } from '@/pages/CompaniesListPage'
import { CompanyEditPage } from '@/pages/CompanyEditPage'
import { CompanyNewPage } from '@/pages/CompanyNewPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AssignmentListPage } from '@/pages/AssignmentListPage'
import { AssignmentNewPage } from '@/pages/AssignmentNewPage'
import { NetworkDeviceEditPage } from '@/pages/NetworkDeviceEditPage'
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
import { ProductNewPage } from '@/pages/ProductNewPage'
import { ProductsListPage } from '@/pages/ProductsListPage'
import { PurchaseDetailPage } from '@/pages/PurchaseDetailPage'
import { PurchaseNewPage } from '@/pages/PurchaseNewPage'
import { PurchasesListPage } from '@/pages/PurchasesListPage'
import { ServiceDeskPage } from '@/pages/ServiceDeskPage'
import { ServiceDeskTicketEditPage } from '@/pages/ServiceDeskTicketEditPage'
import { SiteEditPage } from '@/pages/SiteEditPage'
import { SiteNewPage } from '@/pages/SiteNewPage'
import { SitesListPage } from '@/pages/SitesListPage'
import { SupplierEditPage } from '@/pages/SupplierEditPage'
import { SupplierNewPage } from '@/pages/SupplierNewPage'
import { SuppliersListPage } from '@/pages/SuppliersListPage'
import { StockListPage } from '@/pages/StockListPage'
import { StockReceivePage } from '@/pages/StockReceivePage'
import { StockTransferPage } from '@/pages/StockTransferPage'
import { StorageUnitDetailPage } from '@/pages/StorageUnitDetailPage'
import { StorageUnitNewPage } from '@/pages/StorageUnitNewPage'
import { StorageUnitsListPage } from '@/pages/StorageUnitsListPage'
import { UserEquipmentDetailPage } from '@/pages/UserEquipmentDetailPage'
import { UserEquipmentListPage } from '@/pages/UserEquipmentListPage'
import { UserPermissionsPage } from '@/pages/UserPermissionsPage'
import { UserNewPage } from '@/pages/UserNewPage'
import { UsersListPage } from '@/pages/UsersListPage'
import { LoginPage } from '@/pages/LoginPage'
import { RolesPage } from '@/pages/RolesPage'
import { UserAccessPage } from '@/pages/UserAccessPage'
import { TaskReviewPage } from '@/pages/TaskReviewPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<WaitForSession />}>
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
          path="service-desk/:ticketId/edit"
          element={
            <PageGuard page="serviceDesk" require="edit">
              <ServiceDeskTicketEditPage />
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
          path="assets/:assetId/edit"
          element={
            <PageGuard page="assets" require="edit">
              <AssetEditPage />
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
          path="stock/storage-units/new"
          element={
            <PageGuard page="storageUnits" require="create">
              <StorageUnitNewPage />
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
          path="assignments"
          element={
            <PageGuard page="assignment">
              <AssignmentListPage />
            </PageGuard>
          }
        />
        <Route
          path="assignments/new"
          element={
            <PageGuard page="assignment">
              <AssignmentNewPage />
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
          path="products/new"
          element={
            <PageGuard page="products" require="create">
              <ProductNewPage />
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
          path="master-data/suppliers/:supplierId/edit"
          element={
            <PageGuard page="suppliers" require="edit">
              <SupplierEditPage />
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
          path="master-data/companies/:companyId/edit"
          element={
            <PageGuard page="companies" require="edit">
              <CompanyEditPage />
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
          path="master-data/sites/:siteId/edit"
          element={
            <PageGuard page="sites" require="edit">
              <SiteEditPage />
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
          path="inventory/network/:deviceId/edit"
          element={
            <PageGuard page="network" require="edit">
              <NetworkDeviceEditPage />
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
          path="admin/users/new"
          element={
            <PageGuard page="users" require="create">
              <UserNewPage />
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
        <Route
          path="admin/users/:userId/access"
          element={
            <PageGuard page="users">
              <UserAccessPage />
            </PageGuard>
          }
        />
        <Route
          path="admin/roles"
          element={
            <PageGuard page="users">
              <RolesPage />
            </PageGuard>
          }
        />
        <Route
          path="assignments/review"
          element={
            <PageGuard page="assignment">
              <TaskReviewPage />
            </PageGuard>
          }
        />
        <Route path="access-denied" element={<AccessDeniedPage />} />
        <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
