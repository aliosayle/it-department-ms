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
