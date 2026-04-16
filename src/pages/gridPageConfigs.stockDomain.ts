import type { PortalGridPageConfig } from '@/components/grid/portalGridTypes'
import type {
  Company,
  Assignment,
  MovementStatementRow,
  Personnel,
  Product,
  ProductMovement,
  ProductReportRow,
  PurchaseLineDetailRow,
  PurchaseListRow,
  Site,
  StockOverviewRow,
  StockProductSummaryRow,
  Supplier,
} from '@/mocks/domain/types'
import type { ProductStockRow, StorageUnitListRow } from '@/mocks/mockStore'

const empty = [] as unknown[]

export const companiesGridConfig: PortalGridPageConfig<Company> = {
  dataSource: empty as Company[],
  keyExpr: 'id',
  columns: [
    { dataField: 'name', caption: 'Name', minWidth: 180 },
    { dataField: 'notes', caption: 'Notes', minWidth: 200 },
  ],
}

export type SiteRow = Site & { companyName: string }

export const sitesGridConfig: PortalGridPageConfig<SiteRow> = {
  dataSource: empty as SiteRow[],
  keyExpr: 'id',
  columns: [
    { dataField: 'companyName', caption: 'Company', minWidth: 140 },
    { dataField: 'name', caption: 'Site', minWidth: 140 },
    { dataField: 'location', caption: 'Location', minWidth: 160 },
  ],
}

export type PersonnelRow = Personnel & { companyName: string; siteName: string }

export const personnelGridConfig: PortalGridPageConfig<PersonnelRow> = {
  dataSource: empty as PersonnelRow[],
  keyExpr: 'id',
  columns: [
    { dataField: 'fullName', caption: 'Name', minWidth: 140 },
    { dataField: 'email', caption: 'Email', minWidth: 200 },
    { dataField: 'companyName', caption: 'Company', width: 140 },
    { dataField: 'siteName', caption: 'Site', minWidth: 140 },
  ],
}

export const productsGridConfig: PortalGridPageConfig<Product> = {
  dataSource: empty as Product[],
  keyExpr: 'id',
  columns: [
    { dataField: 'reference', caption: 'Reference', width: 140 },
    { dataField: 'sku', caption: 'SKU (opt.)', width: 120 },
    { dataField: 'name', caption: 'Name', minWidth: 200 },
    { dataField: 'trackingMode', caption: 'Tracking', width: 100 },
    { dataField: 'brand', caption: 'Brand', width: 110 },
    { dataField: 'category', caption: 'Category', width: 120 },
  ],
}

export const stockOverviewGridConfig: PortalGridPageConfig<StockOverviewRow> = {
  dataSource: empty as StockOverviewRow[],
  keyExpr: 'id',
  columns: [
    { dataField: 'productSku', caption: 'Ref / SKU', width: 130 },
    { dataField: 'productName', caption: 'Product', minWidth: 160 },
    { dataField: 'storageCode', caption: 'Storage', minWidth: 180 },
    { dataField: 'siteName', caption: 'Site', minWidth: 120 },
    { dataField: 'companyName', caption: 'Company', minWidth: 120 },
    { dataField: 'quantity', caption: 'Qty', width: 80, dataType: 'number' },
    { dataField: 'status', caption: 'Status', width: 100 },
  ],
}

export const stockProductSummaryGridConfig: PortalGridPageConfig<StockProductSummaryRow> = {
  dataSource: empty as StockProductSummaryRow[],
  keyExpr: 'id',
  columns: [
    { dataField: 'productSku', caption: 'Ref / SKU', width: 130 },
    { dataField: 'productName', caption: 'Product', minWidth: 200 },
    { dataField: 'totalQuantity', caption: 'Total qty', width: 100, dataType: 'number' },
  ],
}

