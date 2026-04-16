import DataGrid, {
  Column,
  ColumnChooser,
  Export,
  FilterRow,
  HeaderFilter,
  Pager,
  Paging,
  SearchPanel,
} from 'devextreme-react/data-grid'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import type { PortalGridPageConfig } from '@/components/grid/portalGridTypes'
import './PortalGridPage.css'

const DEFAULT_PAGE_SIZES = [5, 10, 20] as const

/**
 * Single implementation for all “main” list pages (DataGrid).
 * - Tweak **shared** grid options (export, toolbar, paging, etc.) here only.
 * - Per-route data/columns live in config objects (e.g. `gridPageConfigs.ts`).
 */
export function PortalGridPage<TRow extends Record<string, unknown>>({
  config,
  dataSource: dataSourceProp,
  onRowClick,
}: {
  config: PortalGridPageConfig<TRow>
  /** When set, overrides `config.dataSource` (e.g. live snapshot from the data layer). */
  dataSource?: TRow[]
  onRowClick?: (e: RowClickEvent<TRow, string | number>) => void
}) {
  const { keyExpr, columns } = config
  const dataSource = dataSourceProp ?? config.dataSource ?? []

  return (
    <div className="portal-grid-page-shell">
      <DataGrid
        className="portal-grid"
        dataSource={dataSource}
        keyExpr={keyExpr}
        showBorders
        rowAlternationEnabled
        allowColumnReordering
        columnAutoWidth
        onRowClick={onRowClick}
      >
        <SearchPanel visible highlightCaseSensitive={false} />
        <HeaderFilter visible />
        <FilterRow visible applyFilter="auto" />
        <Export enabled formats={['xlsx', 'pdf']} />
        <Paging defaultPageSize={10} />
        <Pager
          showPageSizeSelector
          allowedPageSizes={[...DEFAULT_PAGE_SIZES]}
          showNavigationButtons
        />
        <ColumnChooser enabled mode="select" />
        {columns.map((col) => (
          <Column
            key={col.dataField}
            dataField={col.dataField}
            caption={col.caption}
            width={col.width}
            minWidth={col.minWidth}
            dataType={col.dataType}
            format={col.format}
          />
        ))}
      </DataGrid>
    </div>
  )
}
