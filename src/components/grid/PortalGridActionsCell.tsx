import { Link } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { confirm } from 'devextreme/ui/dialog'
import notify from 'devextreme/ui/notify'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'

type Props<TRow extends Record<string, unknown>> = {
  row: TRow
  actions: PortalGridRowActions<TRow>
}

export function PortalGridActionsCell<TRow extends Record<string, unknown>>({ row, actions }: Props<TRow>) {
  const viewHref = actions.getViewHref?.(row) ?? null
  const editHref = actions.getEditHref?.(row) ?? null

  const showView = actions.canView && (viewHref != null || actions.onView != null)
  const showEdit = actions.canEdit && (editHref != null || actions.onEdit != null)
  const showDelete = actions.canDelete

  const runDelete = async () => {
    if (!actions.onDelete) {
      notify({ message: 'Delete is not available for this list yet.', type: 'info', displayTime: 2600 })
      return
    }
    const ok = await confirm('Delete this record? This cannot be undone.', 'Confirm delete')
    if (!ok) return
    try {
      await actions.onDelete(row)
      notify({ message: 'Deleted.', type: 'success', displayTime: 2000 })
    } catch (e) {
      notify({
        message: e instanceof Error ? e.message : 'Delete failed.',
        type: 'error',
        displayTime: 4000,
      })
    }
  }

  return (
    <div className="portal-grid-actions" role="group" aria-label="Row actions">
      {showView ? (
        viewHref != null ? (
          <Link to={viewHref} className="portal-grid-actions__link">
            <Button icon="find" stylingMode="contained" type="default" hint="View" />
          </Link>
        ) : (
          <Button
            icon="find"
            stylingMode="contained"
            type="default"
            hint="View"
            onClick={() => actions.onView?.(row)}
          />
        )
      ) : null}
      {showEdit ? (
        editHref != null ? (
          <Link to={editHref} className="portal-grid-actions__link">
            <Button icon="edit" stylingMode="outlined" type="normal" hint="Edit" />
          </Link>
        ) : (
          <Button icon="edit" stylingMode="outlined" type="normal" hint="Edit" onClick={() => actions.onEdit?.(row)} />
        )
      ) : null}
      {showDelete ? (
        <Button
          icon="trash"
          stylingMode="outlined"
          type="danger"
          hint={actions.onDelete ? 'Delete' : 'Delete (not configured)'}
          disabled={!actions.onDelete}
          onClick={() => void runDelete()}
        />
      ) : null}
    </div>
  )
}