export const storageUnitListGridConfig: PortalGridPageConfig<StorageUnitListRow> = {
  dataSource: empty as StorageUnitListRow[],
  keyExpr: 'id',
  columns: [
    { dataField: 'code', caption: 'Code', width: 120 },
    { dataField: 'label', caption: 'Label', minWidth: 180 },
    { dataField: 'kind', caption: 'Kind', width: 100 },
    { dataField: 'holderName', caption: 'Custody holder', minWidth: 140 },
    { dataField: 'siteName', caption: 'Site', minWidth: 120 },
    { dataField: 'companyName', caption: 'Company', minWidth: 120 },
  ],
}

export const movementStatementGridConfig: PortalGridPageConfig<MovementStatementRow> = {
  dataSource: empty as MovementStatementRow[],
  keyExpr: 'id',
  columns: [
    { dataField: 'at', caption: 'When', dataType: 'datetime', format: 'yyyy-MM-dd HH:mm', width: 150 },
    { dataField: 'fromLabel', caption: 'From', minWidth: 160 },
    { dataField: 'toLabel', caption: 'To', minWidth: 160 },
    { dataField: 'delta', caption: 'Delta', width: 70, dataType: 'number' },
    { dataField: 'reason', caption: 'Reason', width: 120 },
    { dataField: 'note', caption: 'Note', minWidth: 140 },
    { dataField: 'refAssignmentId', caption: 'Assignment', width: 110 },
    { dataField: 'refAssetId', caption: 'Asset', width: 100 },
    { dataField: 'refPurchaseId', caption: 'Purchase', width: 120 },
    { dataField: 'correlationId', caption: 'Transfer group', width: 140 },
  ],
}

export const suppliersGridConfig: PortalGridPageConfig<Supplier> = {
  dataSource: empty as Supplier[],
  keyExpr: 'id',
  columns: [
    { dataField: 'name', caption: 'Supplier', minWidth: 160 },
    { dataField: 'contactName', caption: 'Contact', minWidth: 120 },
    { dataField: 'email', caption: 'Email', minWidth: 180 },
    { dataField: 'phone', caption: 'Phone', width: 130 },
    { dataField: 'address', caption: 'Address', minWidth: 160 },
  ],
}

export const purchasesGridConfig: PortalGridPageConfig<PurchaseListRow> = {
  dataSource: empty as PurchaseListRow[],
  keyExpr: 'id',
  columns: [
    { dataField: 'bonNumber', caption: 'Bon', width: 120 },
    { dataField: 'supplierInvoiceRef', caption: 'Supplier ref', width: 110 },
    { dataField: 'supplierName', caption: 'Supplier', minWidth: 140 },
    { dataField: 'issuedByName', caption: 'Issued by', minWidth: 120 },
    { dataField: 'siteName', caption: 'Site', minWidth: 100 },
    { dataField: 'companyName', caption: 'Company', minWidth: 100 },
    { dataField: 'status', caption: 'Status', width: 90 },
    {
      dataField: 'orderedAt',
      caption: 'Ordered',
      dataType: 'date',
      format: 'yyyy-MM-dd',
      width: 110,
    },
    {
      dataField: 'expectedAt',
      caption: 'Expected',
      dataType: 'date',
      format: 'yyyy-MM-dd',
      width: 110,
    },
    {
      dataField: 'receivedAt',
      caption: 'Received',
      dataType: 'date',
      format: 'yyyy-MM-dd',
      width: 110,
    },
    { dataField: 'lineCount', caption: 'Lines', width: 70, dataType: 'number' },
  ],
}

export const purchaseLinesDetailGridConfig: PortalGridPageConfig<PurchaseLineDetailRow> = {
  dataSource: empty as PurchaseLineDetailRow[],
  keyExpr: 'id',
  columns: [
    { dataField: 'productSku', caption: 'Ref / SKU', width: 120 },
    { dataField: 'productName', caption: 'Product', minWidth: 160 },
    { dataField: 'quantity', caption: 'Qty', width: 70, dataType: 'number' },
    { dataField: 'unitPrice', caption: 'Unit price', dataType: 'number', width: 100 },
    { dataField: 'lineTotal', caption: 'Line total', dataType: 'number', width: 100 },
    { dataField: 'storageCode', caption: 'Receive to storage', minWidth: 200 },
    { dataField: 'siteName', caption: 'Storage site', minWidth: 120 },
  ],
}

