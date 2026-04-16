/** Column definitions for {@link PortalGridPage} — keep pages as data only. */
export type PortalGridColumn = {
  dataField: string
  caption: string
  width?: number
  minWidth?: number
  dataType?: 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'object'
  format?: string
}

export type PortalGridPageConfig<TRow extends Record<string, unknown>> = {
  /** Omit when passing `dataSource` prop to `PortalGridPage` (live store). */
  dataSource?: TRow[]
  keyExpr: keyof TRow & string
  columns: PortalGridColumn[]
}

/** Optional per-row actions column (View / Edit / Delete) — pass from list pages with RBAC + routes. */
export type PortalGridRowActions<TRow extends Record<string, unknown>> = {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  getViewHref?: (row: TRow) => string | null
  getEditHref?: (row: TRow) => string | null
  onView?: (row: TRow) => void
  onEdit?: (row: TRow) => void
  onDelete?: (row: TRow) => void | Promise<void>
}