export const assignmentsGridConfigV2: PortalGridPageConfig<Assignment> = {
  dataSource: empty as Assignment[],
  keyExpr: 'id',
  columns: [
    { dataField: 'source', caption: 'Source', width: 90 },
    { dataField: 'stockPositionId', caption: 'Stock pos.', width: 110 },
    { dataField: 'serializedAssetId', caption: 'Asset', width: 110 },
    { dataField: 'quantity', caption: 'Qty', width: 70, dataType: 'number' },
    {
      dataField: 'itemReceivedDate',
      caption: 'Received',
      dataType: 'date',
      format: 'yyyy-MM-dd',
      width: 110,
    },
    { dataField: 'itemDescription', caption: 'Item', minWidth: 140 },
    { dataField: 'deliveredTo', caption: 'Assigned to', minWidth: 160 },
    { dataField: 'site', caption: 'Site', minWidth: 140 },
    {
      dataField: 'dateDelivered',
      caption: 'Assigned',
      dataType: 'date',
      format: 'yyyy-MM-dd',
      width: 110,
    },
    { dataField: 'description', caption: 'Notes', minWidth: 120 },
  ],
}

export const productMovementGridConfig: PortalGridPageConfig<ProductMovement> = {
  dataSource: empty as ProductMovement[],
  keyExpr: 'id',
  columns: [
    { dataField: 'at', caption: 'When', dataType: 'datetime', format: 'yyyy-MM-dd HH:mm', width: 150 },
    { dataField: 'delta', caption: 'Delta', width: 80, dataType: 'number' },
    { dataField: 'reason', caption: 'Reason', width: 120 },
    { dataField: 'note', caption: 'Note', minWidth: 160 },
    { dataField: 'refAssignmentId', caption: 'Assignment', width: 120 },
    { dataField: 'refAssetId', caption: 'Asset', width: 100 },
  ],
}

export const productReportGridConfig: PortalGridPageConfig<ProductReportRow> = {
  dataSource: empty as ProductReportRow[],
  keyExpr: 'id',
  columns: [
    { dataField: 'period', caption: 'Period', width: 100 },
    { dataField: 'metric', caption: 'Metric', minWidth: 140 },
    { dataField: 'value', caption: 'Value', dataType: 'number', width: 100 },
  ],
}

export const productStockPositionsGridConfig: PortalGridPageConfig<ProductStockRow> = {
  dataSource: empty as ProductStockRow[],
  keyExpr: 'id',
  columns: [
    { dataField: 'storageCode', caption: 'Storage', minWidth: 180 },
    { dataField: 'siteName', caption: 'Site', minWidth: 120 },
    { dataField: 'companyName', caption: 'Company', minWidth: 120 },
    { dataField: 'quantity', caption: 'Qty', dataType: 'number', width: 80 },
    { dataField: 'status', caption: 'Status', width: 100 },
  ],
}

export type StorageUnitDistinctRow = {
  id: string
  code: string
  label: string
  kind: string
  siteName: string
  companyName: string
}

export const storageUnitsForProductGridConfig: PortalGridPageConfig<StorageUnitDistinctRow> = {
  dataSource: empty as StorageUnitDistinctRow[],
  keyExpr: 'id',
  columns: [
    { dataField: 'code', caption: 'Code', width: 120 },
    { dataField: 'label', caption: 'Label', minWidth: 160 },
    { dataField: 'kind', caption: 'Kind', width: 90 },
    { dataField: 'siteName', caption: 'Site', minWidth: 120 },
    { dataField: 'companyName', caption: 'Company', minWidth: 120 },
  ],
}
